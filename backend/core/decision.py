from __future__ import annotations

from typing import Dict, List

from domain.models import DimensionKey, Facts, DecideResponse


DIMENSIONS: List[DimensionKey] = ["impact", "cost", "risk", "reversibility"]
NEGATIVE_DIMENSIONS = {"cost", "risk"}


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def normalize_weights(weights: Dict[DimensionKey, float]) -> Dict[DimensionKey, float]:
    clamped = {key: clamp(float(value), 1.0, 5.0) for key, value in weights.items()}
    total = sum(clamped.values())
    if total <= 0:
        return {key: 1.0 / len(clamped) for key in clamped}
    return {key: value / total for key, value in clamped.items()}


def rating_to_utility_scaled(dimension: DimensionKey, rating: float) -> float:
    rating = clamp(float(rating), 1.0, 5.0)
    if dimension in NEGATIVE_DIMENSIONS:
        rating = 6.0 - rating
    return (rating - 1.0) / 4.0 * 100.0


def decide(facts: Facts, options: List[str]) -> DecideResponse:
    weights = normalize_weights(facts.weights.model_dump())

    per_option = []
    for option in options:
        ratings_model = facts.option_ratings[option]
        ratings = ratings_model.model_dump()
        contributions: Dict[DimensionKey, float] = {}
        for dimension in DIMENSIONS:
            utility = rating_to_utility_scaled(dimension, ratings[dimension])
            contribution = weights[dimension] * utility
            contributions[dimension] = round(contribution, 2)
        score = round(sum(contributions.values()), 2)
        per_option.append(
            {
                "option": option,
                "score": score,
                "contributions": contributions,
                "ratings": ratings_model,
            }
        )

    per_option_sorted = sorted(per_option, key=lambda item: item["score"], reverse=True)
    best_option = per_option_sorted[0]["option"]

    confidence = _confidence_from_gap(per_option_sorted)

    response = {
        "best_option": best_option,
        "score_breakdown": {
            "scale": "0-100",
            "dimensions": DIMENSIONS,
            "weights": {key: round(value, 4) for key, value in weights.items()},
            "per_option": per_option_sorted,
        },
        "assumptions": [],
        "confidence": confidence,
    }
    return DecideResponse.model_validate(response)


def _confidence_from_gap(per_option_sorted: List[Dict[str, float]]) -> str:
    if len(per_option_sorted) < 2:
        return "high"
    gap = per_option_sorted[0]["score"] - per_option_sorted[1]["score"]
    if gap >= 12:
        return "high"
    if gap >= 6:
        return "medium"
    return "low"
