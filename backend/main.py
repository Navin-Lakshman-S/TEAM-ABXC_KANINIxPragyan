"""
Smart Patient Triage — FastAPI Application
---------------------------------------------
Brings together the AI engine, services, and API routes into a
single ASGI application with CORS, WebSocket support, and
automatic OpenAPI docs.
"""

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router as triage_router
from backend.services.wearable_sim import get_or_create_stream, remove_stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — preload the ML model so first request isn't slow
    from backend.ai_engine import predictor
    predictor._load()
    print("Triage model loaded and ready.")
    yield
    # Shutdown
    print("Shutting down.")


app = FastAPI(
    title="Vigil — Smart Patient Triage System",
    description=(
        "AI‑powered patient risk classification, department recommendation, "
        "explainability, digital twin simulation, and resource‑aware triage."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST routes
app.include_router(triage_router, prefix="/api")


# ── WebSocket: Wearable vitals stream ────────────────────────────────
@app.websocket("/ws/vitals/{patient_id}")
async def vitals_ws(websocket: WebSocket, patient_id: str):
    """
    Real‑time smartwatch vitals feed.

    Query params (optional):
      - base_hr: baseline heart rate (default 75)
      - base_spo2: baseline SpO2 (default 97)
      - risk_level: Low / Medium / High (affects deterioration rate)
    """
    await websocket.accept()

    params = websocket.query_params
    base_hr = float(params.get("base_hr", 75))
    base_spo2 = float(params.get("base_spo2", 97))
    risk_level = params.get("risk_level", "Low")

    stream = get_or_create_stream(
        patient_id=patient_id,
        base_hr=base_hr,
        base_spo2=base_spo2,
        risk_level=risk_level,
    )

    try:
        while True:
            reading = stream.next_reading()
            await websocket.send_text(json.dumps(reading))
            await asyncio.sleep(2)  # one reading every 2 seconds
    except WebSocketDisconnect:
        remove_stream(patient_id)
    except Exception:
        remove_stream(patient_id)


# ── Health check ──────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Vigil"}
