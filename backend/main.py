from http.server import BaseHTTPRequestHandler
import json

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
    
    # 2. Simple Success Response
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'status': 'success', 
            'message': 'Vercel connection is working!',
            'folder_check': 'The backend folder is correctly named.'
        })
    }