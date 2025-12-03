import ai_utils


class Session:
    def __init__(self):
        self.prompt = ""
        self.answers: dict[str, str] = {}

    def new_prompt(self, prompt: str):
        self.prompt = prompt

    def has_prompt(self) -> bool:
        return self.prompt != ""
