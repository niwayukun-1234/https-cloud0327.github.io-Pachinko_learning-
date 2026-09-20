import { useNavigate } from "react-router-dom";
import hall from "./hall.jpg";
import logo from "./logo.png";
import ball from "./ball.png";
import "./Welcome.css";

const SPARKS = [
  { x: 8, y: 18, d: 0.2, s: 3 },
  { x: 18, y: 42, d: 1.1, s: 2 },
  { x: 28, y: 12, d: 0.6, s: 4 },
  { x: 72, y: 16, d: 1.4, s: 3 },
  { x: 84, y: 38, d: 0.3, s: 2 },
  { x: 91, y: 22, d: 1.8, s: 3 },
  { x: 12, y: 68, d: 0.9, s: 2 },
  { x: 88, y: 72, d: 1.6, s: 4 },
  { x: 6, y: 52, d: 2.2, s: 2 },
  { x: 94, y: 58, d: 0.5, s: 3 },
  { x: 40, y: 8, d: 1.3, s: 2 },
  { x: 60, y: 10, d: 2.0, s: 3 },
  { x: 22, y: 88, d: 0.7, s: 2 },
  { x: 78, y: 90, d: 1.9, s: 3 },
  { x: 50, y: 78, d: 0.4, s: 2 },
  { x: 35, y: 30, d: 2.4, s: 2 },
  { x: 65, y: 34, d: 1.0, s: 3 },
  { x: 48, y: 92, d: 1.5, s: 2 },
];

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome">
      <div className="welcome-bg" aria-hidden>
        <div className="welcome-bg-layer" style={{ backgroundImage: `url(${hall})` }} />
        <div className="welcome-bg-layer welcome-bg-layer-b" style={{ backgroundImage: `url(${hall})` }} />
      </div>
      <div className="welcome-lights" aria-hidden />
      <div className="welcome-vignette" />
      <div className="welcome-sparkles" aria-hidden>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="welcome-spark"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}
      </div>

      <div className="welcome-content">
        <img className="welcome-logo" src={logo} alt="パチ単語" />
        <p className="welcome-tagline">遊びが、学びに変わる。</p>
        <div className="welcome-ball-wrap">
          <img className="welcome-ball" src={ball} alt="" />
        </div>
        <p className="welcome-desc">
          <span className="gold-text">パチンコ × 英単語</span>
          <br />
          遊ぶほど、言葉が増えていく。
        </p>
        <button className="btn-cta welcome-cta" onClick={() => navigate("/login")}>
          はじめる
        </button>
      </div>
    </div>
  );
}
