/**
 * api/moodify.js
 * Talks to the playlist Lambda via API Gateway.
 * Sync flow: POST /playlist → returns playlist directly.
 *
 * Every step is logged so you can follow along in DevTools console.
 */

const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "")
  : "/api";

/**
 * Send form data → get playlist back directly.
 *
 * @param {Object} payload
 *   {
 *     mood:        "Happy",
 *     mood_text:   "late night drive",
 *     genres:      ["Pop", "Indie"],
 *     preferences: {
 *       length:        20,
 *       era:           "any",
 *       language:      "any",
 *       listener_type: "casual",
 *       energy:        60,
 *     }
 *   }
 * @returns {Object} full playlist response from Lambda
 */
export async function generatePlaylist(payload) {
  const url = `${BASE}/playlist`;

  // ── STEP 1: Log what we're about to send ──────────────────────
  console.group("🎵 Moodify API Call");
  console.log("📡 [STEP 1] Endpoint :", url);
  console.log("📦 [STEP 1] Full payload being sent to Lambda:");
  console.table({
    mood:          payload.mood          || "(none)",
    mood_text:     payload.mood_text     || "(none)",
    genres:        (payload.genres || []).join(", ") || "(none)",
    length:        payload.preferences?.length,
    era:           payload.preferences?.era,
    language:      payload.preferences?.language,
    listener_type: payload.preferences?.listener_type,
    energy:        payload.preferences?.energy + "%",
  });
  console.log("📦 [STEP 1] Raw JSON:");
  console.log(JSON.stringify(payload, null, 2));

  // ── STEP 2: Make the request ───────────────────────────────────
  console.log("⏳ [STEP 2] Sending POST request...");
  const t0  = performance.now();

  let res;
  try {
    res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error("❌ [STEP 2] Network error (fetch failed):", networkErr.message);
    console.groupEnd();
    throw new Error(`Network error: ${networkErr.message}`);
  }

  const elapsed = Math.round(performance.now() - t0);
  console.log(`✅ [STEP 2] Response received in ${elapsed}ms — HTTP ${res.status}`);

  // ── STEP 3: Parse JSON ─────────────────────────────────────────
  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    console.error("❌ [STEP 3] Failed to parse JSON response:", parseErr.message);
    console.groupEnd();
    throw new Error("Invalid JSON from server");
  }

  console.log("📥 [STEP 3] Raw JSON response from Lambda:");
  console.log(JSON.stringify(data, null, 2));

  // ── STEP 4: Check for server-side errors ───────────────────────
  if (!res.ok) {
    const errMsg = data?.error || `Server error ${res.status}`;
    console.error("❌ [STEP 4] Server returned error:", errMsg);
    console.groupEnd();
    throw new Error(errMsg);
  }

  // ── STEP 5: Validate playlist shape ───────────────────────────
  const playlist = data.playlist ?? data;   // handle both {playlist:{...}} and flat response

  console.log("🎶 [STEP 4] Playlist name  :", playlist?.playlist_name);
  console.log("🎶 [STEP 4] Track count    :", playlist?.tracks?.length);
  console.log("🎶 [STEP 4] Status         :", playlist?.status);

  if (playlist?.tracks?.length) {
    console.log("🎶 [STEP 4] First 3 tracks :");
    playlist.tracks.slice(0, 3).forEach((t, i) =>
      console.log(`   ${i + 1}. ${t.name || t.title} — ${t.artist}`)
    );
  }

  if (data.mapped) {
    console.log("🧠 [STEP 4] Lambda mood mapping:");
    console.table(data.mapped);
  }

  console.groupEnd();

  // ── STEP 6: Normalise track fields ────────────────────────────
  // Lambda returns { name, artist, spotify_url, image_url, duration }
  // PlaylistResult.jsx expects the same — just ensure nothing is undefined
  const normalisedPlaylist = {
    ...playlist,
    tracks: (playlist.tracks || []).map((t) => ({
      id:          t.id          || Math.random().toString(36).slice(2),
      name:        t.name        || t.title || "Unknown",
      artist:      t.artist      || "Unknown Artist",
      album:       t.album       || "",
      duration:    t.duration    || "",
      spotify_url: t.spotify_url || t.url  || "",
      image_url:   t.image_url   || "",
    })),
  };

  return normalisedPlaylist;
}


// Kept so nothing breaks if pollForPlaylist is imported elsewhere
export async function pollForPlaylist() {
  throw new Error("Polling not needed — Lambda returns playlist directly.");
}