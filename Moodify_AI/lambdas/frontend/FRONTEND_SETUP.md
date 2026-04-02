# Moodify Frontend — Setup, Wiring & Deployment Guide

## Your Folder Structure (after this setup)

```
Moodify_AI/
├── lambdas/
│   ├── frontend/                     ← React app lives HERE
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   ├── .env.example              ← copy to .env, add API URL
│   │   ├── .env                      ← gitignored, has real API URL
│   │   └── src/
│   │       ├── main.jsx              ← React mount point
│   │       ├── App.jsx               ← root, 3 screens
│   │       ├── index.css             ← all styles
│   │       ├── api/
│   │       │   └── moodify.js        ← POST + polling logic
│   │       ├── hooks/
│   │       │   └── useMoodify.js     ← all state + business logic
│   │       └── components/
│   │           ├── MoodSelector.jsx  ← mood buttons + genres
│   │           ├── PreferencesForm.jsx ← dropdowns + slider
│   │           ├── LoadingScreen.jsx ← animated loader
│   │           └── PlaylistResult.jsx ← tracklist display
│   │
│   ├── mood_analyzer/
│   │   └── mood_analyzer.py          ← Lambda 1 (Claude API)
│   │
│   └── playlist_builder/
│       └── playlist_builder.py       ← Lambda 2 (Spotify API)
│
├── app.py                            ← CDK entry
├── moodify_repo_stack.py             ← CDK stack
└── cdk.json
```

---

## How the Form Data Flows to Lambda

```
User fills form in React
        │
        │  User clicks "Generate My Playlist"
        ▼
useMoodify.js → generate()
        │
        │  Builds this JSON object:
        │  {
        │    "mood":      "Happy",
        │    "mood_text": "sunny morning run",
        │    "genres":    ["Pop", "Indie"],
        │    "preferences": {
        │      "length":        20,
        │      "era":           "any",
        │      "language":      "any",
        │      "listener_type": "gym",
        │      "energy":        80
        │    }
        │  }
        ▼
api/moodify.js → generatePlaylist()
        │
        │  POST https://YOUR_API.execute-api.../prod/playlist
        │  Body: the JSON above
        ▼
API Gateway → api_response Lambda
        │
        │  sync invoke
        ▼
mood_analyzer Lambda
        │  ├── reads mood, mood_text, genres, preferences from event.body
        │  ├── calls Claude API → gets Spotify seed params
        │  ├── writes PENDING to DynamoDB
        │  └── async invokes playlist_builder
        │
        │  Returns: { session_id, status: "PROCESSING" }
        ▼
React polls GET /playlist/{session_id} every 2s
        │
        ▼
playlist_builder Lambda (running async)
        │  ├── calls Spotify /recommendations with Claude's seed params
        │  ├── updates DynamoDB → status: READY, tracks: [...]
        │  └── caches to S3
        ▼
Poll returns { status: "READY", tracks: [...] }
        │
        ▼
PlaylistResult.jsx renders the playlist
```

---

## Step 1 — Install Node.js (if not installed)

```
Download from: https://nodejs.org  (v18 or v20 LTS)
```

Verify:
```cmd
node --version
npm --version
```

---

## Step 2 — Install React dependencies

Open terminal in VS Code and navigate INTO the frontend folder:

```cmd
cd C:\Users\singh\OneDrive\Desktop\Moodify\Moodify_AI\lambdas\frontend

npm install
```

This creates `node_modules/` and installs React + Vite.

---

## Step 3 — Set the API URL (after cdk deploy)

```cmd
# In lambdas/frontend/
copy .env.example .env
```

Open `.env` and replace the URL:

```
VITE_API_URL=https://abc123def.execute-api.ap-south-1.amazonaws.com/prod
```

Get this URL from CDK output after running `cdk deploy`.

---

## Step 4 — Run locally (development)

```cmd
# Still in lambdas/frontend/
npm run dev
```

Opens at: http://localhost:3000

In dev mode, the form works but needs the real API URL in `.env`.
The debug panel (bottom of form) shows exactly what JSON will be sent to Lambda.

---

## Step 5 — Build for production

```cmd
npm run build
```

Creates: `lambdas/frontend/dist/` folder with static HTML/CSS/JS.

---

## Step 6 — Deploy frontend to S3 (after cdk deploy)

```cmd
# Get bucket name from CDK output: MoodifyStack.FrontendBucket
aws s3 sync dist/ s3://YOUR_FRONTEND_BUCKET_NAME/ --delete

# Invalidate CloudFront so users see new build
aws cloudfront create-invalidation ^
  --distribution-id YOUR_CLOUDFRONT_DIST_ID ^
  --paths "/*"
```

---

## Where each user input goes in the Lambda payload

| UI Element              | Form field                   | Lambda receives               |
|-------------------------|------------------------------|-------------------------------|
| Mood button             | `form.mood`                  | `body["mood"]`                |
| Free text box           | `form.mood_text`             | `body["mood_text"]`           |
| Genre chips             | `form.genres`                | `body["genres"]` (array)      |
| Playlist Length dropdown| `form.preferences.length`    | `body["preferences"]["length"]`|
| Era dropdown            | `form.preferences.era`       | `body["preferences"]["era"]`  |
| Language dropdown       | `form.preferences.language`  | `body["preferences"]["language"]`|
| Listener Type dropdown  | `form.preferences.listener_type` | `body["preferences"]["listener_type"]`|
| Energy slider           | `form.preferences.energy`    | `body["preferences"]["energy"]`|

---

## Reading the form data in mood_analyzer.py

```python
def lambda_handler(event, context):
    # API Gateway sends body as a JSON string
    body = json.loads(event["body"])

    # These match exactly what the React form sends
    mood          = body.get("mood", "")           # "Happy"
    mood_text     = body.get("mood_text", "")      # "sunny morning run"
    genres        = body.get("genres", [])          # ["Pop", "Indie"]
    preferences   = body.get("preferences", {})

    length        = preferences.get("length", 20)
    era           = preferences.get("era", "any")
    language      = preferences.get("language", "any")
    listener_type = preferences.get("listener_type", "casual")
    energy        = preferences.get("energy", 60)
```

---

## Common Windows Issues

| Problem | Fix |
|---------|-----|
| `npm: command not found` | Install Node.js from nodejs.org |
| `EACCES permission error` | Run terminal as Administrator |
| CORS error in browser | Make sure VITE_API_URL is set in .env |
| Blank page after build | Check that `index.html` has `<div id="root">` |
| API call fails locally | Add your API Gateway URL to .env, run `npm run dev` again |
