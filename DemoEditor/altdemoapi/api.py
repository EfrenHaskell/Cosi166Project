"""

"""

__authors__ = ""

import ai_utils
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import subprocess
import re
from session import Session
import uuid

api = FastAPI()
# add CORS handling to deal with restricted transaction origin
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])

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

# Separate sessions for problems and student answers
problem_session = Session()




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
    prompt = new_prompt["prompt"]
    question_id = str(uuid.uuid4())
    
    # Store question with ID
    questions[question_id] = {
        "prompt": prompt,
        "answers": []
    }
    
    print(f"Created new question with ID: {question_id}")
    print(f"Question prompt: {prompt}")
    print(f"Total questions in system: {len(questions)}")
    
    # Also queue for students to fetch
    problem_session.queue_prompt(prompt)
    
    return {"status": "received", "question_id": question_id}


@api.get("/api/getProblem")
def get_problem():
    """
    Route for sending practice problem to front end
    On student front-end requesting prompt
    Returns both prompt and question_id so students can submit answers with the correct ID
    :return:
    """
    if problem_session.has_prompt():
        curr_prompt = problem_session.pop_prompt()
        
        # Find the question_id that matches this prompt
        question_id = None
        normalized_prompt = curr_prompt.strip()
        
        for qid, q_data in questions.items():
            normalized_stored = q_data["prompt"].strip()
            # Match by exact or normalized comparison
            if q_data["prompt"] == curr_prompt or normalized_stored == normalized_prompt:
                question_id = qid
                print(f"✓ Found question_id {question_id} for prompt: '{curr_prompt[:50]}...'")
                break
        
        if question_id:
            return {
                "status": "queue has element", 
                "prompt": curr_prompt,
                "question_id": question_id
            }
        else:
            # If we can't find the question_id, still return the prompt but log a warning
            print(f"⚠ WARNING: Could not find question_id for prompt: '{curr_prompt[:50]}...'")
            print(f"⚠ Available questions: {list(questions.keys())}")
            return {
                "status": "queue has element", 
                "prompt": curr_prompt,
                "question_id": None
            }
    else:
        return {"status": "queue empty"}


