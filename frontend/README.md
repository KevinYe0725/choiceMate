# ChoiceMate Frontend (MVP)

本工程为 **ChoiceMate（AI 选择器）前端 MVP**，基于 React + Vite + TypeScript，配合既有后端完成完整闭环。

## 环境要求
- Node.js 22

## 安装与运行
```bash
cd frontend
npm install
npm run dev
```

## 环境变量
复制 `.env.example` 为 `.env`，并配置后端地址：
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 使用流程（闭环）
1. 打开首页，点击“新建选择会话”。
2. 输入问题 `problem` 和至少两个选项 `options`。
3. 创建后进入 Round1：权重滑条（impact / cost / risk / reversibility）。
4. Round2：评分矩阵（可留空）。留空将以 `null` 发送给后端。
5. Round3：展示决策结果（best_option + per_option + contributions）。
6. 点击“生成自然语言解释”，调用 `/explain` 获得 explanation / highlights / followups。

> 重要：Round2 留空项会被后端自动补为 **3**，并在 `facts_completion` 与 `assumptions` 中提示。

## 后端契约（写入前端文档与代码）
- base URL：`VITE_API_BASE_URL`
- POST `/questionnaire/next`
  - 新会话：`state` 不传或 `null`；`last_answer = null`
  - Round1 `last_answer`：`{ "weights": { ... } }`
  - Round2 `last_answer`：`{ "option_ratings": { ... } }`（允许 `null`）
- POST `/explain`
  - 请求体包含：`problem / options / facts / decision / facts_completion / assumptions / messages / style`

### /questionnaire/next 完整契约（snake_case）
**请求示例：**
```json
{
  "problem": "string",
  "options": ["string", "string"],
  "state": {
    "round": 1,
    "facts": {
      "weights": {"impact": 3, "cost": 2, "risk": 2, "reversibility": 1},
      "option_ratings": {
        "A": {"impact": 3, "cost": null, "risk": 4, "reversibility": 2},
        "B": {"impact": null, "cost": null, "risk": null, "reversibility": null}
      }
    },
    "draft_meta": {}
  },
  "last_answer": null
}
```

**Round1 last_answer：**
```json
{"weights":{"impact":4,"cost":2,"risk":3,"reversibility":1}}
```

**Round2 last_answer（允许未知 null）：**
```json
{"option_ratings":{"A":{"impact":4,"cost":null,"risk":3,"reversibility":2},"B":{"impact":2,"cost":1,"risk":null,"reversibility":5}}}
```

**响应示例：**
```json
{
  "round": 2,
  "question": {},
  "state": {},
  "decision": null,
  "facts_completion": [
    {"option":"A","dimension":"cost","filled_value":3,"source":"default"}
  ],
  "assumptions": [
    "你未填写「A」的 cost，我暂以中性值 3 作为假设。"
  ]
}
```

**Round1 question（weights_sliders）：**
```json
{
  "type":"weights_sliders",
  "prompt":"请调整你对各维度的重视程度（1-5）",
  "dimensions":[
    {"key":"impact","label":"长期收益/成长","min":1,"max":5,"default":3},
    {"key":"cost","label":"成本（时间/金钱/精力）","min":1,"max":5,"default":2},
    {"key":"risk","label":"风险（失败/后悔）","min":1,"max":5,"default":2},
    {"key":"reversibility","label":"可逆性（能否回头）","min":1,"max":5,"default":1}
  ]
}
```

**Round2 question（ratings_matrix）：**
```json
{
  "type":"ratings_matrix",
  "prompt":"请为每个选项在各维度打分（1-5），未知可留空",
  "options":["A","B"],
  "dimensions":[
    {"key":"impact","label":"长期收益/成长（越高越好）"},
    {"key":"cost","label":"成本（越高=越贵/越累）"},
    {"key":"risk","label":"风险（越高=越危险）"},
    {"key":"reversibility","label":"可逆性（越高=越能回头）"}
  ],
  "defaults":{
    "A":{"impact":3,"cost":3,"risk":3,"reversibility":3},
    "B":{"impact":3,"cost":3,"risk":3,"reversibility":3}
  }
}
```

### /explain 完整契约（snake_case）
**请求示例：**
```json
{
  "problem":"string",
  "options":["A","B"],
  "facts": { "weights": {}, "option_ratings": {} },
  "decision": {},
  "facts_completion":[{"option":"A","dimension":"cost","filled_value":3,"source":"default"}],
  "assumptions":["..."],
  "messages":[{"role":"user","content":"..."},{"role":"system","content":"..."}],
  "style":{"tone":"clear","length":"medium"}
}
```

**响应示例：**
```json
{"explanation":"string","highlights":["string"],"followups":["string"]}
```

### 语义约束
- canonical dimensions 固定：`impact / cost / risk / reversibility`
- cost & risk 的评分越高表示越糟（成本/风险更高）
- impact & reversibility 越高越好
- Round2 留空（null）由后端补为 3，并在 `facts_completion` / `assumptions` 告知

## 重要实现说明
- 前端内部 Conversation 使用 camelCase 字段（见 `src/storage/conversations.ts`）。
- 后端返回的 `state / decision / question` **保持 snake_case 原样存储和使用**，以避免数据丢失（代码中有注释）。
- 如果需要转换，可使用 `src/utils/case.ts` 中的 `toSnakeCase / toCamelCase`。

## 目录结构
```
frontend/
  src/
    api/
    components/
    pages/
    storage/
    utils/
```
