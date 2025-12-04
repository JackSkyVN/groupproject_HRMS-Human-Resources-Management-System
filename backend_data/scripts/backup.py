import os, subprocess, datetime
from app.core.config import settings

def backup_to_file(out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = os.path.join(out_dir, f"{settings.postgres_db}_{ts}.sql")
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.postgres_password
    cmd = [
        "pg_dump",
        "-h", settings.postgres_host,
        "-p", str(settings.postgres_port),
        "-U", settings.postgres_user,
        "-d", settings.postgres_db,
        "-F", "p",
        "-f", out,
    ]
    subprocess.check_call(cmd, env=env)
    return out

if __name__ == "__main__":
    print(backup_to_file("backups"))
