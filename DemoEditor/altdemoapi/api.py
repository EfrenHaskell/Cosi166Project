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
from auth import oauth_service, user_service
from pydantic import BaseModel
from typing import Optional

api = FastAPI()
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


@api.put("/api/createProblem")
def create_problem(new_prompt: dict):
    """
    Route for creating new practice problem
    Server gets problem prompt from front-end
    :param new_prompt:
    :return:
    """
    problem_session.queue_prompt(new_prompt["prompt"])
    return {"status": "received"}


@api.get("/api/getProblem")
def get_problem():
    """
    Route for sending practice problem to front end
    On student front-end requesting prompt
    :return:
    """
    if problem_session.has_prompt():
        curr_prompt = problem_session.pop_prompt()
        return {"status": "queue has element", "prompt": curr_prompt}
    else:
        return {"status": "queue empty"}


@api.post('/api/studentAnswers')
def create_student_answers(code: dict):
    """
    Route for sending student answers of question
    to the backend from the front end
    :param code:
    :return:
    """
    # Extract the code from the nested structure
    student_code = code['studentAnswers']['code']
    student_answer_session.queue_prompt(student_code)
    return {'status': 'received'}


@api.get('/api/getStudentAnswers')
def get_student_answers():
    """
    Route to retrieve student answers
    to be displayed for the teacher
    :return:
    """
    
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
