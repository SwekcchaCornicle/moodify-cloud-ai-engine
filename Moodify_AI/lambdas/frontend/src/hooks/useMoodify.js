/**
 * hooks/useMoodify.js
 * ─────────────────────────────────────────────────────────────────
 * Single hook that owns ALL form state + the generate logic.
 * Components just call this hook — no prop drilling needed.
 */

import { useState, useCallback } from "react";
import { generatePlaylist } from "../api/moodify";

const LOADING_MESSAGES = [
  "Reading your mood…",
  "Building your search query…",
  "Querying Spotify…",
  "Curating your tracklist…",
  "Almost there…",
];

const DEFAULT_FORM = {
  mood:      "",
  mood_text: "",
  genres:    [],
  preferences: {
    length:        10,
    era:           "any",
    language:      "any",
    listener_type: "casual",
    energy:        60,
  },
};

export function useMoodify() {
  const [form,     setForm]     = useState(DEFAULT_FORM);
  const [phase,    setPhase]    = useState("input");
  const [loadMsg,  setLoadMsg]  = useState(LOADING_MESSAGES[0]);
  const [playlist, setPlaylist] = useState(null);
  const [error,    setError]    = useState("");

  // ── Form helpers ───────────────────────────────────────────────
  const setMood     = (m)   => setForm((f) => ({ ...f, mood: f.mood === m ? "" : m }));
  const setMoodText = (t)   => setForm((f) => ({ ...f, mood_text: t }));
  const setPrefs    = (upd) => setForm((f) => ({ ...f, preferences: { ...f.preferences, ...upd } }));
  const toggleGenre = (g)   => setForm((f) => ({
    ...f,
    genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g],
  }));

  // ── Main action ────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!form.mood && !form.mood_text.trim()) {
      setError("Please select a mood or describe how you're feeling.");
      return;
    }
    setError("");
    setPhase("loading");

    // Rotate loading messages
    let msgIdx = 0;
    setLoadMsg(LOADING_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadMsg(LOADING_MESSAGES[msgIdx]);
    }, 1800);

    try {
      console.log("🚀 [useMoodify] generate() called");
      console.log("📋 [useMoodify] Form state:", JSON.stringify(form, null, 2));

      const payload = {
        mood:        form.mood,
        mood_text:   form.mood_text,
        genres:      form.genres,
        preferences: form.preferences,
      };

      const result = await generatePlaylist(payload);

      console.log("✅ [useMoodify] Got result — status:", result?.status);
      console.log("✅ [useMoodify] Tracks:", result?.tracks?.length);

      clearInterval(msgInterval);

      // Handle both shapes:
      //   { status:"READY", tracks:[...], playlist_name, ... }   ← new Lambda
      //   { playlist: { status, tracks, ... }, mapped: {...} }   ← old Lambda
      const playlistData = result?.playlist ?? result;

      if (playlistData?.status === "READY") {
        setPlaylist(playlistData);
        setPhase("result");
      } else {
        throw new Error(`Unexpected response status: ${playlistData?.status}`);
      }

    } catch (err) {
      clearInterval(msgInterval);
      console.error("❌ [useMoodify] Error:", err.message);
      setError(err.message || "Something went wrong. Please try again.");
      setPhase("input");
    }
  }, [form]);

  const reset = () => {
    setForm(DEFAULT_FORM);
    setPhase("input");
    setPlaylist(null);
    setError("");
  };

  return {
    form,
    setMood, setMoodText, setPrefs, toggleGenre,
    phase, loadMsg, playlist, error,
    generate, reset,
  };
}