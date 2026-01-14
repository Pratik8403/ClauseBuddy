from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
import os
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

# Input validation model
class AnalyzeRequest(BaseModel):
    legal_text: str
    question: str = ""
    
    @validator('legal_text')
    def validate_legal_text(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("legal_text cannot be empty")
        if len(v) > 50000:  # Limit to 50k characters
            raise ValueError("legal_text exceeds maximum length of 50,000 characters")
        return v

# Configure requests session with retry logic
def get_session_with_retry():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    return session

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        legal_text = req.legal_text
        question = req.question

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Service configuration error")

        if question:
            prompt = f"Context:\n{legal_text[:6000]}\n\nQuestion: {question}\nAnswer clearly and concisely."
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

        session = get_session_with_retry()
        
        try:
            r = session.post(
                f"{GEMINI_URL}?key={api_key}",
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=90,  # Increased timeout for better reliability
            )
            r.raise_for_status()
        except requests.exceptions.Timeout:
            raise HTTPException(status_code=504, detail="AI service timed out. Please try again.")
        except requests.exceptions.ConnectionError:
            raise HTTPException(status_code=503, detail="Unable to reach AI service. Please try again later.")
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable")

        try:
            data = r.json()
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="Invalid response from AI service")

        if "candidates" not in data or not data["candidates"]:
            error_msg = "AI service returned no results"
            if "error" in data:
                # Don't expose internal error details
                error_msg = "AI service error - please try again"
            raise HTTPException(status_code=502, detail=error_msg)

        output = data["candidates"][0]["content"]["parts"][0]["text"]

        # For analysis requests, ensure valid JSON response
        if not question:
            try:
                # Clean markdown code blocks if present
                if output.startswith("```json"):
                    output = output.split("```json")[1].split("```")[0].strip()
                elif output.startswith("```"):
                    output = output.split("```")[1].split("```")[0].strip()
                    
                json_response = json.loads(output)
                return json_response
            except json.JSONDecodeError:
                raise HTTPException(status_code=502, detail="AI returned invalid format")
        
        return output

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the error internally but don't expose to user
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")
