/**
 * api/moodify.js
 * Talks to mood_analyzer Lambda via API Gateway.
 * Sync flow: POST /playlist → returns playlist directly (no polling).
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
 * @returns {Object} { status:"READY", tracks:[...], mood_summary, emoji, playlist_name }
 */
export async function generatePlaylist(payload) {
  console.log("Calling:", `${BASE}/playlist`);
  console.log("Payload:", payload);

  const res = await fetch(`${BASE}/playlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log("Response:", data);

  if (!res.ok) {
    throw new Error(data.error || `Server error ${res.status}`);
  }

  return data;
}

// Keep pollForPlaylist stub so nothing else breaks if it's imported elsewhere
export async function pollForPlaylist(sessionId, onTick) {
  throw new Error("Polling not needed — Lambda now returns playlist directly.");
}