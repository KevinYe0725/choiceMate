# ChoiceMate Backend (MVP)

## 快速开始

### 1) 创建虚拟环境

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

### 2) 安装依赖

```bash
pip install -r requirements.txt
```

### 3) 启动服务

```bash
uvicorn app.main:app --reload --port 8000
```

服务启动后访问：`http://localhost:8000/healthz`

## 三步问询流程示例（/questionnaire/next）

### Round 1：新会话

```bash
curl -s -X POST http://localhost:8000/questionnaire/next \
  -H 'Content-Type: application/json' \
  -d '{
    "problem": "是否从大厂跳去创业公司",
    "options": ["留在大厂", "加入创业公司"]
  }'
```

返回示例（节选）：
- `round=1`
- `question.type=weights_sliders`
- `state` 被返回

### Round 2：提交权重

将上一步返回的 `state` 原样带回：

```bash
curl -s -X POST http://localhost:8000/questionnaire/next \
  -H 'Content-Type: application/json' \
  -d '{
    "problem": "是否从大厂跳去创业公司",
    "options": ["留在大厂", "加入创业公司"],
    "state": {
      "round": 1,
      "facts": {
        "weights": null,
        "option_ratings": null
      },
      "draft_meta": {}
    },
    "last_answer": {
      "weights": {"impact": 4, "cost": 2, "risk": 3, "reversibility": 1}
    }
  }'
```

返回示例（节选）：
- `round=2`
- `question.type=ratings_matrix`

### Round 3：提交评分（包含未知/null）

```bash
curl -s -X POST http://localhost:8000/questionnaire/next \
  -H 'Content-Type: application/json' \
  -d '{
    "problem": "是否从大厂跳去创业公司",
    "options": ["留在大厂", "加入创业公司"],
    "state": {
      "round": 2,
      "facts": {
        "weights": {"impact": 4, "cost": 2, "risk": 3, "reversibility": 1},
        "option_ratings": null
      },
      "draft_meta": {}
    },
    "last_answer": {
      "option_ratings": {
        "留在大厂": {"impact": 4, "cost": null, "risk": 2, "reversibility": 3},
        "加入创业公司": {"impact": 3, "cost": 2, "risk": 4, "reversibility": 2}
      }
    }
  }'
```

返回示例（节选）：
- `round=3`
- `decision` 已生成
- `facts_completion` 非空
- `assumptions` 非空

## /explain 示例（未配置 LLM 时走 fallback）

```bash
curl -s -X POST http://localhost:8000/explain \
  -H 'Content-Type: application/json' \
  -d '{
    "problem": "是否从大厂跳去创业公司",
    "options": ["留在大厂", "加入创业公司"],
    "facts": {
      "weights": {"impact": 4, "cost": 2, "risk": 3, "reversibility": 1},
      "option_ratings": {
        "留在大厂": {"impact": 4, "cost": 3, "risk": 2, "reversibility": 3},
        "加入创业公司": {"impact": 3, "cost": 2, "risk": 4, "reversibility": 2}
      }
    },
    "decision": {
      "best_option": "留在大厂",
      "score_breakdown": {
        "scale": "0-100",
        "dimensions": ["impact", "cost", "risk", "reversibility"],
        "weights": {"impact": 0.4, "cost": 0.2, "risk": 0.3, "reversibility": 0.1},
        "per_option": [
          {
            "option": "留在大厂",
            "score": 62.5,
            "contributions": {"impact": 30, "cost": 10, "risk": 15, "reversibility": 7.5},
            "ratings": {"impact": 4, "cost": 3, "risk": 2, "reversibility": 3}
          },
          {
            "option": "加入创业公司",
            "score": 50.0,
            "contributions": {"impact": 22.5, "cost": 15, "risk": 7.5, "reversibility": 5},
            "ratings": {"impact": 3, "cost": 2, "risk": 4, "reversibility": 2}
          }
        ]
      },
      "assumptions": [],
      "confidence": "medium"
    },
    "facts_completion": [
      {"option": "留在大厂", "dimension": "cost", "filled_value": 3, "source": "default"}
    ],
    "assumptions": ["你未填写「留在大厂」的 cost，我暂以中性值 3 作为假设。"],
    "messages": [],
    "style": {"tone": "clear", "length": "medium"}
  }'
```

如果需要 LLM 解释：
1. 复制 `.env.example` 为 `.env` 并填好 `LLM_API_KEY / LLM_BASE_URL / LLM_MODEL`
2. 重启服务后再次请求 `/explain`

## 运行测试（可选）

```bash
pytest -q
```
