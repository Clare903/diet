# 断食追踪 — 知道你的身体消耗到哪一步了

**在线使用：https://clare903.github.io/diet/**（手机打开后"添加到主屏幕"可当独立 App 使用，支持离线）

## 为什么做这个

市面上的断食 App 几乎都只做一件事：**计时**。但断食者真正想知道的是——**我的身体现在消耗到哪个阶段了？开始燃脂了吗？**

这个问题光靠计时回答不了。同样断食 16 小时，上一餐吃了一份沙拉和吃了一顿火锅，身体所处的代谢阶段完全不同。要推断消耗进程，必须知道三件事：

1. **上一餐吃了什么、吃了多少**（决定糖原储备和消化时长）
2. **你的体重**（决定基础代谢消耗速率）
3. **断食期间有没有运动**（加速糖原消耗）

而"记录上一餐"恰恰是所有热量记录类 App 的最大流失点——手动查表输入太麻烦。所以本项目用 **AI 拍照识别**把这一步压缩到几秒钟：拍张照，热量和三大营养素自动算好，断食阶段时间轴随之生成。

## 使用方法

1. **记录上一餐** — 两种方式：
   - **拍照识别**：拍照或从相册选择（支持多张），AI 自动分析热量、营养成分和消化时间，可补充文字描述辅助判断（开箱即用，无需配置）
   - **手动记录**：搜索食物并输入克重，内置常见食物数据库，搜不到的食物可用 AI 联网补全
2. **选择断食模式** —
   - **轻断食**（≤24h）：16:8、18:6、20:4、23:1，断食结束后自动进入进食窗口，循环进行
   - **长断食**（>24h）：36h、48h、72h、120h 或自定义时长
3. **开始断食** — 实时显示当前阶段（消化吸收→血糖稳定→糖原消耗→糖原耗尽→脂肪燃烧→初步酮症→深度酮症）
4. **运动打卡**（可选）— 记录运动类型和时长，阶段时间轴会相应提前
5. **结束断食** — 记录体重和感受，保存到历史记录

## 阶段推算的依据

每个阶段的到达时间不是写死的，而是根据你的实际摄入、体重和运动动态计算：

| 阶段 | 计算依据 |
|------|----------|
| 消化吸收 | 胃排空时间由 AI 按食物类型估算：清液体（黑咖啡）约 0.5h 内，水果约 1h，普通正餐 2–3h，高脂大餐 4–5h（参考胃排空研究的常见范围） |
| 血糖稳定 | 餐后血糖回归基线的时间与碳水摄入量正相关，高碳水餐约 2–3h，低碳水餐 1h 内 |
| 糖原消耗→耗尽 | 肝糖原容量约 80–120g（~400 kcal），加上本餐碳水的补充；按基础代谢率（体重估算）中糖类供能占比约 40% 的速率消耗 |
| 脂肪燃烧 | 肝糖原降至低水平后，脂肪酸氧化显著上升 |
| 初步酮症 | 文献常见范围为断食后 12–36h 酮体水平明显上升，具体时间受糖原储备和个体代谢影响 |
| 深度酮症/自噬 | 通常出现在 24–72h 的延长断食 |
| 运动加速 | 运动热量消耗按 [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/) 的 MET 标准值 × 体重 × 时长计算，其中糖类供能部分直接从糖原储备中扣除 |

> ⚠️ 这些估算基于群体平均值，个体差异（胰岛素敏感性、肌糖原水平、运动习惯）会造成实际偏差。本工具用于参考，不构成医疗建议。

## 技术架构

```
前端 PWA（单 HTML 文件，GitHub Pages 托管）
   │  拍照 / 文字
   ▼
Cloudflare Worker（免费，模型编排层）
   ├─ 图像识别：Claude Haiku（配了 API Key 时）
   │            或 Llama 3.2 11B Vision（免费，Workers AI 内置）
   └─ 食物营养查询：Llama 4 Scout（免费，Workers AI 内置）
```

- 前端零依赖，数据全部存在浏览器 localStorage，无服务器、无账号体系
- Worker 按任务路由不同模型，统一输出结构化 JSON
- AI 后端可插拔：默认免费开箱即用，配置 Claude API Key 后识别质量更高

## 自行部署

### 1. 前端（GitHub Pages）

1. Fork 本仓库
2. 进入仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 代码推送到 `main` 分支后自动部署

### 2. AI 后端（Cloudflare Worker，免费）

```bash
npm install -g wrangler
wrangler login          # 登录 Cloudflare（免费注册：dash.cloudflare.com）
cd worker
wrangler deploy         # 部署，得到 https://diet-ai.你的子域.workers.dev
```

部署完即可用（走免费的 Workers AI 模型）。想用更强的 Claude 识别，可选执行：

```bash
wrangler secret put CLAUDE_KEY   # 粘贴你的 Anthropic API Key（sk-ant- 开头）
```

首次使用 Llama 3.2 Vision 需接受 Meta 许可：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/你的账户ID/ai/run/@cf/meta/llama-3.2-11b-vision-instruct" \
  -H "Authorization: Bearer 你的APIToken" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"agree"}'
```

### 3. 连接前端和后端

修改 `index.html` 中的这一行为你的 Worker 地址后提交：

```js
const DEFAULT_AI_URL = 'https://diet-ai.你的子域.workers.dev';
```

（也可以不改代码，直接在 App 的「设置」页填写自定义接口地址）

## 自定义 AI 接口规范

任何符合以下规范的接口都可以接入（在「设置」页填写地址）：

- **请求**：`POST`，`Content-Type: application/json`
- **图片分析请求体**：`{ "image": "data:image/jpeg;base64,...", "description": "用户补充描述" }`
- **图片分析响应**：`{ "description": "食物名", "cal": 500, "carb": 60, "protein": 20, "fat": 15, "digestHours": 2.5 }`
- **食物查询请求体**：`{ "food": "食物名" }`
- **食物查询响应**：`{ "name": "食物名", "cal": 每100g千卡, "carb": 克, "protein": 克, "fat": 克, "defaultG": 常见份量克数, "unit": "份" }`
