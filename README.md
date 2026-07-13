# 断食追踪

根据上一餐吃的内容、体重和运动情况，推算断食各阶段的到达时间。

**在线使用：https://clare903.github.io/diet/**

手机打开后"添加到主屏幕"可当独立 App 使用，支持离线。

## 它和普通断食计时器的区别

同样断食 16 小时，上一餐吃一份沙拉和吃一顿火锅，身体所处的代谢阶段完全不同。单纯计时没法告诉你"现在开始燃脂了吗"。

这个 App 会记录你上一餐的热量和营养成分（拍照自动识别，不用手动查表），结合体重和运动记录，动态推算每个阶段的时间，而不是套用固定的时间表。

## 使用方法

1. **记录上一餐** — 两种方式：
   - **拍照识别**：拍照或从相册选择（支持多张），AI 自动分析热量、营养成分和消化时间，可补充文字描述辅助判断
   - **手动记录**：搜索食物并输入克重，内置常见食物数据库，搜不到的可用 AI 补全
2. **选择断食模式** —
   - **轻断食**（≤24h）：16:8、18:6、20:4、23:1，断食结束后自动进入进食窗口，循环进行
   - **长断食**（>24h）：36h、48h、72h、120h 或自定义时长
3. **开始断食** — 实时显示当前阶段：消化吸收 → 血糖稳定 → 糖原消耗 → 糖原耗尽 → 脂肪燃烧 → 初步酮症 → 深度酮症
4. **运动打卡**（可选）— 记录运动类型和时长，阶段时间会相应提前
5. **结束断食** — 记录体重和感受，保存到历史记录

## 阶段时间怎么算的

各阶段时间不是写死的，计算依据：

| 阶段 | 依据 |
|------|------|
| 消化吸收 | 胃排空时间由 AI 按食物类型估算：清液体（黑咖啡）0.5h 内，水果约 1h，普通正餐 2–3h，高脂大餐 4–5h |
| 血糖稳定 | 与碳水摄入量正相关，高碳水餐约 2–3h，低碳水餐 1h 内 |
| 糖原消耗→耗尽 | 肝糖原容量约 80–120g（~400 kcal）加本餐碳水补充，按基础代谢中糖类供能约 40% 的速率消耗 |
| 脂肪燃烧 | 肝糖原降至低水平后脂肪酸氧化显著上升 |
| 初步酮症 | 文献常见范围为断食 12–36h 后酮体明显上升，受糖原储备和个体代谢影响 |
| 深度酮症/自噬 | 通常出现在 24–72h 的延长断食 |
| 运动 | 按 [Compendium of Physical Activities](https://sites.google.com/site/compendiumofphysicalactivities/) 的 MET 值 × 体重 × 时长计算，糖类供能部分从糖原储备中扣除 |

这些是基于群体平均值的估算，个体差异会造成偏差，仅供参考，不构成医疗建议。

## 自行部署

分两部分：前端页面（GitHub Pages）和 AI 后端（Cloudflare Worker），都免费。

### 1. 前端（GitHub Pages）

1. Fork 本仓库
2. 进入仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 代码推送到 `main` 分支后自动部署

### 2. AI 后端（Cloudflare Worker）

```bash
npm install -g wrangler
wrangler login          # 登录 Cloudflare（免费注册：dash.cloudflare.com）
cd worker
wrangler deploy         # 部署完得到 https://diet-ai.你的子域.workers.dev
```

部署完即可用，默认走 Cloudflare Workers AI 的免费模型（图像识别用 Llama 3.2 11B Vision，食物查询用 Llama 4 Scout）。

首次使用 Llama 3.2 Vision 需要接受一次 Meta 许可：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/你的账户ID/ai/run/@cf/meta/llama-3.2-11b-vision-instruct" \
  -H "Authorization: Bearer 你的APIToken" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"agree"}'
```

想要更高的识别质量，可以配置自己的 Claude API Key（可选）：

```bash
wrangler secret put CLAUDE_KEY   # 粘贴你的 Anthropic API Key（sk-ant- 开头）
```

配置后 Worker 自动改用 Claude Haiku 做图像识别。

### 3. 连接前端和后端

修改 `index.html` 中的这一行为你的 Worker 地址后提交：

```js
const DEFAULT_AI_URL = 'https://diet-ai.你的子域.workers.dev';
```

也可以不改代码，直接在 App 的「设置」页填写接口地址。

## 自定义 AI 接口

任何符合以下规范的接口都可以在「设置」页接入：

- **请求**：`POST`，`Content-Type: application/json`
- **图片分析请求体**：`{ "image": "data:image/jpeg;base64,...", "description": "用户补充描述" }`
- **图片分析响应**：`{ "description": "食物名", "cal": 500, "carb": 60, "protein": 20, "fat": 15, "digestHours": 2.5 }`
- **食物查询请求体**：`{ "food": "食物名" }`
- **食物查询响应**：`{ "name": "食物名", "cal": 每100g千卡, "carb": 克, "protein": 克, "fat": 克, "defaultG": 常见份量克数, "unit": "份" }`

## 技术

纯前端 PWA，单个 HTML 文件，数据存在浏览器 localStorage，无服务器、无账号。AI 后端为 Cloudflare Worker，按任务路由视觉模型和语言模型，输出统一的结构化 JSON。
