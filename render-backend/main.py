from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


@app.post("/analyze")
async def analyze(req: Request):
    body = await req.json()
    legal_text = body.get("legal_text", "")
    question = body.get("question", "")

    if not legal_text:
        return {"error": "No legal_text provided"}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "Missing GEMINI_API_KEY"}

    if question:
        prompt = f"Context:\n{legal_text[:6000]}\n\nQuestion: {question}\nAnswer clearly."
    else:
        prompt = f"""
Analyze the following legal text.

Return ONLY valid JSON:
{{
  "summary": "short human readable summary",
  "critical": number,
  "concerns": number,
  "safe": number
}}

Text:
{legal_text[:10000]}
"""

    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    r = requests.post(
        f"{GEMINI_URL}?key={api_key}",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )

    data = r.json()

    if "candidates" not in data:
        return {"error": "Gemini API failed", "raw": data}

    output = data["candidates"][0]["content"]["parts"][0]["text"]

    return output
