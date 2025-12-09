import ai_utils
import time
from typing import Optional


class Session:
    def __init__(self):
        self.prompt = ""
        self.answers: dict[str, tuple[str, ai_utils.ResponseTemplate]] = {}
        self.agent = ai_utils.Agent()
        self.skills: dict[str, list[str]] = {}
        
        # Track active question metadata
        self.current_question_id: Optional[str] = None
        self.current_duration: Optional[int] = None  # in seconds
        self.start_time: Optional[float] = None  # unix timestamp
        self.expected_student_count: int = 0
        
    def new_prompt(self, prompt: str):
        self.prompt = prompt

    def has_prompt(self) -> bool:
        return self.prompt != ""

    def add_answer(self, user_id: str, answer, ai_response: ai_utils.ResponseTemplate):
        self.answers[user_id] = answer, ai_response
    
    def start_question(self, question_id: str, duration: Optional[int], expected_students: int = 0):
        """
        Mark a question as active and start the timer
        
        Parameters:
        -----------
        question_id : str
            Unique identifier for this question
        duration : Optional[int]
            Duration in seconds, or None for unlimited
        expected_students : int
            Expected number of students (for auto-end feature)
        """
        self.current_question_id = question_id
        self.current_duration = duration
        self.start_time = time.time()
        self.expected_student_count = expected_students
        self.answers = {}  # Clear previous answers
    
    def get_time_remaining(self) -> Optional[float]:
        """
        Get remaining time in seconds for the current question
        Returns None if no duration limit
        """
        if self.current_duration is None or self.start_time is None:
            return None
        
        elapsed = time.time() - self.start_time
        remaining = self.current_duration - elapsed
        return max(0, remaining)
    
    def get_question_status(self) -> dict:
        """
        Get the status of the current question
        """
        if self.current_question_id is None:
            return {
                "active": False,
                "question_id": None
            }
        
        status = {
            "active": True,
            "question_id": self.current_question_id,
            "duration": self.current_duration,
            "time_remaining": self.get_time_remaining(),
            "responses_received": len(self.answers),
            "expected_students": self.expected_student_count,
            "all_responded": len(self.answers) >= self.expected_student_count if self.expected_student_count > 0 else False
        }
        
        return status
    
    def end_question(self):
        """
        End the current question session
        """
        self.current_question_id = None
        self.current_duration = None
        self.start_time = None
        self.expected_student_count = 0

