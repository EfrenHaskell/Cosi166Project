import load
import ai_utils
from typing import AnyStr


class TestSession:
    """
    Session class for testing
        - Provides manager features for configuration handling
    """

    @staticmethod
    def new_test_file():
        """
        Test util for generating test sample names
        :return:
        """
        return "test_sample" + str(load.increment_ai_samples())

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
    with TestSession() as ai_session:
        agent = ai_utils.Agent()
        path = agent.configure_debug_path("test_files", ai_session.new_test_file())
        test_prompt = "Write a function print_hello_world that prints the string \"hello world\""
        test_code = "print(\"hello world\")"
        agent.make_request(prompt=test_prompt, code_sample=test_code, language="python", debug_path=path)
        print(ai_session.get_test_example(path))
