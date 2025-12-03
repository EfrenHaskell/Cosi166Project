"""

"""

__authors__ = ""

import ai_utils
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import subprocess
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
new_agent = ai_utils.Agent()

# Security
security = HTTPBearer()

# Separate sessions for problems and student answers
problem_session = Session()
student_answer_session = Session()


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
    :param new_prompt:
    :return:
    """
    prompt = new_prompt["prompt"]
    duration: Optional[int] = new_prompt.get("duration")  # seconds or None

    # Bundle them into one object
    problem_data = {
        "prompt": prompt,
        "duration": duration,
    }
    
    # Try to write to Redis, fallback to in-memory session if Redis unavailable
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            await redis_client.rpush("problems", json.dumps(problem_data))
        else:
            problem_session.queue_prompt(problem_data)
    except Exception as e:
        print(f"Redis write failed, falling back to in-memory queue: {e}")
        problem_session.queue_prompt(problem_data)

    return {"status": "received"}


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
                problem = problem_session.pop_prompt()
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
            problem = problem_session.pop_prompt()
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
    Route for sending student answers of question
    to the backend from the front end
    :param code:
    :return:
    """
    # Extract the code from the nested structure
    student_code = code['studentAnswers']['code']
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            await redis_client.rpush("student_answers", student_code)
        else:
            student_answer_session.queue_prompt(student_code)
    except Exception as e:
        print(f"Redis write failed for student answer, falling back: {e}")
        student_answer_session.queue_prompt(student_code)

    return {'status': 'received'}


@api.get('/api/getStudentAnswers')
async def get_student_answers():
    """
    Route to retrieve student answers
    to be displayed for the teacher
    :return:
    """
    
    redis_client = getattr(api.state, "redis", None)
    try:
        if redis_client is not None:
            ans = await redis_client.lpop("student_answers")
            if ans is not None:
                return {'status': 'answers found', 'answer': ans}
            return {'status': 'answer not found'}
        else:
            if student_answer_session.has_prompt():
                answer = student_answer_session.pop_prompt()
                return {'status': 'answers found', 'answer' : answer}
            else:
                return {'status': 'answer not found'}
    except Exception as e:
        print(f"Redis read failed for student answers, falling back: {e}")
        if student_answer_session.has_prompt():
            answer = student_answer_session.pop_prompt()
            return {'status': 'answers found', 'answer' : answer}
        else:
            return {'status': 'answer not found'}


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
