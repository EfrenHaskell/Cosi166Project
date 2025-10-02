from openai import OpenAI
import load
import re
import os


class Section:
    """
    Base class for Section Types
    """

    def append(self, line: str):
        pass


class ProblemSection(Section):
    """
    ProblemSection class handles problem text parsing
        - attributes:
            - internal: list[str] - internal data object stores problem strings
    """

    def __init__(self):
        self.internal: list[str] = []

    def append(self, line: str):
        self.internal.append(line)


class SkillSection(Section):
    """
    SkillSection class handles skill text parsing
        - attributes:
            - internal: dict[str, str] - internal data object stores skill label, skill text pairs
    """

    def __init__(self):
        self.internal = {}

    def append(self, line: str):
        """
        Skill strings take the form 'LineNumber. **Skill Label:** Skill text'
         - lines are split into label, text pairs
         - labels are found by the head (the second star) and the tail (the first colon)
         - text is everything following the first colon
        :param line:
        :return:
        """

        label_head = line.find("*") + 2
        label_tail = line.find(":")
        label = line[label_head: label_tail]
        text = line[label_tail+1:]
        self.internal[label] = text


class ResponseTemplate:
    """
    ResponseTemplate class defines parsing functions for problem and skill sections
    """

    def __init__(self, text: str):
        self.problem_section = ProblemSection()
        self.skill_section = SkillSection()
        self.text = text

    def str_to_template(self):
        if len(self.text) == 0 or self.text is None:
            raise Exception(load.ERRORS.null_response)
        else:
            lines = re.split(r"\n+", self.text)
            curr_section = None
            for line in lines:
                if line.isspace():
                    continue
                elif line == "**Problems:**":
                    curr_section = self.problem_section
                elif line == "**Skills:**":
                    curr_section = self.skill_section
                elif curr_section is None:
                    raise Exception(load.ERRORS.ai_response_format)
                else:
                    curr_section.append(line)

    def default_message(self, line):
        self.problem_section.append(line)


class Agent:
    """
    Agent defines a wrapper class for the OpenAI API
        - Request and Response functionality
        - Test Utils
    """

    def __init__(self):

        self.api_key = load.OPEN_AI_API_KEY
        self.ai_context = load.CONFIG.ai_context
        self.client = OpenAI(api_key=self.api_key,)

    @staticmethod
    def _write_sample(file: str, text: str):
        with open(file, "w") as sample:
            sample.write(text)

    @staticmethod
    def _exists(path: str) -> bool:
        return os.path.exists(path)

    def make_request(self, prompt: str, code_sample: str, language: str, debug=None) -> str:
        response = self.client.responses.create(
            model="gpt-4o",
            instructions=f"You are a coding assistant, {self.ai_context}",
            input=f"""I was asked to write code that behaves as follows:\n{prompt}\n
            can you {self.ai_context}, my {language} code:\n{code_sample}"""
        )
        text = response.output_text
        if debug:
            self._write_sample(debug, text)
        return text

    @staticmethod
    def configure_debug_path(test_path, file_nm) -> str:
        return os.sep.join([test_path, file_nm]) + ".txt"

    @staticmethod
    def parse_response(text) -> ResponseTemplate:
        parse_template = ResponseTemplate(text)
        if text == "correct":
            parse_template.default_message("Good Job!")
        else:
            parse_template.str_to_template()
        return parse_template
