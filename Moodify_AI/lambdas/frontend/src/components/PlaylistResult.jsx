/**
 * components/PlaylistResult.jsx
 * Renders the final playlist returned from DynamoDB via api_response Lambda.
 */

export default function PlaylistResult({ playlist, onReset }) {
  const {
    playlist_name,
    playlist_desc,
    emoji,
    mood_summary,
    tags = [],
    tracks = [],
    track_count,
    generated_at,
  } = playlist;

  function openTrack(url) {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleSaveToSpotify() {
    // In production: trigger OAuth flow, then call
    // POST /playlist/{session_id}/save  → playlist_builder creates Spotify playlist
    alert(
      "Save to Spotify requires OAuth.\n\n" +
      "Add a /save endpoint to your API Gateway that calls\n" +
      "create_spotify_playlist() in playlist_builder.py"
    );
  }

  return (
    <div className="result-card">
      {/* ── Mood analysis badge ── */}
      <div className="mood-badge">
        <span className="badge-emoji">{emoji}</span>
        <div>
          <p className="badge-title">{mood_summary}</p>
          <p className="badge-sub">Claude analysis · {track_count} tracks</p>
        </div>
      </div>

      {/* ── Playlist header ── */}
      <div className="playlist-header">
        <div className="playlist-art">{emoji}</div>
        <div className="playlist-meta">
          <h2 className="playlist-name">{playlist_name}</h2>
          <p className="playlist-desc">{playlist_desc}</p>
          <div className="tag-row">
            {tags.map((t) => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Track list ── */}
      <div className="track-list">
        {tracks.map((track, i) => (
          <div
            key={track.id || i}
            className="track-row"
            onClick={() => openTrack(track.spotify_url)}
            title="Click to open in Spotify"
          >
            <span className="track-num">{i + 1}</span>
            {track.image_url && (
              <img
                src={track.image_url}
                alt={track.album}
                className="track-thumb"
              />
            )}
            <div className="track-info">
              <p className="track-name">{track.name}</p>
              <p className="track-artist">{track.artist}</p>
            </div>
            <span className="track-dur">{track.duration}</span>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="result-actions">
        <button className="btn-spotify" onClick={handleSaveToSpotify}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.24.37-.72.48-1.09.24-2.99-1.83-6.76-2.24-11.2-1.23-.43.1-.85-.17-.95-.6-.1-.43.17-.85.6-.95 4.86-1.11 9.02-.63 12.39 1.42.37.23.48.72.25 1.12zm1.24-2.75c-.3.46-.93.6-1.39.3-3.42-2.1-8.63-2.71-12.67-1.48-.52.16-1.07-.14-1.23-.66-.16-.52.14-1.07.66-1.23 4.61-1.4 10.34-.72 14.24 1.68.46.29.6.93.39 1.39zm.11-2.86c-4.1-2.44-10.87-2.66-14.78-1.47-.63.19-1.3-.16-1.49-.79-.19-.63.16-1.3.79-1.49 4.49-1.37 11.95-1.1 16.66 1.7.57.34.76 1.07.42 1.64-.34.57-1.07.76-1.6.41z"/>
          </svg>
          Save to Spotify
        </button>
        <button className="btn-reset" onClick={onReset}>
          ↻ New Playlist
        </button>
      </div>

      {generated_at && (
        <p className="generated-at">
          Generated {new Date(generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
