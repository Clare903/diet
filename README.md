# 断食追踪

根据你上一餐吃的内容，智能计算断食各阶段的到达时间。

**在线使用：https://clare903.github.io/diet/**

手机打开后"添加到主屏幕"可当独立 App 使用，支持离线。

## 使用方法

1. **记录上一餐** — 两种方式：
   - **手动记录**：搜索食物并输入克重，内置 40+ 常见食物营养数据库
   - **拍照识别**：拍一张食物照片，AI 自动分析热量和营养成分（开箱即用，无需配置）
2. **选择断食模式** —
   - **轻断食**（≤24h）：16:8、18:6、20:4、23:1，断食结束后自动进入进食窗口，循环进行
   - **长断食**（>24h）：36h、48h、72h、120h 或自定义时长
3. **开始断食** — 实时显示当前阶段（消化→血糖稳定→糖原消耗→燃脂→酮症），只显示目标时长内可达到的阶段
4. **运动打卡**（可选）— 记录运动类型和时长，加速断食进程
5. **结束断食** — 记录体重和感受，保存到历史记录

## 自行部署

本项目分两部分：前端页面（GitHub Pages）和 AI 后端（Cloudflare Worker）。

### 1. 部署前端（GitHub Pages）

1. Fork 本仓库
2. 进入仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 代码推送到 `main` 分支后自动部署

### 2. 部署 AI 后端（Cloudflare Worker，免费）

AI 拍照识别通过 Cloudflare Worker 代理调用 Gemini API，免费额度完全够用。

#### 准备工作

1. 注册 [Cloudflare](https://dash.cloudflare.com/) 账号（免费）
2. 前往 [Google AI Studio](https://aistudio.google.com/apikey) 获取免费的 Gemini API Key

#### 部署步骤

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 进入 worker 目录
cd worker

# 设置 Gemini API Key（只需执行一次）
wrangler secret put GEMINI_API_KEY
# 粘贴你的 Gemini API Key

# 部署
wrangler deploy
```

部署成功后会得到一个地址，如 `https://diet-ai.你的用户名.workers.dev`。

#### 连接前端和后端

在 `index.html` 中找到这一行：

```js
const DEFAULT_AI_URL = 'https://diet-ai.YOUR_SUBDOMAIN.workers.dev';
```

替换为你的 Worker 地址，提交推送即可。

### 使用其他静态托管

将以下文件部署到任意静态服务器即可：

```
index.html
manifest.json
sw.js
icon-192.png
icon-512.png
```

## 高级：使用自定义 AI 接口

在 App「设置」页面可以填写自定义接口地址，覆盖默认 AI 服务。

接口规范：
- **请求**：`POST`，`Content-Type: application/json`
- **请求体**：`{ "image": "data:image/jpeg;base64,...", "description": "用户补充描述" }`
- **响应**：`{ "cal": 500, "carb": 60, "protein": 20, "fat": 15, "description": "食物描述" }`

## 原理

| 因素 | 影响 |
|------|------|
| 碳水摄入量 | 决定糖原储备量，碳水越多进入燃脂/酮症越慢 |
| 进食量 | 影响消化时间和糖原补充量 |
| 运动 | 加速糖原消耗，不同阶段效果不同（糖原消耗期效果最大） |

运动热量消耗基于 [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/) 的 MET 标准值计算。

## 技术

纯前端 PWA，单个 HTML 文件。AI 后端为 Cloudflare Worker（免费），代理 Gemini API。数据存储在浏览器 localStorage 中。
