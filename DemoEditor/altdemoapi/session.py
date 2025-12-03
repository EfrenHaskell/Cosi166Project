import ai_utils


class Session:
    def __init__(self):
        self.prompt = ""
        self.answers: dict[str, tuple[str, ai_utils.ResponseTemplate]] = {}
        self.agent = ai_utils.Agent()
        self.skills: dict[str, list[str]] = {}

    def new_prompt(self, prompt: str):
        self.prompt = prompt

    def has_prompt(self) -> bool:
        return self.prompt != ""

    def add_answer(self, user_id: str, answer, ai_response: ai_utils.ResponseTemplate):
        self.answers[user_id] = answer, ai_response
