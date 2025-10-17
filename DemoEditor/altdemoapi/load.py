import yaml
import os
from dotenv import load_dotenv
from typing import Any


class QueryTags:
    def __init__(self):
        self.TEST_D = "test_d"
        self.TEST_EF = "test_eh"
        self.TEST_EK = "test_ek"
        self.TEST_J = "test_j"
        self.TEST_P = "test_p"


class Loader:
    def load(self):
        pass

    @staticmethod
    def load_file(file_nm):
        with open(file_nm, "r") as file:
            return yaml.safe_load(file)


class Errors(Loader):
    def __init__(self):
        self.null_response = None
        self.ai_response_format = None
        self.db_run_time = None
        self.db_set_up_exists = None

    def load(self):
        loaded_errors: dict[str, Any] = self.load_file("config/errors.yaml")
        error_fields = vars(self)
        for error, error_str in loaded_errors.items():
            error_fields[error] = error_str


class Config(Loader):
    def __init__(self):
        self.ai_context = None
        self.test_file_dir = None
        self.ai_sample_inc = None
        self.db_set_up_path = None

    def load(self):
        loaded_config: dict[str, Any] = self.load_file("config/errors.yaml")
        config_fields = vars(self)
        for config, config_element in loaded_config.items():
            config_fields[config] = config_element


class Query(Loader):
    pass


# def load_queries():
#     query_dir: str = "config/queries"
#     queries = {}
#     for query_file in os.listdir(query_dir):
#         new_queries = load(f"{query_dir}/{query_file}")
#         for key in new_queries:
#             queries[key] = new_queries[key]
#     return queries


# meta
ERRORS = Errors()
CONFIG = Config()
# QUERY = load_queries()
ERRORS.load()
CONFIG.load()

load_dotenv()
OPEN_AI_API_KEY = os.getenv("OPEN_AI_API_KEY")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_DATABASE = os.getenv("DB_DATABASE")


def increment_ai_samples():
    old_samples = CONFIG[CONFIG_TAGS.AI_SAMPLES]
    CONFIG[CONFIG_TAGS.AI_SAMPLES] += 1
    return old_samples


def reset_ai_samples(num: int):
    CONFIG[CONFIG_TAGS.AI_SAMPLES] = num


def dump_conf(spec_config=None):
    to_dump = CONFIG if not spec_config else spec_config
    with open("config/conf.yaml", "w") as conf_file:
        yaml.safe_dump(to_dump, conf_file)
