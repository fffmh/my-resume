# 流光简历 · Resume Gallery

一个类 Boss直聘/猎聘 风格的简历工作台（**第一阶段：纯前端展示版**）。

深色科技·玻璃拟态设计；数据仅保存在访客浏览器（IndexedDB）；导入支持 .txt/.md/.docx/.pdf 半真解析；生成简历按目标岗位从信息库筛选素材并用本地规则润色；简历库自动按岗位与内容相似度分组（Web Worker 计算）。

## 功能

| 模块 | 说明 |
|---|---|
| 信息库 | 8 个内置库（基本信息/求职意向/教育经历/工作经历/项目经历/技能/证书资质/自我评价）+ 自定义信息库，增删改即存即用 |
| 导入文件 | 读取本地文件，真实抽取文本（txt/md 直读、docx 用 mammoth、pdf 用 pdfjs），关键词分类填入对应信息库，可编辑后确认 |
| 模板管理 | 上传 Word/PDF 模板，识别 `{{占位符}}` 清单（真实填写在第二阶段启用） |
| 生成简历 | 输入目标岗位 + 可选 JD → 匹配筛选 → 规则润色（时间统一/动作动词/关键词高亮）→ 3 套内置玻璃风模板渲染预览 → 存入简历库 |
| 简历库 | 按目标岗位 + 内容相似度自动分组（相似度计算在 Web Worker，不卡界面）；支持预览、下载 HTML、删除 |
| 设置 | AI 引擎配置（第二阶段启用）、数据导出/导入、清空本地数据 |

## 本地运行

```bash
npm install        # 安装依赖（首次）
npm run dev        # 开发服务器 → http://localhost:5173
npm run build      # 生产构建 → dist/
npm run preview    # 本地预览 dist/
npm test           # 运行单元测试（17 项）
npm run typecheck  # TS 类型检查
```

Windows 也可直接双击 `start.bat` 启动。

## 部署到 GitHub Pages（约 3 分钟，免费 HTTPS 公网地址）

1. **注册账号**：打开 https://github.com 免费注册并登录。
2. **建仓库**：右上角 `+` → New repository → 仓库名随意（如 `resume-gallery`）→ 选 **Public** → 不要勾选 "Add a README" → Create repository。
3. **推送代码**：在本项目目录打开终端（或在 VSCode 里按 `` Ctrl+` `` 打开终端），依次执行：

   ```bash
   git init
   git add .
   git commit -m "init: 流光简历第一阶段"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

   首次推送会弹出浏览器登录 GitHub，按提示授权即可。
4. **开启 Pages**：仓库页面 → Settings → 左侧 Pages → Source 选 **GitHub Actions**（代码里已内置 `.github/workflows/deploy.yml`，push 会自动构建并发布）。
5. **等待 1~2 分钟**：仓库 Actions 页出现绿色对勾后，访问：

   `https://<你的用户名>.github.io/<仓库名>/`

> 提示：如果不想用命令行，也可以在仓库页面用 "Add file → Upload files" 把整个项目传上去（除 node_modules、dist），效果一样。

## 数据说明

- 第一阶段数据**只存在访客自己的浏览器**（IndexedDB），换设备或清缓存会丢失。
- 可在「设置」页导出 JSON 备份，换设备后导入恢复。

## 第二阶段升级路径（接口解耦，零侵入）

- 数据访问统一走 `src/api/adapter.ts`：`export const api = new LocalStorageAdapter()`。
- 第二阶段部署 FastAPI 后端后，仅需改为 `export const api = new HttpAdapter()`（接口签名完全一致，`HttpAdapter` 已就绪），前端组件零改动。
- 随后接入：真实 Word/PDF 解析、占位符模板填写、大模型润色与 docx/pdf 高质量导出。

## 技术栈

Vue 3 · TypeScript · Vite · vue-router (hash) · IndexedDB · mammoth · pdfjs-dist · Vitest · GitHub Actions

## 目录

```
src/
  api/        # 数据层：IResumeAPI 接口 + 适配器（Local/Http）+ 解析/分类/生成/分组
  views/      # 页面：首页/信息库/导入/模板/生成/简历库/设置
  components/ # 通用组件：玻璃卡片/图标/弹窗/骨架屏/标签输入等
  styles/     # 深色科技·玻璃拟态设计系统
.github/workflows/deploy.yml   # GitHub Pages 自动部署
```