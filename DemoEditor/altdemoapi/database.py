import pymysql as sql
import load
import os
from typing import Any


class Database:

    def __init__(self):
        try:
            self.conn: sql.Connection = self.connect()
            self.cursor = self.conn.cursor()
        except sql.Error as e:
            raise RuntimeError(f"{load.ERRORS.db_run_time}: {e}")

    @staticmethod
    def _db_config_exists():
        """
        Ensure the database build file is present in the file structure
        """

        if not os.path.exists(load.CONFIG.db_set_up_path):
            raise Exception(load.ERRORS.db_set_up_exists)

    def _has_table(self, name: str) -> bool:
        """
        Check if a table is currently in the database

        Parameters
        ----------
        name: str
            The name of the table

        Returns
        -------
        bool
            - If the table name is found in the databases' information_schema, return True
            - Else, return False

        """

        self.cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = %s
            AND table_name = %s
        """, (load.DB_DATABASE, name))

        result = self.cursor.fetchone()
        return result[0] == 1

    def _parse(self):
        pass

    def _build_db(self):
        """
        Build database -- initializing all tables not currently present in the database instance
        """
        with open(load.CONFIG.db_set_up_path, "r") as set_up_file:
            scripts = set_up_file.read()
        for statement in scripts.strip().split(";"):
            if statement.isspace():
                continue
            else:

                self.cursor.execute(statement)

    def __enter__(self) -> "Database":
        self._db_config_exists()
        self._build_db()
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

    def execute(self, query: load.Query, params: dict[str, Any], fetch_one: bool = False, commit: bool = False):
        try:
            sql_query, param_list = query.to_sql(params)
            self.cursor.execute(sql_query, param_list or ())
            if commit:
                self.conn.commit()
            return self.cursor.fetchone() if fetch_one else self.cursor.fetchall()
        except sql.Error as e:
            self.conn.rollback()
            raise RuntimeError(f"Database query failed: {e}")
