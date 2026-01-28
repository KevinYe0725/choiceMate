from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from pydantic import ValidationError

from core.decision import decide
from domain.models import (
    DimensionKey,
    Facts,
    FactsCompletionItem,
    FactsOptionalRatings,
    QuestionnaireNextRequest,
    QuestionnaireNextResponse,
    Ratings,
    RatingsOptional,
    State,
    Weights,
)


DIMENSIONS: List[DimensionKey] = ["impact", "cost", "risk", "reversibility"]


def next_step(request: QuestionnaireNextRequest) -> QuestionnaireNextResponse:
    problem = (request.problem or "").strip()
    if not problem:
        raise ValueError("problem 不能为空")

    options = _clean_options(request.options)
    if len(options) < 2:
        raise ValueError("options 至少需要两个非空选项")

    if request.state is None:
        state = State(round=1, facts=FactsOptionalRatings(), draft_meta={})
        question = _weights_sliders_question()
        return QuestionnaireNextResponse(
            round=1,
            question=question,
            state=state,
            decision=None,
            facts_completion=[],
            assumptions=[],
        )

    current_round = request.state.round
    if current_round == 1:
        weights = _extract_weights(request.last_answer)
        state = State(
            round=2,
            facts=FactsOptionalRatings(weights=weights, option_ratings=request.state.facts.option_ratings),
            draft_meta=request.state.draft_meta or {},
        )
        question = _ratings_matrix_question(options)
        return QuestionnaireNextResponse(
            round=2,
            question=question,
            state=state,
            decision=None,
            facts_completion=[],
            assumptions=[],
        )

    if current_round == 2:
        if request.state.facts.weights is None:
            raise ValueError("round=2 需要已有 weights")
        option_ratings_input = _extract_option_ratings(request.last_answer)
        merged = _merge_option_ratings(request.state.facts.option_ratings, option_ratings_input)
        completed_ratings, facts_completion, assumptions = _complete_ratings(options, merged)

        facts = Facts(weights=request.state.facts.weights, option_ratings=completed_ratings)
        decision = decide(facts, options)

        state_ratings_optional = {
            option: RatingsOptional(**ratings.model_dump())
            for option, ratings in completed_ratings.items()
        }

        state = State(
            round=3,
            facts=FactsOptionalRatings(weights=request.state.facts.weights, option_ratings=state_ratings_optional),
            draft_meta=request.state.draft_meta or {},
        )
        return QuestionnaireNextResponse(
            round=3,
            question=None,
            state=state,
            decision=decision.model_dump(),
            facts_completion=facts_completion,
            assumptions=assumptions,
        )

    raise ValueError("round 不合法")


def _clean_options(options: List[str]) -> List[str]:
    cleaned = []
    for option in options:
        if not isinstance(option, str):
            continue
        value = option.strip()
        if value:
            cleaned.append(value)
    return cleaned


def _weights_sliders_question() -> Dict[str, Any]:
    return {
        "type": "weights_sliders",
        "prompt": "请调整你对各维度的重视程度（1-5）",
        "dimensions": [
            {"key": "impact", "label": "长期收益/成长", "min": 1, "max": 5, "default": 3},
            {"key": "cost", "label": "成本（时间/金钱/精力）", "min": 1, "max": 5, "default": 2},
            {"key": "risk", "label": "风险（失败/后悔）", "min": 1, "max": 5, "default": 2},
            {"key": "reversibility", "label": "可逆性（能否回头）", "min": 1, "max": 5, "default": 1},
        ],
    }


def _ratings_matrix_question(options: List[str]) -> Dict[str, Any]:
    defaults = {option: {dim: 3 for dim in DIMENSIONS} for option in options}
    return {
        "type": "ratings_matrix",
        "prompt": "请为每个选项在各维度打分（1-5），未知可留空",
        "options": options,
        "dimensions": [
            {"key": "impact", "label": "长期收益/成长（越高越好）"},
            {"key": "cost", "label": "成本（越高=越贵/越累）"},
            {"key": "risk", "label": "风险（越高=越危险）"},
            {"key": "reversibility", "label": "可逆性（越高=越能回头）"},
        ],
        "defaults": defaults,
    }


def _extract_weights(last_answer: Optional[Dict[str, Any]]) -> Weights:
    if not last_answer or "weights" not in last_answer:
        raise ValueError("round=1 需要提交 weights")
    weights_raw = last_answer.get("weights")
    if not isinstance(weights_raw, dict):
        raise ValueError("weights 格式不正确")
    try:
        return Weights.model_validate(weights_raw)
    except ValidationError as exc:
        raise ValueError("weights 校验失败") from exc


def _extract_option_ratings(last_answer: Optional[Dict[str, Any]]) -> Dict[str, Dict[str, Optional[float]]]:
    if not last_answer or "option_ratings" not in last_answer:
        raise ValueError("round=2 需要提交 option_ratings")
    option_ratings_raw = last_answer.get("option_ratings")
    if not isinstance(option_ratings_raw, dict):
        raise ValueError("option_ratings 格式不正确")

    normalized: Dict[str, Dict[str, Optional[float]]] = {}
    for option, ratings in option_ratings_raw.items():
        if not isinstance(ratings, dict):
            raise ValueError("option_ratings 选项内容必须是对象")
        normalized[option] = {}
        for dimension in DIMENSIONS:
            value = ratings.get(dimension)
            if value is None:
                normalized[option][dimension] = None
                continue
            if not isinstance(value, (int, float)):
                raise ValueError("评分必须是数字或 null")
            normalized[option][dimension] = float(value)
    return normalized


def _merge_option_ratings(
    existing: Optional[Dict[str, RatingsOptional]],
    incoming: Dict[str, Dict[str, Optional[float]]],
) -> Dict[str, Dict[str, Optional[float]]]:
    merged: Dict[str, Dict[str, Optional[float]]] = {}
    if existing:
        for option, ratings_model in existing.items():
            merged[option] = ratings_model.model_dump()
    for option, ratings in incoming.items():
        merged.setdefault(option, {})
        merged[option].update(ratings)
    return merged


def _complete_ratings(
    options: List[str],
    merged: Dict[str, Dict[str, Optional[float]]],
) -> Tuple[Dict[str, Ratings], List[FactsCompletionItem], List[str]]:
    completed: Dict[str, Ratings] = {}
    facts_completion: List[FactsCompletionItem] = []
    assumptions: List[str] = []

    for option in options:
        filled: Dict[str, float] = {}
        for dimension in DIMENSIONS:
            value = merged.get(option, {}).get(dimension)
            if value is None:
                filled_value = 3.0
                filled[dimension] = filled_value
                facts_completion.append(
                    FactsCompletionItem(
                        option=option,
                        dimension=dimension,
                        filled_value=filled_value,
                        source="default",
                    )
                )
                assumptions.append(f"你未填写「{option}」的 {dimension}，我暂以中性值 3 作为假设。")
            else:
                filled[dimension] = float(value)
        completed[option] = Ratings.model_validate(filled)

    return completed, facts_completion, assumptions
