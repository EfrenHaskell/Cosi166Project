"""

"""

__authors__ = ""

import ai_utils
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import subprocess
import asyncio
import re
from session import Session
from redis_client import init_redis, close_redis
from pydantic import BaseModel
from typing import Optional
import json

api = FastAPI()
# Initialize Redis on startup and close on shutdown (if available)
@api.on_event("startup")
async def _startup():
    try:
        await init_redis(api)
    except Exception as e:
        # don't crash if redis is not available; fallback to in-memory session
        print(f"Warning: failed to initialize redis: {e}")

@api.on_event("shutdown")
async def _shutdown():
    try:
        await close_redis(api)
    except Exception:
        pass
# add CORS handling to deal with restricted transaction origin
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])

curr_session = Session()
new_agent = None

def get_agent():
    """Lazy initialize AI agent to avoid requiring OPEN_AI_API_KEY at import time."""
    global new_agent
    if new_agent is None:
        try:
            new_agent = ai_utils.Agent()
        except Exception as e:
            print(f"Warning: AI agent initialization failed: {e}")
            new_agent = None
    return new_agent


async def _schedule_end_of_question(question_id: str, duration: int):
    """
    Background task that waits `duration` seconds and then ends the question
    if it is still active. Also runs categorization like `end_session`.
    """
    try:
        # Sleep for the configured duration
        await asyncio.sleep(duration)

        # Only proceed if this question is still active
        if student_answer_session.current_question_id != question_id:
            print(f"Scheduled end: question {question_id} is no longer active, skipping auto-end.")
            return

        print(f"Scheduled end: auto-ending question {question_id} after {duration} seconds")

        # Run categorization similar to /api/endSession
        agent = get_agent()
        if agent is not None:
            try:
                skill_map = {}
                for student_id, (student_code, response_template) in student_answer_session.answers.items():
                    if hasattr(response_template, "skill_section") and hasattr(response_template.skill_section, "internal"):
                        skills_dict = response_template.skill_section.internal
                        skills_list = [f"{skill}: {description}" for skill, description in skills_dict.items()]
                        skill_map[student_id] = ", ".join(skills_list)

                if skill_map:
                    categorized_skills = agent.run_skill_generator(skill_map)
                    print(f"Auto-categorized skills for question {question_id}: {categorized_skills}")
            except Exception as e:
                print(f"Error during auto-categorization for question {question_id}: {e}")

        # Finally end the question session
        student_answer_session.end_question()
        print(f"Question {question_id} ended by scheduler.")

    except Exception as e:
        print(f"Error in scheduled end for question {question_id}: {e}")

# Security
security = HTTPBearer()

# Separate sessions for problems and student answers
problem_session = Session()
student_answer_session = Session()

# In-memory storage for class sections (fallback when DB isn't configured)
classes = {}


# Pydantic models for OAuth
class GoogleTokenRequest(BaseModel):
    token: str


class AuthResponse(BaseModel):
    access_token: str
    user: dict


class UserResponse(BaseModel):
    user_id: int
    email: str
    name: str
    role: str
    picture_url: Optional[str] = None


class RoleUpdateRequest(BaseModel):
    role: str


# Dependency for getting current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        payload = oauth_service.verify_jwt_token(token)
        user = user_service.get_user_by_id(payload["user_id"])
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )


def _clean_extra_nl(lines: str):
    """
    handles new line translation from parsing editorRef
    :param lines:
    :return:
    """
    cleaned = re.sub(r"\r", "", lines)
    print(f"Cleaned string: {cleaned}")
    return cleaned


def raw_to_file(code: dict):
    """
    Writes raw code input to file

    Parameters
    ----------
    code: dict
        Dictionary of form {"code": "..."} containing code to be executed by server
    """
    print(f"Got input: {code}")
    with open("test.py", "w") as file:
        file.write(_clean_extra_nl(code["code"]))


