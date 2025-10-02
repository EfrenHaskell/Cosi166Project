import yaml
import os
from dotenv import load_dotenv


class ErrorTags:
    def __init__(self):
        self.NULL_RESPONSE = "null_response"
        self.AI_RESPONSE_FORMAT = "ai_response_format"
        self.DB_RUN_TIME = "db_run_time"


class ConfigTags:

    def __init__(self):
        self.AI_CONTEXT = "ai_context"
        self.TEST_DIR = "test_file_dir"
        self.AI_SAMPLES = "ai_sample_inc"


class QueryTags:
    def __init__(self):
        self.TEST_D = "test_d"
        self.TEST_EF = "test_eh"
        self.TEST_EK = "test_ek"
        self.TEST_J = "test_j"
        self.TEST_P = "test_p"


def load(file_nm):
    with open(file_nm, "r") as file:
        return yaml.safe_load(file)


def load_config():
    return load("config/conf.yaml")


def load_errors():
    return load("config/errors.yaml")


def load_queries():
    query_dir: str = "config/queries"
    queries = {}
    for query_file in os.listdir(query_dir):
        new_queries = load(f"{query_dir}/{query_file}")
        for key in new_queries:
            queries[key] = new_queries[key]
    return queries


# meta
ERROR_TAGS = ErrorTags()
CONFIG_TAGS = ConfigTags()
QUERY_TAGS = QueryTags()
ERRORS = load_errors()
CONFIG = load_config()
QUERY = load_queries()
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
