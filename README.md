# 断食追踪

根据你上一餐吃的内容，智能计算断食各阶段的到达时间。

**在线使用：https://clare903.github.io/diet/**

手机打开后"添加到主屏幕"可当独立 App 使用，支持离线。

## 使用方法

1. **记录上一餐** — 两种方式：
   - **手动记录**：搜索食物并输入克重，内置 40+ 常见食物营养数据库
   - **拍照识别**：拍一张食物照片，AI 自动分析热量和营养成分（需配置 AI，见下方说明）
2. **选择断食模式** —
   - **轻断食**（≤24h）：16:8、18:6、20:4、23:1，断食结束后自动进入进食窗口，循环进行
   - **长断食**（>24h）：36h、48h、72h、120h 或自定义时长
3. **开始断食** — 实时显示当前阶段（消化→血糖稳定→糖原消耗→燃脂→酮症），只显示目标时长内可达到的阶段
4. **运动打卡**（可选）— 记录运动类型和时长，加速断食进程
5. **结束断食** — 记录体重和感受，保存到历史记录

## 配置 AI 拍照识别

拍照识别功能需要配置 AI 接口。打开 App → 点击顶部「设置」标签即可配置。

### Gemini（推荐，免费）

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey) 登录 Google 账号
2. 点击「Create API Key」获取免费的 API Key
3. 在 App「设置」中选择 **Gemini**，粘贴 API Key，点击保存

Gemini 免费额度足够日常使用，无需付费。

### OpenAI

1. 前往 [OpenAI Platform](https://platform.openai.com/api-keys) 注册并获取 API Key
2. 在 App「设置」中选择 **OpenAI**，粘贴 API Key，点击保存

使用 gpt-4o-mini 模型，按量计费，单次识别约 $0.001。

### 自定义接口

如果你有自己搭建的 AI 分析服务（例如使用 Claude 等需要代理的模型），选择「自定义」并填写接口地址。

接口规范：
- **请求**：`POST`，`Content-Type: application/json`
- **请求体**：`{ "image": "data:image/jpeg;base64,...", "description": "用户补充描述" }`
- **响应**：`{ "cal": 500, "carb": 60, "protein": 20, "fat": 15, "description": "食物描述" }`

> API Key 仅保存在你的浏览器本地（localStorage），不会上传到任何服务器。

## 自行部署

本项目是纯前端 PWA，无需后端，可部署到任何静态托管服务。

### GitHub Pages（推荐）

1. Fork 本仓库
2. 进入仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 代码推送到 `main` 分支后自动部署

### 其他平台

将以下文件部署到任意静态服务器即可：

```
index.html
manifest.json
sw.js
icon-192.png
icon-512.png
```

## 原理

断食进程主要受以下因素影响：

| 因素 | 影响 |
|------|------|
| 碳水摄入量 | 决定糖原储备量，碳水越多进入燃脂/酮症越慢 |
| 进食量 | 影响消化时间和糖原补充量 |
| 运动 | 加速糖原消耗，不同阶段效果不同（糖原消耗期效果最大） |

运动热量消耗基于 [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/) 的 MET 标准值计算。

## 技术

纯前端 PWA，单个 HTML 文件，无需后端。数据存储在浏览器 localStorage 中。AI 接口直接从浏览器调用（Gemini / OpenAI 均支持浏览器端直接请求）。
