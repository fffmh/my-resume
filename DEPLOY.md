# 流光简历 · 云服务器部署（保姆级图文步骤）

把「第二阶段真实全功能版」从本机搬到云服务器，7×24 在线、带域名和 HTTPS，别人用手机/电脑随时访问。

> 已部署后，GitHub Pages 展示版仍然保留，两个入口并存。

---

## 第 1 步：买服务器（约 5 分钟）

- 平台：**阿里云** 或 **腾讯云**，选「**轻量应用服务器**」
- 配置：**Ubuntu 22.04**，**2核4G**（RAG 模型 + 推理吃内存，2G 会很紧张）
- 地域：选离你近的（如上海/广州）
- 费用参考：约 ¥60-90/月（新用户常有首年折扣）
- 买完后在控制台「防火墙/安全组」**放行端口：22、80、443**

## 第 2 步：买域名（可选但强烈推荐，约 1 分钟）

- 在阿里云/腾讯云/其他注册商买一个域名（如 `resume.example.com`），一年约 ¥30-60
- 在 DNS 控制台添加 **A 记录**：`resume.example.com → 你的服务器公网 IP`
- 没域名也可以部署，只是只能 HTTP 访问（`http://<IP>`）

## 第 3 步：把项目传到服务器（约 5 分钟）

在**你的电脑**（项目目录 `D:\Codex_project\resume`）打开 PowerShell，执行：

```powershell
# 1) 打包（排除依赖、缓存、数据）
tar -czf resume-deploy.tar.gz --exclude=node_modules --exclude=dist --exclude=data --exclude=venv --exclude=.git .\backend .\deploy .\package.json .\README.md .\start-backend.bat
```

> 服务器在国内，访问 GitHub 可能很慢；**直接打包上传最稳**。

```powershell
# 2) 上传到服务器（IP 换成你的，会提示输入密码）
scp .\resume-deploy.tar.gz root@你的服务器IP:/opt/
```

```powershell
# 3) SSH 登录服务器
ssh root@你的服务器IP
```

在服务器上：

```bash
mkdir -p /opt/resume
cd /opt/resume
tar -xzf /opt/resume-deploy.tar.gz
ls            # 应看到 backend/ deploy/ package.json ...
```

## 第 4 步：一键部署（约 3-10 分钟，主要花在下载依赖）

```bash
cd /opt/resume
bash deploy/setup.sh resume.example.com
```

> `resume.example.com` 换成你自己的域名；**没域名就不传参数**（自动走 HTTP）。

脚本会自动完成：
1. 安装系统依赖
2. 建虚拟环境 + 安装 Python 依赖（**CPU 版 torch**，体积小）
3. 下载语义模型（约 100MB，走 hf-mirror 国内镜像）
4. 注册 systemd 服务（开机自启、崩溃自动重启）
5. 安装 **Caddy** 并配置反向代理 + **自动 HTTPS 证书**

## 第 5 步：验证（约 2 分钟）

- 浏览器打开 `https://resume.example.com`（或 `http://服务器IP`）
- 看到 JARVIS 全息界面 = 成功
- 到「设置」页填 **DeepSeek API Key** 启用 AI 润色
- 命令行检查：`systemctl status resume-backend` 应显示 `active (running)`

## 常用运维命令

```bash
systemctl status resume-backend    # 看后端状态
systemctl restart resume-backend   # 重启后端
journalctl -u resume-backend -n 50 # 看最近日志
caddy validate --config /etc/caddy/Caddyfile  # 校验 Caddy 配置
```

## 数据与备份

- 所有数据在服务器 `/opt/resume/data/`（信息库/简历/模板/向量索引）
- 备份：`tar -czf resume-data-$(date +%F).tar.gz /opt/resume/data` 定期下载到本地
- 升级代码：重新打包上传覆盖 `/opt/resume` 后 `systemctl restart resume-backend`（**别覆盖 data/ 目录**）

## 常见问题

| 问题 | 解决 |
|---|---|
| 页面能开但接口报错 | `journalctl -u resume-backend -n 50` 看日志 |
| 80/443 不通 | 检查云控制台防火墙 + 服务器 `ufw status` |
| 模型下载失败 | 脚本已自动降级词法检索；手动 `HF_ENDPOINT=https://hf-mirror.com /opt/resume/venv/bin/python backend/download_model.py` |
| 内存不够 | 先 `free -m` 查看；2G 机器建议加 2G 交换分区 |
| 域名访问显示证书错误 | 确认 DNS A 记录已生效（`ping 域名` 返回服务器 IP）后再等 1-2 分钟 |