def run_sub_process(py_file) -> tuple:
    """
    Run resulting python file
    Returns stdout, stderr from execution

    Parameters
    ----------

    Returns
    -------

    """
    result = subprocess.run(f"python {py_file}", capture_output=True, text=True)
    return result.stdout, result.stderr


@api.put("/api/submitCode")
def submit_code(code: dict):
    """
    Route for code submission and execution
    Server gets code sample from front-end and returns output and error details
    :param code:
    :return:
    """
    raw_to_file(code["codeSample"])
    out, err = run_sub_process("test.py")
    return {"status": "received", "out": out, "err": err}

@api.get("/api/peekProblem")
async def peek_problem():
    """
    Look at the next problem WITHOUT removing it from the queue.
    """
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            # Look at the first item without popping
            item = await redis_client.lindex("problems", 0)
            if item is not None:
                problem = json.loads(item) 
                return {
                    "status": "queue has element",
                    "prompt": problem["prompt"],
                    "duration": problem.get("duration"),
                }
            return {"status": "queue empty"}
        else:
            if problem_session.has_prompt():
                problem = problem_session.prompt  # you implement this
                return {
                    "status": "queue has element",
                    "prompt": problem["prompt"],
                    "duration": problem.get("duration"),
                }
            else:
                return {"status": "queue empty"}
            
    except Exception:
        # Silently fall back to in-memory (not an error during normal operation)
        if problem_session.has_prompt():
            problem = problem_session.prompt
            return {
                "status": "queue has element",
                "prompt": problem["prompt"],
                "duration": problem.get("duration"),
            }
        else:
            return {"status": "queue empty"}


@api.put("/api/createProblem")
async def create_problem(new_prompt: dict):
    """
    Route for creating new practice problem
    Server gets problem prompt from front-end
    :param new_prompt:
    :return:
    """
    prompt = new_prompt["prompt"]
    duration: Optional[int] = new_prompt.get("duration")  # seconds or None
    expected_students: int = new_prompt.get("expected_students", 0)

    # Generate a question ID
    question_id = 1234
    
    # Bundle them into one object
    problem_data = {
        "question_id": question_id,
        "prompt": prompt,
        "duration": duration,
    }
    
    # Start tracking this question in the session
    student_answer_session.start_question(question_id, duration, expected_students)
    # Set the prompt in student_answer_session so it's available when retrieving answers
    student_answer_session.new_prompt(prompt)
    # If duration provided, schedule a server-side auto-end task
    if duration is not None and duration > 0:
        try:
            asyncio.create_task(_schedule_end_of_question(question_id, duration))
        except Exception as e:
            print(f"Failed to schedule auto-end for question {question_id}: {e}")
    
    # Try to write to Redis, fallback to in-memory session if Redis unavailable
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            await redis_client.rpush("problems", json.dumps(problem_data))
        else:
            problem_session.new_prompt(problem_data)
    except Exception as e:
        print(f"Redis write failed, falling back to in-memory queue: {e}")
        problem_session.new_prompt(problem_data)

    return {"status": "received", "question_id": question_id}


@api.get("/api/getProblem")
async def get_problem():
    """
    Route for sending practice problem to front end
    On student front-end requesting prompt
    :return:
    """
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            item = await redis_client.lpop("problems")
            if item is not None:
                problem = json.loads(item)
                return {
                    "status": "queue has element",
                    "prompt": problem["prompt"],
                    "duration": problem.get("duration"),
                }
            return {"status": "queue empty"}
        else:
            if problem_session.has_prompt():
                problem = problem_session.prompt
                return {
                    "status": "queue has element",
                    "prompt": problem["prompt"],
                    "duration": problem.get("duration"),
                }
            else:
                return {"status": "queue empty"}
    except Exception:
        # Silently fall back to in-memory (not an error during normal operation)
        if problem_session.has_prompt():
            problem = problem_session.prompt
            return {
                "status": "queue has element",
                "prompt": problem["prompt"],
                "duration": problem.get("duration"),
            }
        else:
            return {"status": "queue empty"}


