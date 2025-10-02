import pymysql as sql
import load


class Database:

    def __init__(self):
        try:
            self.conn: sql.Connection = self.connect()
            self.cursor = self.conn.cursor()
        except sql.Error as e:
            raise RuntimeError(f"{load.ERRORS[load.ERROR_TAGS.DB_RUN_TIME]}: {e}")

    def __enter__(self) -> "Database":
        return self

    def __exit__(self):
        if self.conn:
            self.conn.close()

    @staticmethod
    def connect() -> sql.Connection:
        return sql.connect(
            user=load.DB_USER,
            password=load.DB_PASSWORD,
            host=load.DB_HOST,
            database=load.DB_DATABASE
        )

    def query(self, query_str: str):
        pass
