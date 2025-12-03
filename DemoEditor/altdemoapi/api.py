"""
API module for DemoEditor
"""

__authors__ = ""

import re
import json
import uuid
import subprocess
from typing import Dict, Optional

import ai_utils
from fastapi import FastAPI, HTTPException, status, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from session import Session
from redis_client import init_redis, close_redis


# --- Authentication helper models and dependency ---
class UserResponse(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class RoleUpdateRequest(BaseModel):
    role: str


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> Dict:
    """Resolve current user from available auth services or headers.
    Tries in order:
      - `oauth_service.get_current_user(request)` if available
      - `user_service.get_user_from_token(token)` if available
      - Headers `X-User-Id`, `X-User-Name`, `X-User-Email`, `X-User-Role`
    Raises 401 if no user info could be found.
    """
    # Try oauth_service if it provides a resolver
    try:
        if oauth_service and hasattr(oauth_service, "get_current_user"):
            user = await oauth_service.get_current_user(request)
            if user:
                return user
    except Exception:
        pass

    # Try token-based lookup via user_service
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    try:
        if token and user_service and hasattr(user_service, "get_user_from_token"):
            user = await user_service.get_user_from_token(token)
            if user:
                return user
    except Exception:
        pass

    # Fallback to headers set by a reverse proxy or dev environment
    headers = request.headers
    user_id = headers.get("x-user-id") or headers.get("x_user_id")
    if user_id:
        return {
            "user_id": user_id,
            "name": headers.get("x-user-name") or headers.get("x_user_name"),
            "email": headers.get("x-user-email") or headers.get("x_user_email"),
            "role": headers.get("x-user-role") or headers.get("x_user_role"),
        }

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


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
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

curr_session = Session()
# Lazy initialization of agent - only create when needed
new_agent = None


def get_agent():
    """Lazy initialization of AI agent"""
    global new_agent
    if new_agent is None:
        new_agent = ai_utils.Agent()
    return new_agent


# Dictionary to store questions with their IDs
questions = {}  # {question_id: {"prompt": str, "answers": [str]}}

# In-memory storage for class sections (fallback when DB isn't configured)
classes = {}  # {class_id: {"name": str, "section": str, "description": str}}

# Separate sessions for problems and student answers
problem_session = Session()
# in-memory fallback for student answers when Redis isn't available
student_answer_session = Session()


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
    """
    result = subprocess.run(f"python {py_file}", capture_output=True, text=True)
    return result.stdout, result.stderr


@api.put("/api/submitCode")
def submit_code(code: dict):
    """
    Route for code submission and execution
    Server gets code sample from front-end and returns output and error details
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
                problem = problem_session.peek_prompt()  # you implement this
                return {
                    "status": "queue has element",
                    "prompt": problem["prompt"],
                    "duration": problem.get("duration"),
                }
            else:
                return {"status": "queue empty"}
            
    except Exception as e:
        print(f"Redis read failed, falling back to in-memory queue: {e}")
        if problem_session.has_prompt():
            problem = problem_session.peek_prompt()
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
    """
    # Accept optional duration and create a question id so frontend can track it
    prompt = new_prompt.get("prompt") if isinstance(new_prompt, dict) else None
    duration: Optional[int] = None
    if isinstance(new_prompt, dict):
        duration = new_prompt.get("duration")

    if not prompt:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"status": "error", "message": "missing 'prompt'"},
        )

    question_id = str(uuid.uuid4())
    questions[question_id] = {"prompt": prompt, "answers": []}

    problem_data = {"prompt": prompt, "duration": duration, "question_id": question_id}

    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            await redis_client.rpush("problems", json.dumps(problem_data))
        else:
            problem_session.queue_prompt(problem_data)
    except Exception as e:
        print(f"Redis write failed, falling back to in-memory queue: {e}")
        problem_session.queue_prompt(problem_data)

    return {"status": "received", "question_id": question_id}


@api.get("/api/getProblem")
async def get_problem():
    """
    Route for sending practice problem to front end
    On student front-end requesting prompt
    Returns both prompt and question_id so students can submit answers with the correct ID
    """
    redis_client = getattr(api.state, "redis", None)

    # Helper to find a matching question_id for a prompt
    def find_question_id_for_prompt(curr_prompt: str):
        if curr_prompt is None:
            return None
        normalized_prompt = curr_prompt.strip()
        for qid, q_data in questions.items():
            stored = q_data.get("prompt") if isinstance(q_data, dict) else q_data
            if stored == curr_prompt or (isinstance(stored, str) and stored.strip() == normalized_prompt):
                return qid
        return None

    try:
        if redis_client is not None:
            item = await redis_client.lpop("problems")
            if item is None:
                return {"status": "queue empty"}

            if isinstance(item, (bytes, bytearray)):
                try:
                    item = item.decode("utf-8")
                except Exception:
                    item = str(item)

            prompt = None
            duration = None
            question_id = None
            try:
                parsed = json.loads(item)
                if isinstance(parsed, dict):
                    prompt = parsed.get("prompt")
                    duration = parsed.get("duration")
                    question_id = parsed.get("question_id")
                else:
                    prompt = str(parsed)
            except Exception:
                prompt = str(item)

            if question_id is None:
                question_id = find_question_id_for_prompt(prompt)

            return {"status": "queue has element", "prompt": prompt, "duration": duration, "question_id": question_id}

        # fallback to in-memory
        if problem_session.has_prompt():
            curr = problem_session.pop_prompt()
            prompt = None
            duration = None
            question_id = None
            if isinstance(curr, dict):
                prompt = curr.get("prompt")
                duration = curr.get("duration")
                question_id = curr.get("question_id")
            else:
                prompt = str(curr)

            if question_id is None:
                question_id = find_question_id_for_prompt(prompt)

            return {"status": "queue has element", "prompt": prompt, "duration": duration, "question_id": question_id}

        return {"status": "queue empty"}
    except Exception as e:
        print(f"Error retrieving problem (Redis or in-memory): {e}")
        if problem_session.has_prompt():
            curr = problem_session.pop_prompt()
            prompt = curr.get("prompt") if isinstance(curr, dict) else str(curr)
            question_id = find_question_id_for_prompt(prompt)
            return {"status": "queue has element", "prompt": prompt, "question_id": question_id}
        return {"status": "queue empty", "error": str(e)}


@api.post("/api/studentAnswers")
async def create_student_answers(code: dict):
    """
    Route for sending student answers of question to the backend from the front end.
    Accepts either a payload { 'studentAnswers': { 'code': ..., 'question_id': ... } }
    or a flat structure with the fields present.
    Stores the answer in Redis list `student_answers` or in-memory fallback.
    """
    redis_client = getattr(api.state, "redis", None)

    # Normalize incoming payload
    payload = None
    if isinstance(code, dict) and "studentAnswers" in code:
        payload = code.get("studentAnswers")
    else:
        payload = code

    student_code = None
    question_id = None
    if isinstance(payload, dict):
        student_code = payload.get("code") or payload.get("student_code")
        question_id = payload.get("question_id") or payload.get("questionId")
    else:
        student_code = payload

    store_obj = {"code": student_code, "question_id": question_id}

    try:
        if redis_client is not None:
            await redis_client.rpush("student_answers", json.dumps(store_obj))
        else:
            student_answer_session.queue_prompt(store_obj)
        return {"status": "received"}
    except Exception as e:
        print(f"Failed to store student answer in Redis, falling back to memory: {e}")
        student_answer_session.queue_prompt(store_obj)
        return {"status": "received", "fallback": True}


@api.get("/api/getStudentAnswers")
async def get_student_answers():
    """
    Route to retrieve all questions and their student answers to be displayed for the teacher
    """
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            item = await redis_client.lpop("student_answers")
            if item is None:
                return {"status": "answer not found"}
            if isinstance(item, (bytes, bytearray)):
                item = item.decode("utf-8")
            try:
                parsed = json.loads(item)
            except Exception:
                parsed = item
            return {"status": "answers found", "answer": parsed}

        # Fallback to in-memory
        if student_answer_session.has_prompt():
            answer = student_answer_session.pop_prompt()
            return {"status": "answers found", "answer": answer}
        return {"status": "answer not found"}
    except Exception as e:
        print(f"Error retrieving student answers: {e}")
        if student_answer_session.has_prompt():
            answer = student_answer_session.pop_prompt()
            return {"status": "answers found", "answer": answer}
        return {"status": "answer not found", "error": str(e)}


@api.delete("/api/deleteQuestion/{question_id}")
def delete_question(question_id: str):
    """
    Route to delete a question and all its answers
    """
    try:
        # Strip whitespace from question_id to handle any encoding issues
        question_id = question_id.strip()

        print(f"=== DELETE /api/deleteQuestion/{question_id} ===")
        print(f"Requested question_id: '{question_id}'")
        print(f"Question_id type: {type(question_id)}")
        print(f"Question_id length: {len(question_id)}")
        print(f"Total questions in system: {len(questions)}")

        # Debug: Print all question IDs for comparison
        if len(questions) > 0:
            print("Available question IDs:")
            for qid in questions.keys():
                print(f"  - '{qid}' (type: {type(qid)}, length: {len(qid)})")
                print(f"    Match check: {qid == question_id}")
                print(f"    Match check (stripped): {qid.strip() == question_id}")
        else:
            print("No questions in system (dictionary is empty)")

        # Check if question exists (exact match first, then try stripped comparison)
        if question_id in questions:
            deleted_prompt = questions[question_id]["prompt"]
            del questions[question_id]
            print(f"✓ Deleted question {question_id} with prompt: '{deleted_prompt}'")
            print(f"✓ Remaining questions: {len(questions)}")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"status": "success", "message": "Question deleted successfully"},
            )
        else:
            # Try to find by stripped comparison as fallback
            found_id = None
            for qid in list(questions.keys()):
                if qid.strip() == question_id:
                    found_id = qid
                    break

            if found_id:
                deleted_prompt = questions[found_id]["prompt"]
                del questions[found_id]
                print(f"✓ Deleted question {found_id} (matched after stripping) with prompt: '{deleted_prompt}'")
                print(f"✓ Remaining questions: {len(questions)}")
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={"status": "success", "message": "Question deleted successfully"},
                )
            else:
                # Question doesn't exist - return success anyway (idempotent delete)
                print(f"⚠ Question ID '{question_id}' not found in questions dictionary")
                print(f"⚠ Returning success anyway (idempotent delete - question already removed or never existed)")
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={"status": "success", "message": "Question deleted successfully (was not found in system)"},
                )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Authentication failed: {str(e)}"},
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
    current_user: dict = Depends(get_current_user),
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
            detail="Invalid role or update failed",
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
        "user": current_user.get("name"),
        "role": current_user.get("role"),
    }


@api.get("/api/queueStatus")
async def queue_status():
    """
    Non-destructive debug endpoint that reports queue lengths and Redis connection status.
    Returns:
      { redis_connected: bool, problems_len: int, student_answers_len: int, error?: str }
    """
    redis_client = getattr(api.state, "redis", None)
    status_resp = {
        "redis_connected": False,
        "problems_len": None,
        "student_answers_len": None,
    }
    try:
        if redis_client is not None:
            # check connectivity and lengths
            pong = await redis_client.ping()
            status_resp["redis_connected"] = bool(pong)
            status_resp["problems_len"] = await redis_client.llen("problems")
            status_resp["student_answers_len"] = await redis_client.llen("student_answers")
        else:
            # fallback to in-memory session counts
            status_resp["redis_connected"] = False
            status_resp["problems_len"] = len(problem_session.prompts)
            status_resp["student_answers_len"] = len(student_answer_session.prompts)
    except Exception as e:
        # On any error report it and also return in-memory counts if available
        status_resp["error"] = str(e)
        status_resp["redis_connected"] = False
        try:
            status_resp["problems_len"] = len(problem_session.prompts)
            status_resp["student_answers_len"] = len(student_answer_session.prompts)
        except Exception:
            status_resp["problems_len"] = None
            status_resp["student_answers_len"] = None

    return status_resp


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
        classes[class_id] = {"name": name, "section": section or "", "description": description or ""}

        return {"status": "success", "class_id": class_id}
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
