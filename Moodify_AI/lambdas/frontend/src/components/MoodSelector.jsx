/**
 * components/MoodSelector.jsx
 * Renders mood buttons + free-text box + genre chips.
 * All state lives in useMoodify hook, passed as props.
 */

const MOODS = [
  { key: "Happy",      emoji: "😄", color: "#facc15" },
  { key: "Melancholy", emoji: "🌧️", color: "#818cf8" },
  { key: "Energized",  emoji: "⚡", color: "#fb923c" },
  { key: "Calm",       emoji: "🌊", color: "#38bdf8" },
  { key: "Romantic",   emoji: "🌹", color: "#f472b6" },
  { key: "Focused",    emoji: "🎯", color: "#34d399" },
  { key: "Nostalgic",  emoji: "🎞️", color: "#a78bfa" },
  { key: "Rebellious", emoji: "🔥", color: "#f87171" },
];

const GENRES = [
  "Pop", "Hip-Hop", "Indie", "Electronic", "R&B",
  "Rock", "Jazz", "Classical", "Lo-fi", "Metal", "Folk", "Bollywood",
];

export default function MoodSelector({ mood, moodText, genres, setMood, setMoodText, toggleGenre }) {
  return (
    <section className="card">
      {/* ── Step label ── */}
      <p className="step-label">01 — How are you feeling?</p>

      {/* ── Mood grid ── */}
      <div className="mood-grid">
        {MOODS.map((m) => (
          <button
            key={m.key}
            className={`mood-btn ${mood === m.key ? "active" : ""}`}
            style={{ "--mood-color": m.color }}
            onClick={() => setMood(m.key)}
            type="button"
          >
            <span className="mood-emoji">{m.emoji}</span>
            <span className="mood-label">{m.key}</span>
          </button>
        ))}
      </div>

      {/* ── Free text ── */}
      <textarea
        className="mood-textarea"
        rows={2}
        placeholder="Or describe your vibe… ('late night drive through rain', 'first day of summer')"
        value={moodText}
        onChange={(e) => setMoodText(e.target.value)}
      />

      {/* ── Genre chips ── */}
      <p className="step-label" style={{ marginTop: "1.5rem" }}>Genre Hints (optional)</p>
      <div className="genre-chips">
        {GENRES.map((g) => (
          <button
            key={g}
            className={`genre-chip ${genres.includes(g) ? "active" : ""}`}
            onClick={() => toggleGenre(g)}
            type="button"
          >
            {g}
          </button>
        ))}
      </div>
    </section>
  );
}
