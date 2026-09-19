import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BallCounter } from "../../components/BallCounter";
import { Fx } from "../../components/Fx";
import { useApp } from "../../store/AppContext";
import "./Correct.css";

type LocState = { word?: string; reward?: number; finished?: boolean };

export function Correct() {
  const navigate = useNavigate();
  const { state } = useApp();
  const loc = useLocation();
  const { reward = 10, finished = false } = (loc.state as LocState | null) ?? {};
  const [displayed, setDisplayed] = useState(state.balls - reward);

  // count-up animation of the balance
  useEffect(() => {
    const start = state.balls - reward;
    const end = state.balls;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      setDisplayed(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.balls, reward]);

  const next = () => {
    if (finished) {
      sessionStorage.removeItem("tanpachi:session");
      navigate("/home", { replace: true });
    } else {
      navigate("/learn", { replace: true });
    }
  };

  return (
    <div className="correct">
      <Fx rays sparkles={40} petals={8} />
      <div className="correct-burst" aria-hidden />
      <div className="correct-body">
        <h1 className="correct-title brush pop">正解!</h1>
        <div className="correct-ball-wrap pop" style={{ animationDelay: "0.1s" }}>
          <span className="ball correct-ball" />
        </div>
        <div className="correct-plus pop" style={{ animationDelay: "0.2s" }}>
          <span className="plus">+{reward}</span>
          <span className="unit brush">玉</span>
        </div>

        <section className="gold-frame correct-balance fade-up" style={{ animationDelay: "0.35s" }}>
          <div className="label">現在の所持玉</div>
          <BallCounter value={displayed} size="md" delta={reward} />
        </section>

        <button className="btn-cta correct-next fade-up" style={{ animationDelay: "0.45s" }} onClick={next}>
          {finished ? "ホームへ戻る" : "次の問題へ"}
        </button>
      </div>
    </div>
  );
}
