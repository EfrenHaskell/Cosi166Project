from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import re

api = FastAPI()
# add CORS handling to deal with restricted transaction origin
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])
prompts = []


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
    Writes raw input to file
    :param code:
    :return:
    """
    print(f"Got input: {code}")
    with open("test.py", "w") as file:
        file.write(_clean_extra_nl(code["code"]))


def run_sub_process(py_file):
    """
    Run resulting python file
    Returns stdout, stderr from execution
    :param py_file:
    :return:
    """
    result = subprocess.run(f"python3 {py_file}", capture_output=True, text=True)
    return result.stdout, result.stderr


@api.put("/api/submitCode")
def submit_code(code: dict):
    """
    Route for code submission and execution
    Server gets code sample from front-end and returns output and error details
    :param code:
    :return:
    """
    raw_to_file(code)
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
    global prompts
    prompts.append(new_prompt["prompt"])
    return {"status": "received"}


@api.get("/api/getProblem")
def get_problem():
    """
    Route for sending practice problem to front end
    On student front-end requesting prompt
    :return:
    """
    global prompts
    if len(prompts) > 0:
        curr_prompt = prompts[-1]
        return {"status": "ok", "prompt": curr_prompt}
    else:
        return {"status": "queue empty"}