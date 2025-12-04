import os, subprocess, sys
from app.core.config import settings

def restore_from_file(sql_file: str):
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.postgres_password
    cmd = [
        "psql",
        "-h", settings.postgres_host,
        "-p", str(settings.postgres_port),
        "-U", settings.postgres_user,
        "-d", settings.postgres_db,
        "-f", sql_file,
    ]
    subprocess.check_call(cmd, env=env)

if __name__ == "__main__":
    restore_from_file(sys.argv[1])
