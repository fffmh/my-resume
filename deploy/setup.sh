#!/usr/bin/env bash
# 流光简历 · 云服务器一键部署脚本（Ubuntu 22.04，root 或 sudo 执行）
# 用法：把本项目上传/克隆到 /opt/resume 后，执行 bash /opt/resume/deploy/setup.sh
set -euo pipefail

APP_DIR=/opt/resume
DOMAIN="${1:-}"   # 可选：传域名，如 bash setup.sh resume.example.com

echo "==> [1/6] 安装系统依赖"
apt-get update -y
apt-get install -y python3-venv python3-pip curl git

echo "==> [2/6] 创建虚拟环境并安装 Python 依赖（CPU 版 torch，体积小）"
cd "$APP_DIR"
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
./venv/bin/pip install -r backend/requirements.txt

echo "==> [3/6] 下载语义模型（bge-small-zh-v1.5，约 100MB，走 hf-mirror）"
HF_ENDPOINT=https://hf-mirror.com ./venv/bin/python backend/download_model.py || echo "   模型下载失败，将自动降级为词法检索"

echo "==> [4/6] 安装 systemd 服务"
cp deploy/resume-backend.service /etc/systemd/system/resume-backend.service
systemctl daemon-reload
systemctl enable resume-backend
systemctl restart resume-backend

echo "==> [5/6] 安装 Caddy（自动 HTTPS 反向代理）"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

if [ -n "$DOMAIN" ]; then
  sed "s/resume.yourdomain.com/$DOMAIN/g" "$APP_DIR/deploy/Caddyfile.example" > /etc/caddy/Caddyfile
else
  echo ':80 { reverse_proxy 127.0.0.1:8000 }' > /etc/caddy/Caddyfile
fi
systemctl enable caddy
systemctl restart caddy

echo "==> [6/6] 完成"
echo "   后端：http://127.0.0.1:8000（systemd 常驻）"
if [ -n "$DOMAIN" ]; then
  echo "   公网：https://$DOMAIN"
else
  echo "   公网：http://<服务器IP>（无 HTTPS，建议尽快配域名）"
fi
echo "   提示：首次使用请在网站「设置」页填写 DeepSeek API Key 以启用 AI 润色。"