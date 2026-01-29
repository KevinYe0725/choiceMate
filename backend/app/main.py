from __future__ import annotations
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from adapters.llm_client import generate_explanation
from core.decision import decide
from core.questionnaire import next_step
from domain.models import (
    DecideRequest,
    DecideResponse,
    ExplainRequest,
    ExplainResponse,
    QuestionnaireNextRequest,
    QuestionnaireNextResponse,
)


load_dotenv()

app = FastAPI(title="ChoiceMate API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],   # 包含 OPTIONS/POST/GET 等
    allow_headers=["*"],   # 包含 Content-Type 等
)

@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}

#核心对话接口
@app.post("/questionnaire/next", response_model=QuestionnaireNextResponse)
async def questionnaire_next(payload: QuestionnaireNextRequest) -> QuestionnaireNextResponse:
    try:
        return next_step(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

#决策模型接口
@app.post("/decide", response_model=DecideResponse)
async def decide_endpoint(payload: DecideRequest) -> DecideResponse:
    problem = (payload.problem or "").strip()
    if not problem:
        raise HTTPException(status_code=400, detail="problem 不能为空")

    options = _clean_options(payload.options)
    if len(options) < 2:
        raise HTTPException(status_code=400, detail="options 至少需要两个非空选项")

    missing = [option for option in options if option not in payload.facts.option_ratings]
    if missing:
        raise HTTPException(status_code=400, detail="option_ratings 缺少选项评分")

    return decide(payload.facts, options)

#解释接口
@app.post("/explain", response_model=ExplainResponse)
async def explain_endpoint(payload: ExplainRequest) -> ExplainResponse:
    return generate_explanation(payload)


def _clean_options(options: List[str]) -> List[str]:
    cleaned = []
    for option in options:
        if not isinstance(option, str):
            continue
        value = option.strip()
        if value:
            cleaned.append(value)
    return cleaned