@api.post('/api/studentAnswers')
async def create_student_answers(code: dict):
    """
    Route for sending student answers of question to the backend from the front end
    Now accepts question_id directly (preferred) or falls back to prompt matching
    """
    try:
        print(f"Got input: {code}")
        student = code["studentAnswers"]["studentEmail"]
        student_code = code["studentAnswers"]["code"]
        
        with open(f"{student}_run.py", "w") as file:
            file.write(_clean_extra_nl(student_code))
        
        out, err = run_sub_process(f"{student}_run.py")
        
        # Try to get AI response, but handle gracefully if agent fails
        ai_response = None
        try:
            agent = get_agent()  # Use the safe getter that initializes lazily
            if agent is not None:
                template = agent.run_checker(
                    student_answer_session.prompt,
                    student_code,
                    "python",
                )
                # run_checker returns either a string ("Good Job!") or ResponseTemplate object
                if isinstance(template, str):
                    ai_response = template
                else:
                    ai_response = template.text if hasattr(template, 'text') else str(template)
                student_answer_session.add_answer(student, student_code, template)
            else:
                # If no agent, just store the code
                student_answer_session.add_answer(student, student_code, None)
        except Exception as e:
            print(f"Warning: AI analysis failed ({e}), storing answer without AI feedback")
            student_answer_session.add_answer(student, student_code, None)
        
        return {
            "status": "received",
            "out": out,
            "err": err,
            "ai_response": ai_response or "AI analysis unavailable"
        }
    except Exception as e:
        print(f"Error in create_student_answers: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"status": "error", "message": str(e)}
        )


# @api.get('/api/endSession')
# async def end_session():
#     """
#     Route called when a student session ends (time runs out on the question).
#     Processes student answers from the current session and categorizes skills using AI.
    
#     Returns:
#         {
#             "status": "success",
#             "categorized_skills": {
#                 "category1": ["student1", "student2"],
#                 ...
#             }
#         }
#     """
    