@api.post('/api/studentAnswers')
def create_student_answers(code: dict):
    """
    Route for sending student answers of question
    to the backend from the front end
    Now accepts question_id directly (preferred) or falls back to prompt matching
    :param code:
    :return:
    """

    #make student code id associate with the encyrpted email
    try:
        # Extract the code, prompt, and question_id from the nested structure
        if 'studentAnswers' not in code:
            print("ERROR: Missing 'studentAnswers' key in request")
            return {'status': 'error', 'message': 'Invalid request format: missing studentAnswers'}
        
        student_code = code['studentAnswers'].get('code', '')
        prompt = code['studentAnswers'].get('prompt', '')
        question_id = code['studentAnswers'].get('question_id', None)  # New: accept question_id directly
        
        if not student_code:
            print("ERROR: No student code provided")
            return {'status': 'error', 'message': 'No code provided'}
        
        print(f"=== POST /api/studentAnswers ===")
        print(f"Received student answer")
        print(f"Question ID: {question_id}")
        print(f"Prompt: '{prompt}'")
        print(f"Code length: {len(student_code)}")
        print(f"Current questions in system: {len(questions)}")
        
        # If question_id is provided, use it directly (preferred method)
        if question_id and question_id in questions:
            questions[question_id]["answers"].append(student_code)
            answer_count = len(questions[question_id]["answers"])
            print(f"✓ Added answer to question {question_id} (using provided ID)")
            print(f"✓ Total answers for this question: {answer_count}")
            return {
                'status': 'received', 
                'question_id': question_id, 
                'answer_count': answer_count,
                'message': 'Answer submitted successfully'
            }
        
        # Fallback: If question_id not found or not provided, try prompt matching
        if prompt and (not question_id or question_id not in questions):
            if question_id and question_id not in questions:
                print(f"⚠ Question ID '{question_id}' not found, attempting prompt matching...")
                question_id = None  # Reset to None so we can find the correct one
            else:
                print("⚠ No question_id provided, attempting prompt matching...")
            normalized_prompt = prompt.strip()
            found_question_id = None
            
            for qid, q_data in questions.items():
                normalized_stored = q_data["prompt"].strip()
                # Exact match first, then try normalized comparison
                if q_data["prompt"] == prompt or normalized_stored == normalized_prompt:
                    found_question_id = qid
                    print(f"✓ Found matching question with ID: {found_question_id} (via prompt matching)")
                    break
            
            if found_question_id:
                question_id = found_question_id
            
            if question_id:
                questions[question_id]["answers"].append(student_code)
                answer_count = len(questions[question_id]["answers"])
                print(f"✓ Added answer to question {question_id}")
                print(f"✓ Total answers for this question: {answer_count}")
                return {
                    'status': 'received', 
                    'question_id': question_id, 
                    'answer_count': answer_count,
                    'message': 'Answer submitted successfully'
                }
        
        # If still no match found, return error
        print(f"✗ ERROR: Could not find question")
        if question_id:
            print(f"  - Question ID '{question_id}' not found in questions dictionary")
        if prompt:
            print(f"  - No matching question found for prompt: '{prompt}'")
        print(f"Available question IDs: {list(questions.keys())}")
        return {
            'status': 'error', 
            'message': f'No matching question found. Make sure the question exists.'
        }
    except Exception as e:
        print(f"✗ EXCEPTION in create_student_answers: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'status': 'error', 'message': f'Server error: {str(e)}'}


@api.get('/api/getStudentAnswers')
def get_student_answers():
    """
    Route to retrieve all questions and their student answers
    to be displayed for the teacher
    :return:
    """
    # Return all questions with their answers (sorted by creation order - newest first)
    questions_data = []
    for question_id, question_data in questions.items():
        answer_list = question_data["answers"]
        questions_data.append({
            "question_id": question_id,
            "prompt": question_data["prompt"],
            "answers": answer_list.copy() if isinstance(answer_list, list) else [],  # Return a copy to avoid reference issues
            "answer_count": len(answer_list) if isinstance(answer_list, list) else 0
        })
    
    print(f"=== GET /api/getStudentAnswers ===")
    print(f"Total questions in backend: {len(questions)}")
    print(f"Returning {len(questions_data)} questions with answers")
    for q in questions_data:
        print(f"  Question ID: {q['question_id'][:8]}...")
        print(f"    Prompt: {q['prompt'][:50]}...")
        print(f"    Answers: {q['answer_count']} answers")
        if q['answer_count'] > 0:
            for i, ans in enumerate(q['answers'][:3]):  # Show first 3 answers
                print(f"      Answer {i+1}: {str(ans)[:50]}...")
    
    return {'status': 'success', 'questions': questions_data}

@api.get('/api/getStudentAnswers/{question_id}')
def get_student_answers_by_question(question_id: str):
    """
    Route to retrieve student answers for a specific question
    :param question_id:
    :return:
    """
    if question_id in questions:
        return {
            'status': 'success',
            'question_id': question_id,
            'prompt': questions[question_id]["prompt"],
            'answers': questions[question_id]["answers"]
        }
    else:
        return {'status': 'error', 'message': 'Question not found'}

@api.delete('/api/deleteQuestion/{question_id}')
def delete_question(question_id: str):
    """
    Route to delete a question and all its answers
    :param question_id:
    :return:
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
                content={'status': 'success', 'message': 'Question deleted successfully'}
            )
        else:
            # Try to find by stripped comparison as fallback
            found_id = None
            for qid in questions.keys():
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
                    content={'status': 'success', 'message': 'Question deleted successfully'}
                )
            else:
                # Question doesn't exist - return success anyway (idempotent delete)
                # This handles the case where server restarted and lost state, but frontend still has the question
                print(f"⚠ Question ID '{question_id}' not found in questions dictionary")
                print(f"⚠ Returning success anyway (idempotent delete - question already removed or never existed)")
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content={'status': 'success', 'message': 'Question deleted successfully (was not found in system)'}
                )
    except Exception as e:
        print(f"✗ EXCEPTION in delete_question: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'status': 'error', 'message': f'Server error: {str(e)}'}
        )


