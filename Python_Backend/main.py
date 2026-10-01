from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from physics_engine import GROUPS, VARIABLES, Physics, PhysicsCalculator


BASE_DIR = Path(__file__).resolve().parent

CONSISTENCY_TOL = 1e-2

app = FastAPI(title="Physics Solver")


class SolveRequest(BaseModel):
    values: dict[str, float] = Field(default_factory=dict)


class TargetRequest(SolveRequest):
    target: str


def _calculator(values: dict, drop: Optional[str] = None) -> PhysicsCalculator:
    values = {k: v for k, v in values.items() if k != drop}
    unknown = [k for k in values if k not in Physics.FIELDS]
    if unknown:
        raise HTTPException(status_code=422,
                            detail=f"Unknown variables: {', '.join(unknown)}")
    try:
        return PhysicsCalculator(Physics(**values))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# ── API ──────────────────────────────────────────────────
@app.get("/api/variables")
def variables():
    return {"groups": GROUPS, "variables": VARIABLES}


@app.post("/api/calculate")
def calculate(req: TargetRequest):
    if req.target not in Physics.FIELDS:
        raise HTTPException(status_code=422,
                            detail=f"Variable '{req.target}' not found.")
    calc = _calculator(req.values, drop=req.target)
    return calc.report_target(req.target, rel_tol=CONSISTENCY_TOL)


@app.post("/api/solve")
def solve(req: SolveRequest):
    calc = _calculator(req.values)
    return calc.report_all(rel_tol=CONSISTENCY_TOL)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(BASE_DIR / "index.html")