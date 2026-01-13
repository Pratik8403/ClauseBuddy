def handler(req):
    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": "{\"status\":\"alive\"}"
    }
