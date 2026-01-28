from fastapi.testclient import TestClient

from app.main import app


def test_healthz():
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_questionnaire_flow():
    client = TestClient(app)

    payload = {"problem": "去哪工作", "options": ["A公司", "B公司"]}
    response = client.post("/questionnaire/next", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["round"] == 1

    state = data["state"]
    payload = {
        "problem": "去哪工作",
        "options": ["A公司", "B公司"],
        "state": state,
        "last_answer": {"weights": {"impact": 4, "cost": 2, "risk": 3, "reversibility": 1}},
    }
    response = client.post("/questionnaire/next", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["round"] == 2

    state = data["state"]
    payload = {
        "problem": "去哪工作",
        "options": ["A公司", "B公司"],
        "state": state,
        "last_answer": {
            "option_ratings": {
                "A公司": {"impact": 4, "cost": None, "risk": 2, "reversibility": 3},
                "B公司": {"impact": 3, "cost": 2, "risk": 4, "reversibility": 2},
            }
        },
    }
    response = client.post("/questionnaire/next", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["round"] == 3
    assert data["decision"] is not None
    assert data["facts_completion"]
    assert data["assumptions"]
