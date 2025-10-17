import ai_utils


class Session:
    def __init__(self):
        self.prompts: list[str] = []

    def queue_prompt(self, prompt: str):
        self.prompts.append(prompt)

    def pop_prompt(self) -> str:
        return self.prompts.pop(0)

    def has_prompt(self) -> bool:
        return len(self.prompts) > 0
