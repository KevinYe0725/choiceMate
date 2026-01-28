from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

import httpx

from domain.models import ExplainRequest, ExplainResponse


def generate_explanation(request: ExplainRequest) -> ExplainResponse:
    config = _load_config()
    if config is None:
        return _fallback_explanation(request)

    system_prompt = _build_system_prompt()
    context = _build_context(request)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context},
    ]
    if request.messages:
        messages.extend([message.model_dump() for message in request.messages])

    payload = {
        "model": config["model"],
        "messages": messages,
        "temperature": 0.3,
    }

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"{config['base_url'].rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {config['api_key']}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except Exception:
        return _fallback_explanation(request)

    content = _extract_content(data)
    if content is None:
        return _fallback_explanation(request)

    parsed = _parse_json(content)
    if parsed is None:
        return _fallback_explanation(request)

    try:
        return ExplainResponse.model_validate(parsed)
    except Exception:
        return _fallback_explanation(request)


def _load_config() -> Optional[Dict[str, str]]:
    api_key = os.getenv("LLM_API_KEY")
    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("LLM_MODEL")
    if not api_key or not base_url or not model:
        return None
    return {"api_key": api_key, "base_url": base_url, "model": model}


def _build_system_prompt() -> str:
    return (
        "你是一个理性的决策解释助手。"
        "输出必须是 JSON，且只包含 explanation, highlights, followups 三个字段。"
        "语气清晰中立，避免绝对化承诺或保证正确的说法。"
    )


def _build_context(request: ExplainRequest) -> str:
    style = request.style.model_dump() if request.style else {}
    payload = {
        "problem": request.problem,
        "options": request.options,
        "facts": request.facts.model_dump(),
        "decision": request.decision.model_dump(),
        "facts_completion": [item.model_dump() for item in request.facts_completion],
        "assumptions": request.assumptions,
        "style": style,
    }
    return "以下是决策上下文（JSON）:\n" + json.dumps(payload, ensure_ascii=False)


def _extract_content(data: Dict[str, Any]) -> Optional[str]:
    try:
        return data["choices"][0]["message"]["content"]
    except Exception:
        return None


def _parse_json(content: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(content)
    except Exception:
        pass

    start = content.find("{")
    end = content.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(content[start : end + 1])
    except Exception:
        return None


def _fallback_explanation(request: ExplainRequest) -> ExplainResponse:
    decision = request.decision
    per_option = decision.score_breakdown.per_option
    best = per_option[0]
    best_contrib = best.contributions

    sorted_contribs = sorted(best_contrib.items(), key=lambda item: item[1], reverse=True)
    top_dims = [f"{dim}({value})" for dim, value in sorted_contribs[:2]]
    gap_text = ""
    if len(per_option) > 1:
        gap = round(per_option[0].score - per_option[1].score, 2)
        gap_text = f"领先第二名约 {gap} 分。"

    top_dims_text = "、".join(top_dims)

    explanation = (
        f"综合权重与评分，{best.option} 得分最高（{best.score}）。"
        f"主要贡献来自 {top_dims_text}。{gap_text}"
    )

    highlights = [
        f"最佳选项：{best.option}（{best.score}）",
        f"主要驱动维度：{top_dims_text}",
    ]

    if request.assumptions:
        highlights.append("存在默认补全的评分，已作为假设纳入计算。")

    followups = [
        "若你补充更准确的评分，结果会更稳健。",
        "是否需要针对某个维度进行敏感性分析？",
    ]

    return ExplainResponse(
        explanation=explanation,
        highlights=highlights,
        followups=followups,
    )
