/**
 * hooks/useMoodify.js
 * ─────────────────────────────────────────────────────────────────
 * Single hook that owns ALL form state + the generate/poll logic.
 * Components just call this hook - no prop drilling needed.
 */

import { useState, useCallback } from "react";
import { generatePlaylist, pollForPlaylist } from "../api/moodify";

const LOADING_MESSAGES = [
  "Claude is reading your mood…",
  "Mapping emotions to music theory…",
  "Querying Spotify recommendations…",
  "Building your perfect tracklist…",
  "Almost there…",
];

// Default form state - matches what Lambda expects
const DEFAULT_FORM = {
  mood:        "",          // "Happy" | "Calm" | "Energized" etc.
  mood_text:   "",          // free-text description
  genres:      [],          // ["Pop", "Hip-Hop", ...]
  preferences: {
    length:        20,      // number of tracks
    era:           "any",   // "any" | "70s-80s" | "90s-2000s" | "2010s" | "recent"
    language:      "any",   // "any" | "english" | "hindi" | "spanish" | "kpop"
    listener_type: "casual",// "casual" | "audiophile" | "gym" | "study" | "party"
    energy:        60,      // 0–100
  },
};

export function useMoodify() {
  // ── Form state ────────────────────────────────────────────────
  const [form, setForm] = useState(DEFAULT_FORM);

  // ── App phase ─────────────────────────────────────────────────
  const [phase, setPhase] = useState("input"); // "input" | "loading" | "result"

  // ── Loading message index ─────────────────────────────────────
  const [loadMsg, setLoadMsg] = useState(LOADING_MESSAGES[0]);

  // ── Result + error ────────────────────────────────────────────
  const [playlist, setPlaylist] = useState(null);
  const [error,    setError]    = useState("");

  // ── Form helpers ───────────────────────────────────────────────
  const setMood      = (m)  => setForm((f) => ({ ...f, mood: f.mood === m ? "" : m }));
  const setMoodText  = (t)  => setForm((f) => ({ ...f, mood_text: t }));
  const setPrefs     = (upd)=> setForm((f) => ({ ...f, preferences: { ...f.preferences, ...upd } }));

  const toggleGenre  = (g)  => setForm((f) => ({
    ...f,
    genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g],
  }));

  // ── Main action: Generate ──────────────────────────────────────
  const generate = useCallback(async () => {
    if (!form.mood && !form.mood_text.trim()) {
      setError("Please select a mood or describe how you're feeling.");
      return;
    }
    setError("");
    setPhase("loading");

    // Rotate loading messages while waiting
    let msgIdx = 0;
    setLoadMsg(LOADING_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadMsg(LOADING_MESSAGES[msgIdx]);
    }, 1800);

    try {
      // ── STEP 1: POST all form data to mood_analyzer Lambda ────
      // Lambda receives: { mood, mood_text, genres, preferences }
      const initResponse = await generatePlaylist({
        mood:        form.mood,
        mood_text:   form.mood_text,
        genres:      form.genres,
        preferences: form.preferences,
      });

      // Cache hit: Lambda returned 200 with full playlist immediately
      if (initResponse.status === "READY") {
        clearInterval(msgInterval);
        setPlaylist(initResponse);
        setPhase("result");
        return;
      }

      // ── STEP 2: Poll GET /playlist/{session_id} ───────────────
      // mood_analyzer returned 202 { session_id, status:"PROCESSING" }
      // playlist_builder Lambda is running async in background
      // We poll until it writes READY to DynamoDB
      const result = await pollForPlaylist(
        initResponse.session_id,
        (attempt) => {
          const idx = attempt % LOADING_MESSAGES.length;
          setLoadMsg(LOADING_MESSAGES[idx]);
        }
      );

      clearInterval(msgInterval);
      setPlaylist(result);
      setPhase("result");

    } catch (err) {
      clearInterval(msgInterval);
      setError(err.message || "Something went wrong. Please try again.");
      setPhase("input");
    }
  }, [form]);

  // ── Reset ──────────────────────────────────────────────────────
  const reset = () => {
    setForm(DEFAULT_FORM);
    setPhase("input");
    setPlaylist(null);
    setError("");
  };

  return {
    // Form state (read)
    form,
    // Form actions (write)
    setMood, setMoodText, setPrefs, toggleGenre,
    // App state
    phase, loadMsg, playlist, error,
    // Actions
    generate, reset,
  };
}
