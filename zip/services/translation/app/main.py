"""Safe boundary for the optional IndicTrans2 translation provider."""

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field


app = FastAPI(title="Samvidhan AI IndicTrans2 service")
TOKEN = os.getenv("TRANSLATION_SERVICE_TOKEN")
MODEL_PATH = os.getenv("INDICTRANS_MODEL_PATH")


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    sourceLanguage: str
    targetLanguage: str


@app.get('/health')
def health():
    """Report configuration without exposing secrets or enabling inference."""
    return {
        "status": "ok",
        "provider": "IndicTrans2",
        "modelConfigured": bool(MODEL_PATH),
        "translationEnabled": False,
    }


@app.post('/translate')
def translate(request: TranslationRequest, x_internal_token: str | None = Header(default=None)):
    """Reject requests until an approved local model adapter is installed."""
    if TOKEN and x_internal_token != TOKEN:
        raise HTTPException(401, "Invalid internal service token")

    raise HTTPException(
        503,
        "IndicTrans2 model is not configured. No fallback translation is returned.",
    )
