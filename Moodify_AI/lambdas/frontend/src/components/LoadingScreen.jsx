/**
 * components/LoadingScreen.jsx
 * Shows animated bars + rotating message while Lambda chain runs.
 */

export default function LoadingScreen({ message }) {
  const steps = [
    { icon: "🎭", label: "mood_analyzer Lambda", sub: "Claude API call" },
    { icon: "🎵", label: "playlist_builder Lambda", sub: "Spotify API call" },
    { icon: "💾", label: "DynamoDB + S3", sub: "Storing result" },
  ];

  return (
    <div className="loading-screen">
      {/* Animated bars */}
      <div className="bars">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="bar"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      <p className="loading-message">{message}</p>

      {/* Show the Lambda chain so user understands what's happening */}
      <div className="lambda-chain">
        {steps.map((s, i) => (
          <div key={i} className="chain-step">
            <span className="chain-icon">{s.icon}</span>
            <div>
              <p className="chain-name">{s.label}</p>
              <p className="chain-sub">{s.sub}</p>
            </div>
            {i < steps.length - 1 && <span className="chain-arrow">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
