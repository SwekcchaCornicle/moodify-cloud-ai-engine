/**
 * App.jsx  –  Root component
 * ─────────────────────────────────────────────────────────────────
 * Three screens controlled by `phase`:
 *   "input"   → MoodSelector + PreferencesForm + Generate button
 *   "loading" → LoadingScreen (polls Lambda chain)
 *   "result"  → PlaylistResult
 *
 * ALL business logic + API calls live in useMoodify hook.
 * This file only handles layout and screen switching.
 */

import { useMoodify }       from "./hooks/useMoodify";
import MoodSelector         from "./components/MoodSelector";
import PreferencesForm      from "./components/PreferencesForm";
import LoadingScreen        from "./components/LoadingScreen";
import PlaylistResult       from "./components/PlaylistResult";

export default function App() {
  const {
    form,
    setMood, setMoodText, setPrefs, toggleGenre,
    phase, loadMsg, playlist, error,
    generate, reset,
  } = useMoodify();

  return (
    <div className="app-shell">
      {/* ── Animated background blobs ───────────────────────── */}
      <div className="blobs" aria-hidden="true">
        <div className="blob blob-purple" />
        <div className="blob blob-green"  />
        <div className="blob blob-pink"   />
      </div>

      {/* ── Page wrapper ────────────────────────────────────── */}
      <main className="page">

        {/* Header — always visible */}
        <header className="site-header">
          <h1 className="site-logo">Moodify</h1>
          <p className="site-tagline">
            AI playlists that feel exactly how you do
            <span className="tagline-stack"> · Claude × Spotify × AWS Lambda</span>
          </p>
        </header>

        {/* ── INPUT SCREEN ─────────────────────────────────── */}
        {phase === "input" && (
          <div className="input-screen">
            <MoodSelector
              mood={form.mood}
              moodText={form.mood_text}
              genres={form.genres}
              setMood={setMood}
              setMoodText={setMoodText}
              toggleGenre={toggleGenre}
            />

            <PreferencesForm
              preferences={form.preferences}
              setPrefs={setPrefs}
            />

            {error && (
              <p className="error-banner" role="alert">{error}</p>
            )}

            <button
              className="btn-generate"
              onClick={generate}
              disabled={phase === "loading"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              Generate My Playlist
            </button>

            {/* Debug: show what will be sent to Lambda */}
            {import.meta.env.DEV && (
              <details className="debug-panel">
                <summary>🔧 Payload preview (dev only)</summary>
                <pre>{JSON.stringify({
                  mood:        form.mood,
                  mood_text:   form.mood_text,
                  genres:      form.genres,
                  preferences: form.preferences,
                }, null, 2)}</pre>
              </details>
            )}
          </div>
        )}

        {/* ── LOADING SCREEN ───────────────────────────────── */}
        {phase === "loading" && (
          <LoadingScreen message={loadMsg} />
        )}

        {/* ── RESULT SCREEN ────────────────────────────────── */}
        {phase === "result" && playlist && (
          <PlaylistResult
            playlist={playlist}
            onReset={reset}
          />
        )}

      </main>
    </div>
  );
}
