import ai_utils
import time
from typing import Optional


class Session:
    def __init__(self):
        self.prompt = ""
        self.answers: dict[str, tuple[str, ai_utils.ResponseTemplate]] = {}
        self.agent = None  # Lazy initialize to avoid failures on import
        self.skills: dict[str, list[str]] = {}
        self.num_students = 0
        
        # Track active question metadata
        self.current_question_id: Optional[str] = None
        self.current_duration: Optional[int] = None  # in seconds
        self.start_time: Optional[float] = None  # unix timestamp
        self.expected_student_count: int = 0
        self.last_response_time: Optional[float] = None  # Track when last response was received
        self.last_response_count: int = 0  # Track previous response count
        self.no_new_responses_threshold: float = 3.0  # seconds of no new responses to trigger auto-end
        
    def add_student(self):
        self.num_students += 1

    def new_prompt(self, prompt: str):
        self.prompt = prompt

    def has_prompt(self) -> bool:
        return self.prompt != ""

    def add_answer(self, user_id: str, answer, ai_response: ai_utils.ResponseTemplate):
        self.answers[user_id] = answer, ai_response
        self.last_response_time = time.time()  # Update when we get a new response
    
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
        self.last_response_time = None
        self.last_response_count = 0
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
    
    def check_all_responded(self) -> bool:
        """
        Check if all expected students have responded.
        Uses two strategies:
        1. If expected_student_count is set, check if we have that many responses
        2. If not set, check if response count has stabilized (no new responses for N seconds)
        """
        current_count = len(self.answers)
        
        # Strategy 1: If we know the expected count, check if we've reached it
        if self.expected_student_count > 0:
            return current_count >= self.expected_student_count
        
        # Strategy 2: If we don't know expected count, check if responses have stabilized
        # (no new responses for threshold seconds AND at least 1 response received)
        if current_count > 0 and self.last_response_time is not None:
            time_since_last_response = time.time() - self.last_response_time
            if time_since_last_response >= self.no_new_responses_threshold:
                return True
        
        return False
    
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
            "all_responded": self.check_all_responded()
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
        self.last_response_time = None
        self.last_response_count = 0

    def get_answers(self):
        answers = [self.answers[student][0] for student in self.answers]
        return answers
