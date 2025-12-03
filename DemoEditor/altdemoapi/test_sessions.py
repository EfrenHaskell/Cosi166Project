import load
import ai_utils
from typing import AnyStr


class TestSession:
    """
    Session class for testing
        - Provides manager features for configuration handling
    """

    @staticmethod
    def get_test_example(file_path: str) -> AnyStr:
        """
        Test util for getting the output from a specific test sample
        :param file_path:
        :return:
        """

        with open(file_path, "r") as file:
            return file.read()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        load.dump_conf()


if __name__ == "__main__":
    agent = ai_utils.Agent()
    skill_map = {
        "bob@gmail.com": "\n,".join([
            "Function Definition: Practice defining and using functions to encapsulate code.",
            "Understanding Requirements: Focus on translating requirements into code structures, such as functions or classes.",
            "Syntax Familiarity: Review function syntax and structure in Python to ensure proper implementation."
        ]),
        "jeff@gmail.com": "\n,".join([
            "Reading Requirements Carefully: Ensure you pay close attention to task details to avoid small errors.",
            "Debugging Techniques: Practice identifying where issues are in your code by stepping through it or using debugging tools.",
            "Execution Flow: Understand how Python scripts execute, and make sure to call functions after defining them.",
            "Testing Your Code: Learn to test your functions after writing them to confirm they produce the expected output.",
            "Code Environment: Familiarize yourself with how your development environment works to avoid problems related to environment misconfigurations."
        ]),
        "fred@gmail.com": "\n,".join([
            "Understanding Indentation: Learn how Python uses indentation to define scope (e.g., in functions, loops). Proper indentation is key in Python.",
            "Code Formatting: Practice maintaining consistent formatting for readability. Many code editors have auto-format features that can help with this.",
            "Basic Python Syntax: Reviewing the basics of function definitions and how to structure them will help solidify your understanding.",
            "Debugging: Develop skills to identify and resolve syntactic errors by carefully reading error messages and understanding the common causes of such errors."
        ])
    }
    print(agent.culminate_all(skill_map))

