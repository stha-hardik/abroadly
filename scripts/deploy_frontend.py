"""
Deploy Abroadly frontend to VPS.
- Install Node 20 if not present
- rsync/sftp frontend build files
- npm install + npm run build on VPS
- Create systemd service abroadly-frontend
- Install nginx + configure reverse proxy
- Reload nginx
"""
import sys
import os
import paramiko
import stat

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "187.124.27.168"
PORT = 22
USER = "root"
PASS = "Abroadly2026@Wb2GPwft3b"

LOCAL_FRONTEND = r"D:\Abroadly\frontend"
REMOTE_BASE = "/var/www/abroadly"
REMOTE_FRONTEND = f"{REMOTE_BASE}/frontend"

# Files/dirs to EXCLUDE from upload
EXCLUDE = {".next", "node_modules", ".env.local", ".env", "__pycache__", ".git"}


def run(ssh: paramiko.SSHClient, cmd: str, check: bool = True) -> str:
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
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


def sftp_upload_dir(sftp: paramiko.SFTPClient, local_dir: str, remote_dir: str):
    """Recursively upload a local directory to remote, skipping EXCLUDE entries."""
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        sftp.mkdir(remote_dir)

    for entry in os.listdir(local_dir):
        if entry in EXCLUDE:
            continue
        local_path = os.path.join(local_dir, entry)
        remote_path = f"{remote_dir}/{entry}"
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            print(f"  upload {local_path} -> {remote_path}")
            sftp.put(local_path, remote_path)


def main():
    print("=== Connecting to VPS ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASS, timeout=30)
    print("Connected.")

    # ── 1. Install Node 20 ──────────────────────────────────────────────────
    print("\n=== Checking Node.js ===")
    node_ver = run(ssh, "node --version 2>/dev/null || echo MISSING", check=False)
    if "v20" not in node_ver and "v22" not in node_ver and "v18" not in node_ver:
        print("Node not found or wrong version. Installing Node 20 via NodeSource...")
        run(ssh, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -")
        run(ssh, "apt-get install -y nodejs")
    else:
        print(f"Node already installed: {node_ver.strip()}")

    node_ver2 = run(ssh, "node --version")
    npm_ver = run(ssh, "npm --version")
    print(f"Node: {node_ver2.strip()}  npm: {npm_ver.strip()}")

    # ── 2. Upload frontend source ────────────────────────────────────────────
    print("\n=== Uploading frontend source ===")
    run(ssh, f"mkdir -p {REMOTE_FRONTEND}")
    sftp = ssh.open_sftp()
    sftp_upload_dir(sftp, LOCAL_FRONTEND, REMOTE_FRONTEND)
    sftp.close()
    print("Upload complete.")

    # ── 3. Write .env.local on VPS (point to backend on localhost via nginx) ──
    print("\n=== Writing .env.local on VPS ===")
    env_content = "NEXT_PUBLIC_API_URL=http://187.124.27.168/api\n"
    run(ssh, f"printf '%s' '{env_content}' > {REMOTE_FRONTEND}/.env.local")

    # ── 4. npm install + build ───────────────────────────────────────────────
    print("\n=== npm install ===")
    run(ssh, f"cd {REMOTE_FRONTEND} && npm install --legacy-peer-deps", check=True)

    print("\n=== npm run build ===")
    run(ssh, f"cd {REMOTE_FRONTEND} && npm run build")

    # ── 5. Systemd service for frontend ─────────────────────────────────────
    print("\n=== Creating systemd service: abroadly-frontend ===")
    service = """[Unit]
Description=Abroadly Frontend (Next.js)
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/abroadly/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=PATH=/usr/bin:/bin
ExecStart=/usr/bin/node node_modules/.bin/next start -p 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
    # Write via heredoc
    heredoc_cmd = f"cat > /etc/systemd/system/abroadly-frontend.service << 'SVCEOF'\n{service}\nSVCEOF"
    run(ssh, heredoc_cmd)

    # Fix ownership
    run(ssh, f"chown -R www-data:www-data {REMOTE_FRONTEND}")
    run(ssh, f"chown -R www-data:www-data {REMOTE_BASE}/data", check=False)

    run(ssh, "systemctl daemon-reload")
    run(ssh, "systemctl enable abroadly-frontend")
    run(ssh, "systemctl restart abroadly-frontend")
    import time; time.sleep(4)
    run(ssh, "systemctl status abroadly-frontend --no-pager -l", check=False)

    # ── 6. Install nginx ─────────────────────────────────────────────────────
    print("\n=== Installing nginx ===")
    run(ssh, "apt-get install -y nginx")

    # ── 7. Configure nginx ───────────────────────────────────────────────────
    print("\n=== Configuring nginx ===")
    nginx_conf = """server {
    listen 80 default_server;
    server_name _;

    # Backend health + API
    location /api/health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
"""
    heredoc_nginx = f"cat > /etc/nginx/sites-available/abroadly << 'NGINXEOF'\n{nginx_conf}\nNGINXEOF"
    run(ssh, heredoc_nginx)

    # Enable site, disable default
    run(ssh, "ln -sf /etc/nginx/sites-available/abroadly /etc/nginx/sites-enabled/abroadly")
    run(ssh, "rm -f /etc/nginx/sites-enabled/default")
    run(ssh, "nginx -t")
    run(ssh, "systemctl reload nginx")
    run(ssh, "ufw allow 80/tcp", check=False)

    print("\n=== All done! ===")
    print(f"Frontend: http://{HOST}")
    print(f"API health: http://{HOST}/api/health")

    ssh.close()


if __name__ == "__main__":
    main()
