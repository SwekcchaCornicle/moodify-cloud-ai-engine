import json
import requests
import base64
import os


# ─────────────────────────────────────────────
# CORS helper
# ─────────────────────────────────────────────
def cors_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        "body": json.dumps(body)
    }


# ─────────────────────────────────────────────
# STEP 1 — Build a rich Spotify search query
#          from ALL form fields the frontend sends
# ─────────────────────────────────────────────
def build_search_query(mood, mood_text, genres, preferences):
    """
    Combines mood + free text + genres + era + language + listener_type
    into a single Spotify /search query string.

    Examples:
      "Happy pop indie 70s-80s hindi gym"
      "Melancholy acoustic sad late night drive"
    """
    parts = []

    # 1. Free-text vibe (most specific — goes first)
    if mood_text and mood_text.strip():
        parts.append(mood_text.strip())

    # 2. Mood keyword → search-friendly term
    MOOD_KEYWORDS = {
        "Happy":      "happy upbeat",
        "Melancholy": "melancholy sad",
        "Energized":  "energetic hype",
        "Calm":       "calm peaceful",
        "Romantic":   "romantic love",
        "Focused":    "focus concentration",
        "Nostalgic":  "nostalgic throwback",
        "Rebellious": "rebellious intense",
    }
    if mood:
        parts.append(MOOD_KEYWORDS.get(mood, mood.lower()))

    # 3. Genres (up to 2 to avoid over-constraining)
    if genres:
        # Map UI genre labels → Spotify-friendly search terms
        GENRE_MAP = {
            "Hip-Hop":    "hip hop",
            "R&B":        "r&b",
            "Lo-fi":      "lofi",
            "Bollywood":  "bollywood",
            "Electronic": "electronic",
            "Classical":  "classical",
            "Folk":       "folk",
            "Jazz":       "jazz",
            "Metal":      "metal",
            "Rock":       "rock",
            "Pop":        "pop",
            "Indie":      "indie",
        }
        for g in genres[:2]:
            parts.append(GENRE_MAP.get(g, g.lower()))

    # 4. Era
    ERA_TERMS = {
        "70s-80s":   "70s 80s",
        "90s-2000s": "90s 2000s",
        "2010s":     "2010s",
        "recent":    "2022 2023",
    }
    era = preferences.get("era", "any")
    if era != "any":
        parts.append(ERA_TERMS.get(era, ""))

    # 5. Language
    LANG_TERMS = {
        "english": "english",
        "hindi":   "hindi",
        "spanish": "spanish",
        "kpop":    "kpop korean",
    }
    language = preferences.get("language", "any")
    if language != "any":
        parts.append(LANG_TERMS.get(language, ""))

    # 6. Listener type
    LISTENER_TERMS = {
        "gym":        "workout",
        "study":      "study focus",
        "party":      "party",
        "audiophile": "acoustic",
    }
    listener_type = preferences.get("listener_type", "casual")
    if listener_type != "casual":
        parts.append(LISTENER_TERMS.get(listener_type, ""))

    # Clean up empty strings and join
    query = " ".join(p for p in parts if p).strip()
    return query or "popular hits"


# ─────────────────────────────────────────────
# STEP 2 — Map all inputs → mood metadata
# ─────────────────────────────────────────────
def map_mood(mood, mood_text, genres, preferences):
    search_query = build_search_query(mood, mood_text, genres, preferences)

    energy_pct  = preferences.get("energy", 60)
    energy_norm = round(energy_pct / 100, 2)   # 0–100 → 0.0–1.0

    return {
        "mood":         mood or "Custom",
        "energy":       energy_norm,
        "search_query": search_query,
        "length":       preferences.get("length", 10),
        "era":          preferences.get("era", "any"),
        "language":     preferences.get("language", "any"),
        "listener_type":preferences.get("listener_type", "casual"),
        "genres":       genres,
    }


# ─────────────────────────────────────────────
# STEP 3 — Get Spotify access token
# ─────────────────────────────────────────────
def get_spotify_token():
    client_id     = os.environ["SPOTIFY_CLIENT_ID"]
    client_secret = os.environ["SPOTIFY_CLIENT_SECRET"]

    b64_auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    print("🔑 [TOKEN] Requesting Spotify access token...")
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {b64_auth}"},
        data={"grant_type": "client_credentials"}
    )
    print(f"🔑 [TOKEN] Status: {response.status_code}")

    if response.status_code != 200:
        raise Exception(f"Spotify token error: {response.text}")

    print("🔑 [TOKEN] ✅ Token obtained successfully")
    return response.json()["access_token"]


