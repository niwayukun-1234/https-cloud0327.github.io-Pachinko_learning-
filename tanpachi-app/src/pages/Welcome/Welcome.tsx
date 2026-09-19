import { useNavigate } from "react-router-dom";
import { Fx } from "../../components/Fx";
import { Logo } from "../../components/Logo";
import "./Welcome.css";

export function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="welcome">
      <Fx hall sparkles={40} />
      <div className="welcome-content">
        <div className="welcome-fuji" aria-hidden />
        <Logo size="lg" />
        <p className="welcome-tagline brush">遊びが、学びに変わる。</p>
        <div className="welcome-ball-wrap">
          <span className="ball welcome-ball" />
        </div>
        <p className="welcome-desc">
          <span className="gold-text">パチンコ × 英単語</span>
          <br />
          遊ぶほど、言葉が増えていく。
        </p>
        <button className="btn-cta welcome-cta" onClick={() => navigate("/home")}>
          はじめる
        </button>
      </div>
    </div>
  );
}
