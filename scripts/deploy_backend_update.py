"""Push updated backend files to VPS and restart the service."""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "187.124.27.168"
USER = "root"
PASS = "Abroadly2026@Wb2GPwft3b"

REMOTE_BACKEND = "/var/www/abroadly/backend"

FILES_TO_UPLOAD = [
    (r"D:\Abroadly\backend\app\api\upload.py", f"{REMOTE_BACKEND}/app/api/upload.py"),
]


def run(ssh, cmd, check=True):
    print(f"$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    rc = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print("[stderr]", err.strip())
    if check and rc != 0:
        raise RuntimeError(f"Command failed (rc={rc}): {cmd}")
    return out


def main():
    print("=== Connecting to VPS ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, 22, USER, PASS, timeout=30)

    sftp = ssh.open_sftp()
    for local, remote in FILES_TO_UPLOAD:
        print(f"Uploading {local} -> {remote}")
        sftp.put(local, remote)
    sftp.close()
    print("Files uploaded.")

    run(ssh, "systemctl restart abroadly")
    import time; time.sleep(3)
    run(ssh, "systemctl status abroadly --no-pager -l", check=False)

    ssh.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
