import json
import os
from google import genai

# Vercel initializes the handler when the extension sends a request
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

    # 2. Get API Key from Vercel Environment Variables
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'GEMINI_API_KEY is missing in Vercel settings.'}),
            'headers': {'Access-Control-Allow-Origin': '*'}
        }

    # 3. Initialize the New GenAI Client
    client = genai.Client(api_key=api_key)

    # 4. Process the Legal Analysis Request
    if request.method == 'POST':
        try:
            # Parse the text sent from sidepanel.js
            data = json.loads(request.data)
            legal_text = data.get('legal_text', '')

            # System instructions help the AI return clean JSON
            prompt = f"""
            Analyze these Terms and Conditions. Return ONLY a JSON object with:
            1. 'summary': 2 sentences maximum.
            2. 'critical': count of high risks (e.g. data selling).
            3. 'concerns': count of moderate risks (e.g. forced arbitration).
            4. 'safe': count of user-friendly clauses.
            
            Text to analyze: {legal_text[:10000]}
            """

            # Using the official google-genai generation syntax
            response = client.models.generate_content(
                model='gemini-2.0-flash', 
                contents=prompt
            )
            
            # The AI's JSON output is in response.text
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': response.text
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)})
            }

    return {'statusCode': 405, 'body': 'Method Not Allowed'}