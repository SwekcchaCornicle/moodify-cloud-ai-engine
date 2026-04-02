/**
 * components/PreferencesForm.jsx
 * All 5 preference controls:
 *   Playlist Length | Era | Language | Listener Type | Energy Level
 *
 * Values here map DIRECTLY to what Lambda expects in preferences: {}
 */

const LENGTHS = [
  { value: 10, label: "10 tracks (~35 min)" },
  { value: 20, label: "20 tracks (~70 min)" },
  { value: 30, label: "30 tracks (~100 min)" },
];

const ERAS = [
  { value: "any",      label: "Any era" },
  { value: "70s-80s",  label: "70s – 80s classics" },
  { value: "90s-2000s",label: "90s – 2000s" },
  { value: "2010s",    label: "2010s indie era" },
  { value: "recent",   label: "Recent (2021+)" },
];

const LANGUAGES = [
  { value: "any",     label: "Any language" },
  { value: "english", label: "English" },
  { value: "hindi",   label: "Hindi / Bollywood" },
  { value: "spanish", label: "Spanish" },
  { value: "kpop",    label: "Korean (K-Pop)" },
];

const LISTENER_TYPES = [
  { value: "casual",     label: "Casual listener" },
  { value: "audiophile", label: "Audiophile" },
  { value: "gym",        label: "Gym / Workout" },
  { value: "study",      label: "Study / Focus" },
  { value: "party",      label: "Party host" },
];

export default function PreferencesForm({ preferences, setPrefs }) {
  const { length, era, language, listener_type, energy } = preferences;

  return (
    <section className="card">
      <p className="step-label">02 — Listener Preferences</p>

      <div className="prefs-grid">
        {/* Playlist Length */}
        <div className="pref-field">
          <label className="pref-label">Playlist Length</label>
          <select
            className="pref-select"
            value={length}
            onChange={(e) => setPrefs({ length: Number(e.target.value) })}
          >
            {LENGTHS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Era */}
        <div className="pref-field">
          <label className="pref-label">Era / Decade</label>
          <select
            className="pref-select"
            value={era}
            onChange={(e) => setPrefs({ era: e.target.value })}
          >
            {ERAS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="pref-field">
          <label className="pref-label">Language</label>
          <select
            className="pref-select"
            value={language}
            onChange={(e) => setPrefs({ language: e.target.value })}
          >
            {LANGUAGES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Listener Type */}
        <div className="pref-field">
          <label className="pref-label">Listener Type</label>
          <select
            className="pref-select"
            value={listener_type}
            onChange={(e) => setPrefs({ listener_type: e.target.value })}
          >
            {LISTENER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Energy Slider — full width */}
      <div className="pref-field" style={{ marginTop: "1.25rem" }}>
        <label className="pref-label">
          Energy Level
          <span className="energy-value">{energy}%</span>
        </label>
        <input
          type="range"
          className="energy-slider"
          min={0}
          max={100}
          step={1}
          value={energy}
          style={{ "--pct": `${energy}%` }}
          onChange={(e) => setPrefs({ energy: Number(e.target.value) })}
        />
        <div className="slider-ticks">
          <span>Mellow</span>
          <span>Balanced</span>
          <span>Intense</span>
        </div>
      </div>
    </section>
  );
}
