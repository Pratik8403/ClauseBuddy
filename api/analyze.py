import json
import os
import requests

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


def handler(req):
    # ---- CORS ----
    if req.method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        }

    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {
                "statusCode": 500,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "GEMINI_API_KEY missing on Vercel"}),
            }

        # Parse request
        body = json.loads(req.body or "{}")
        legal_text = body.get("legal_text", "")
        question = body.get("question", "")

        if not legal_text:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "No legal_text provided"}),
            }

        # Chat mode
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

        headers = {"Content-Type": "application/json"}

        response = requests.post(
            f"{GEMINI_URL}?key={api_key}",
            headers=headers,
            json=payload,
            timeout=60,
        )

        data = response.json()

        if "candidates" not in data:
            return {
                "statusCode": 500,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Gemini API failed", "raw": data}),
            }

        output = data["candidates"][0]["content"]["parts"][0]["text"]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": output,
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)}),
        }
