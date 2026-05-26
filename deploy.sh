#!/bin/bash
# Post-deploy script: runs after Plesk pulls from GitHub

export LD_LIBRARY_PATH=/usr/local/lib

# Frontend: install, build, restart
cd /var/www/vhosts/abroadly.online/httpdocs/frontend
echo "NEXT_PUBLIC_API_URL=/api" > .env.local
npm install --production=false
npm run build
fuser -k 3000/tcp 2>/dev/null
nohup npm run start -- -p 3000 > /tmp/nextjs.log 2>&1 &

# Backend: install deps, restart
cd /var/www/vhosts/abroadly.online/httpdocs/backend
source venv/bin/activate
pip install -r requirements.txt -q
fuser -k 8000/tcp 2>/dev/null
nohup LD_LIBRARY_PATH=/usr/local/lib uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &

echo "Deploy complete"
