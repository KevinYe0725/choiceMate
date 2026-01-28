from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


DimensionKey = Literal["impact", "cost", "risk", "reversibility"]


class Weights(BaseModel):
    model_config = ConfigDict(extra="forbid")

    impact: float
    cost: float
    risk: float
    reversibility: float


class Ratings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    impact: float
    cost: float
    risk: float
    reversibility: float


class RatingsOptional(BaseModel):
    model_config = ConfigDict(extra="forbid")

    impact: Optional[float] = None
    cost: Optional[float] = None
    risk: Optional[float] = None
    reversibility: Optional[float] = None


class Facts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weights: Weights
    option_ratings: Dict[str, Ratings]


class FactsOptionalRatings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weights: Optional[Weights] = None
    option_ratings: Optional[Dict[str, RatingsOptional]] = None


class State(BaseModel):
    model_config = ConfigDict(extra="forbid")

    round: int
    facts: FactsOptionalRatings = Field(default_factory=FactsOptionalRatings)
    draft_meta: Dict[str, Any] = Field(default_factory=dict)


class QuestionnaireNextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    problem: str
    options: List[str]
    state: Optional[State] = None
    last_answer: Optional[Dict[str, Any]] = None


class FactsCompletionItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option: str
    dimension: DimensionKey
    filled_value: float
    source: str


class QuestionnaireNextResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    round: int
    question: Optional[Dict[str, Any]] = None
    state: State
    decision: Optional[Dict[str, Any]] = None
    facts_completion: List[FactsCompletionItem] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)


class DecideRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    problem: str
    options: List[str]
    facts: Facts


class ScoreBreakdownOption(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option: str
    score: float
    contributions: Dict[DimensionKey, float]
    ratings: Ratings


class ScoreBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scale: str
    dimensions: List[DimensionKey]
    weights: Dict[DimensionKey, float]
    per_option: List[ScoreBreakdownOption]


class DecideResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    best_option: str
    score_breakdown: ScoreBreakdown
    assumptions: List[str]
    confidence: str


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user", "assistant"]
    content: str


class Style(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tone: Optional[str] = None
    length: Optional[str] = None


class ExplainRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    problem: str
    options: List[str]
    facts: Facts
    decision: DecideResponse
    facts_completion: List[FactsCompletionItem] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    messages: List[Message] = Field(default_factory=list)
    style: Optional[Style] = None


class ExplainResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    explanation: str
    highlights: List[str]
    followups: List[str]
