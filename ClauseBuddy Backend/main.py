import json
import os
from google import genai

def handler(request):
    # 1. Handle CORS (Essential for Chrome Extensions)
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }

    # 2. Safety Block: Catches crashes and tells you WHY it failed
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {
                'statusCode': 500, 
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'CRITICAL: GEMINI_API_KEY is missing in Vercel Settings'})
            }

        # Initialize Client INSIDE the try block
        client = genai.Client(api_key=api_key)

        if request.method == 'POST':
            data = json.loads(request.data)
            legal_text = data.get('legal_text', '')
            user_question = data.get('question', '')

            # CHAT LOGIC
            if user_question:
                # Using 'gemini-1.5-flash' because it is faster and more stable than 2.0
                chat_prompt = f"Context: {legal_text[:5000]}\n\nQuestion: {user_question}\nAnswer simply."
                response = client.models.generate_content(model='gemini-1.5-flash', contents=chat_prompt)
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'answer': response.text})
                }

            # ANALYSIS LOGIC
            prompt = f"""
            Analyze these Terms. Return valid JSON only.
            Format: {{ "summary": "text", "critical": 0, "concerns": 0, "safe": 0 }}
            Text: {legal_text[:10000]}
            """
            
            response = client.models.generate_content(
                model='gemini-1.5-flash', 
                contents=prompt,
                config={'response_mime_type': 'application/json'}
            )
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': response.text
            }

    except Exception as e:
        # This catches "Model not found" or "Invalid Key" errors
        print(f"Runtime Error: {str(e)}")
        return {
            'statusCode': 500, 
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f"Backend Error: {str(e)}"})
        }

    return {'statusCode': 405, 'body': 'Method Not Allowed'}