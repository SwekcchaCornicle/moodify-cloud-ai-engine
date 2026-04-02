import json

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return cors_response(200, "")

    try:
        body = json.loads(event.get("body") or "{}")
        
        mood        = body.get("mood", "")
        mood_text   = body.get("mood_text", "")
        genres      = body.get("genres", [])
        preferences = body.get("preferences", {})

        # Build your playlist logic here
        # For now returns a working test response
        result = {
            "status": "READY",
            "mood_summary": f"A playlist for feeling {mood}",
            "playlist_name": f"{mood} Vibes",
            "emoji": "🎵",
            "tracks": [
                {"title": "Test Track 1", "artist": "Artist A", "genre": genres[0] if genres else "Pop"},
                {"title": "Test Track 2", "artist": "Artist B", "genre": genres[0] if genres else "Pop"},
            ]
        }

        return cors_response(200, result)

    except Exception as e:
        return cors_response(500, {"error": str(e)})


def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        "body": json.dumps(body) if isinstance(body, dict) else body
    }