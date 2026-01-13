from http.server import BaseHTTPRequestHandler
import json
import os

def handler(request):
    # 1. Handle CORS
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }
    
    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    # 2. Safety Block
    try:
        # TEST 1: Check if API Key exists
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'CRITICAL: GEMINI_API_KEY is missing'})}

        # TEST 2: Import Library
        try:
            from google import genai
        except ImportError as e:
            return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f"Library Error: {str(e)}. Check requirements.txt."})}

        # Initialize Client
        client = genai.Client(api_key=api_key)

        if request.method == 'POST':
            # FIX: Parse Body Safely
            try:
                if request.body:
                    data = json.loads(request.body.decode('utf-8'))
                else:
                    return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Empty request body'})}
            except Exception:
                 return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Invalid JSON body'})}

            legal_text = data.get('legal_text', '')
            user_question = data.get('question', '')

            # CHAT LOGIC
            if user_question:
                chat_prompt = f"Context: {legal_text[:5000]}\n\nQuestion: {user_question}\nAnswer simply."
                response = client.models.generate_content(model='gemini-1.5-flash', contents=chat_prompt)
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'answer': response.text})}

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
            
            return {'statusCode': 200, 'headers': headers, 'body': response.text}

    except Exception as e:
        print(f"Runtime Error: {str(e)}")
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': f"Backend Error: {str(e)}"}) }

    # Handle Browser Visits (GET requests)
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'status': 'API is Online', 'message': 'Use POST request to analyze'})}