@api.get('/api/questionStatus')
async def get_question_status():
    """
    Get the status of the currently active question.
    Used by the teacher to display timer and see student response count.
    
    Returns:
    {
        "active": bool,
        "question_id": str or None,
        "duration": int or None (seconds),
        "time_remaining": float or None (seconds),
        "responses_received": int,
        "expected_students": int,
        "all_responded": bool
    }
    """
    try:
        status = student_answer_session.get_question_status()
        return status
    except Exception as e:
        print(f"Error getting question status: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


@api.post('/api/endQuestionSession')
async def end_question_session(data: dict = None):
    """
    Manually end the current question session (called by teacher or when all students respond).
    Clears the question and marks it as complete.
    
    Returns:
    {
        "status": "success",
        "message": "Question session ended"
    }
    
    """
    # End the question session (clears metadata but keeps answers for retrieval)
    student_answer_session.end_question()
    
    return {
        "status": "success",
        "message": "Question session ended"
    }

    # try:
    #     # Build skill map from student answers in session
    #     # Format: {"student_email": "skill1, skill2, skill3, ..."}
    #     skill_map = {}
        
    #     for student_id, (student_code, response_template) in student_answer_session.answers.items():
    #         # Extract skills from the response template
    #         if hasattr(response_template, 'skill_section') and hasattr(response_template.skill_section, 'internal'):
    #             # Get all skills for this student
    #             skills_dict = response_template.skill_section.internal
    #             skills_list = [f"{skill}: {description}" for skill, description in skills_dict.items()]
    #             skill_map[student_id] = ",\n".join(skills_list)
    #     print(student_answer_session.answers.items())
    #     if not skill_map:
    #         return {
    #             "status": "success",
    #             "message": "No student answers to process",
    #             "categorized_skills": {}
    #         }
        
    #     # Use the agent's skill generator to categorize skills
    #     try:
    #         categorized_skills = student_answer_session.agent.run_skill_generator(skill_map)
    #     except Exception:
    #         print("Failed categorization")
    #     print(categorized_skills)
    #     student_answer_session.end_question()
    #     return {
    #         "status": "success",
    #         "categorized_skills": categorized_skills,
    #         "total_students": len(skill_map)
    #     }
        
    # except Exception as e:
    #     print(f"Error in end_session: {e}")
    #     return {
    #         "status": "error",
    #         "message": str(e)
    #     }
    

@api.get('/api/getStudentAnswers')
async def get_student_answers():
    """
    Route to retrieve student answers to be displayed for the teacher.
    Returns a list of questions (currently just the active one) and their answers.
    """
    try:
        # 1. Retrieve the answers from the in-memory session
        # session.py's get_answers() returns a list of code strings
        answers = student_answer_session.get_answers()
        
        # 2. Retrieve metadata about the current question
        prompt_text = student_answer_session.prompt
        question_id = student_answer_session.current_question_id or "current_session"
        
        # 3. If there is no active question and no answers, return empty list
        if not prompt_text and not answers:
             return {
                "status": "success",
                "questions": []
            }

        # 4. Construct the data object exactly how the React Frontend expects it
        # The frontend expects an array called "questions"
        question_data = {
            "question_id": question_id,
            "prompt": prompt_text if prompt_text else "No active prompt",
            "answers": answers, # List of strings containing code
            "answer_count": len(answers)
        }

        return {
            "status": "success",
            "questions": [question_data] 
        }

    except Exception as e:
        print(f"Error retrieving student answers: {e}")
        return {
            "status": "error",
            "message": str(e),
            "questions": []
        }

    # # Normalize incoming payload
    # payload = None
    # if isinstance(code, dict) and "studentAnswers" in code:
    #     payload = code.get("studentAnswers")
    # else:
    #     payload = code

    # student_code = None
    # question_id = None
    # if isinstance(payload, dict):
    #     student_code = payload.get("code") or payload.get("student_code")
    #     question_id = payload.get("question_id") or payload.get("questionId")
    # else:
    #     student_code = payload

    # store_obj = {"code": student_code, "question_id": question_id}

    # try:
    #     if redis_client is not None:
    #         await redis_client.rpush("student_answers", json.dumps(store_obj))
    #     else:
    #         student_answer_session.queue_prompt(store_obj)
    #     return {"status": "received"}
    # except Exception as e:
    #     print(f"Failed to store student answer in Redis, falling back to memory: {e}")
    #     student_answer_session.queue_prompt(store_obj)
    #     return {"status": "received", "fallback": True}


# @api.get("/api/getStudentAnswers")
# async def get_student_answers():
#     """
#     Route to retrieve all questions and their student answers to be displayed for the teacher
#     """
#     redis_client = getattr(api.state, "redis", None)
#     try:
#         if redis_client is not None:
#             ans = await redis_client.lpop("student_answers")
#             if ans is not None:
#                 return {'status': 'answers found', 'answer': ans}
#             return {'status': 'answer not found'}
#         else:
#             if student_answer_session.has_prompt():
#                 answer = student_answer_session.prompt
#                 return {'status': 'answers found', 'answer' : answer}
#             else:
#                 return {'status': 'answer not found'}
#     except Exception as e:
#         print(f"Redis read failed for student answers, falling back: {e}")
#         if student_answer_session.has_prompt():
#             answer = student_answer_session.prompt
#             return {'status': 'answers found', 'answer' : answer}
#         else:
#             return {'status': 'answer not found'}


# OAuth Authentication Endpoints

@api.post("/api/auth/google", response_model=AuthResponse)
async def google_auth(request: GoogleTokenRequest):
    """
    Authenticate user with Google OAuth token
    """
    try:
        # Verify Google token
        google_user_info = await oauth_service.verify_google_token(request.token)
        
        # Create or update user in database
        user_info = user_service.create_or_update_user(google_user_info)
        
        # Create JWT token
        jwt_token = oauth_service.create_jwt_token(
            user_info["user_id"],
            user_info["email"],
            user_info["role"]
        )
        
        return AuthResponse(
            access_token=jwt_token,
            user=user_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@api.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return UserResponse(**current_user)


@api.put("/api/auth/role")
async def update_user_role(
    request: RoleUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user role (teacher/student)
    """
    success = user_service.update_user_role(current_user["user_id"], request.role)
    
    if success:
        return {"message": "Role updated successfully", "new_role": request.role}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role or update failed"
        )


@api.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout user (client should remove token)
    """
    return {"message": "Logged out successfully"}


# Protected routes that require authentication

@api.get("/api/protected/test")
async def protected_test(current_user: dict = Depends(get_current_user)):
    """
    Test endpoint for protected routes
    """
    return {
        "message": "This is a protected route",
        "user": current_user["name"],
        "role": current_user["role"]
    }


@api.get("/api/queueStatus")
async def queue_status():
    """
    Non-destructive debug endpoint that reports queue lengths and Redis connection status.
    Returns:
      { redis_connected: bool, problems_len: int, student_answers_len: int, error?: str }
    """
    redis_client = getattr(api.state, "redis", None)
    status = {
        "redis_connected": False,
        "problems_len": None,
        "student_answers_len": None
    }
    try:
        if redis_client is not None:
            # check connectivity and lengths
            pong = await redis_client.ping()
            status["redis_connected"] = bool(pong)
            status["problems_len"] = await redis_client.llen("problems")
            status["student_answers_len"] = await redis_client.llen("student_answers")
        else:
            # fallback to in-memory session counts
            status["redis_connected"] = False
            status["problems_len"] = len(problem_session.prompts)
            status["student_answers_len"] = len(student_answer_session.prompts)
    except Exception as e:
        # On any error report it and also return in-memory counts if available
        status["error"] = str(e)
        status["redis_connected"] = False
        try:
            status["problems_len"] = len(problem_session.prompts)
            status["student_answers_len"] = len(student_answer_session.prompts)
        except Exception:
            status["problems_len"] = None
            status["student_answers_len"] = None

    return status


def _generate_join_code(length=6):
    """Generate a random alphanumeric join code for a class."""
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


@api.get("/api/classes")
async def list_classes():
    """
    Return all class sections.
    """
    try:
        # Convert dict values to list
        all_classes = []
        for cid, data in classes.items():
            entry = {"class_id": cid}
            entry.update(data)
            all_classes.append(entry)
        return {"status": "success", "classes": all_classes}
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"status": "error", "message": str(e)})


@api.post("/api/classes")
async def create_class(payload: dict):
    """
    Create a class section. Expects JSON with at least `name`.
    Returns the generated `class_id`.
    """
    try:
        name = payload.get("name") if isinstance(payload, dict) else None
        section = payload.get("section") if isinstance(payload, dict) else None
        description = payload.get("description") if isinstance(payload, dict) else None

        if not name:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"status": "error", "message": "missing 'name'"})

        class_id = str(uuid.uuid4())
        join_code = _generate_join_code(6)
        classes[class_id] = {
            "class_id": class_id,
            "name": name,
            "section": section or "",
            "description": description or "",
            "join_code": join_code,
        }

        return {"status": "success", "class": classes[class_id]}
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"status": "error", "message": str(e)})


@api.delete("/api/classes/{class_id}")
async def delete_class(class_id: str):
    """
    Delete a class by id (idempotent).
    """
    try:
        cid = class_id.strip()
        if cid in classes:
            del classes[cid]
            return {"status": "success", "message": "Class deleted"}
        else:
            # idempotent - return success even if not found
            return {"status": "success", "message": "Class not found (treated as deleted)"}
    except Exception as e:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"status": "error", "message": str(e)})


@api.post("/api/joinClass")
async def join_class(payload: dict):
    """
    Join a class using join_code; returns class info if valid.
    """
    join_code = payload.get("join_code") if isinstance(payload, dict) else None
    if not join_code:
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"status": "error", "message": "missing 'join_code'"})
    
    for cid, c in classes.items():
        if c.get("join_code") == join_code:
            return {"status": "success", "class": c}
    
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"status": "error", "message": "Invalid join code"})