# ─────────────────────────────────────────────
# STEP 4 — Search Spotify and build playlist
# ─────────────────────────────────────────────
def build_playlist(mapped_data, token):
    search_query = mapped_data["search_query"]
    limit        = min(mapped_data.get("length", 10), 50)  # Spotify max = 50

    print(f"🎵 [SPOTIFY] Search query : '{search_query}'")
    print(f"🎵 [SPOTIFY] Track limit  : {limit}")
    print(f"🎵 [SPOTIFY] Full mapped  : {json.dumps(mapped_data)}")

    response = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {token}"},
        params={
            "q":     search_query,
            "type":  "track",
            "limit": limit,
        }
    )

    print(f"🎵 [SPOTIFY] Response status: {response.status_code}")

    if response.status_code != 200:
        raise Exception(f"Spotify search error {response.status_code}: {response.text}")

    data   = response.json()
    items  = data.get("tracks", {}).get("items", [])
    print(f"🎵 [SPOTIFY] Tracks returned: {len(items)}")

    tracks = []
    for t in items:
        track = {
            "name":        t["name"],
            "artist":      t["artists"][0]["name"],
            "album":       t.get("album", {}).get("name", ""),
            "duration":    ms_to_mmss(t.get("duration_ms", 0)),
            "spotify_url": t["external_urls"]["spotify"],
            "image_url":   (t.get("album", {}).get("images") or [{}])[0].get("url", ""),
            "id":          t["id"],
        }
        tracks.append(track)
        print(f"   🎶 {track['name']} — {track['artist']}")

    playlist_name = f"{mapped_data['mood']} Vibes"
    if mapped_data.get("era") and mapped_data["era"] != "any":
        playlist_name += f" · {mapped_data['era']}"

    return {
        "status":        "READY",
        "playlist_name": playlist_name,
        "playlist_desc": f"A {mapped_data['mood'].lower()} playlist curated for your vibe.",
        "emoji":         MOOD_EMOJI.get(mapped_data["mood"], "🎵"),
        "mood_summary":  f"{mapped_data['mood']} · {mapped_data['listener_type']}",
        "tags":          build_tags(mapped_data),
        "tracks":        tracks,
        "track_count":   len(tracks),
        "generated_at":  None,  # add datetime if needed
    }


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
MOOD_EMOJI = {
    "Happy":      "😄",
    "Melancholy": "🌧️",
    "Energized":  "⚡",
    "Calm":       "🌊",
    "Romantic":   "🌹",
    "Focused":    "🎯",
    "Nostalgic":  "🎞️",
    "Rebellious": "🔥",
    "Custom":     "🎵",
}

def ms_to_mmss(ms):
    total_s = ms // 1000
    return f"{total_s // 60}:{str(total_s % 60).zfill(2)}"

def build_tags(mapped):
    tags = []
    if mapped.get("mood"):        tags.append(mapped["mood"])
    if mapped.get("era") != "any":    tags.append(mapped["era"])
    if mapped.get("language") != "any": tags.append(mapped["language"].capitalize())
    if mapped.get("listener_type") != "casual": tags.append(mapped["listener_type"].capitalize())
    for g in (mapped.get("genres") or [])[:2]:
        tags.append(g)
    return tags


# ─────────────────────────────────────────────
# Lambda entry point
# ─────────────────────────────────────────────
def lambda_handler(event, context):
    print("=" * 60)
    print("🚀 [HANDLER] Lambda invoked")
    print(f"📥 [HANDLER] Raw event: {json.dumps(event)}")
   

    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        print("✅ [HANDLER] OPTIONS preflight — returning 200")
        return cors_response(200, "")

    try:
        # ── STEP 1: Parse body ─────────────────────────────────
        raw_body = event.get("body") or "{}"
        body     = json.loads(raw_body)
        print(f"📦 [STEP 1] Parsed body: {json.dumps(body)}")

        mood          = body.get("mood", "")
        mood_text     = body.get("mood_text", "")
        genres        = body.get("genres", [])
        preferences   = body.get("preferences", {})

        print(f"📦 [STEP 1] mood        = '{mood}'")
        print(f"📦 [STEP 1] mood_text   = '{mood_text}'")
        print(f"📦 [STEP 1] genres      = {genres}")
        print(f"📦 [STEP 1] preferences = {json.dumps(preferences)}")

        # ── STEP 2: Map to search params ───────────────────────
        print("-" * 40)
        print("🧠 [STEP 2] Mapping mood → search params")
        mapped = map_mood(mood, mood_text, genres, preferences)
        print(f"🧠 [STEP 2] Mapped result: {json.dumps(mapped)}")

        # ── STEP 3: Get Spotify token ──────────────────────────
        print("-" * 40)
        print("🔑 [STEP 3] Getting Spotify token")
        token = get_spotify_token()

        # ── STEP 4: Search Spotify ─────────────────────────────
        print("-" * 40)
        print("🎵 [STEP 4] Searching Spotify")
        playlist = build_playlist(mapped, token)
        print(f"🎵 [STEP 4] Playlist built: '{playlist['playlist_name']}' with {playlist['track_count']} tracks")

        # ── STEP 5: Build final response ───────────────────────
        print("-" * 40)
        final_response = {
            **playlist,           # status, playlist_name, tracks, etc.
            "mapped": mapped,     # debug: what was mapped
        }
        print(f"✅ [STEP 5] Final response keys: {list(final_response.keys())}")
        print(f"✅ [STEP 5] Track count: {playlist['track_count']}")
        print("=" * 60)

        return cors_response(200, final_response)

    except Exception as e:
        import traceback
        print(f"❌ [ERROR] {str(e)}")
        print(traceback.format_exc())
        return cors_response(500, {"error": str(e)})