import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BallCounter } from "../../components/BallCounter";
import { Fx } from "../../components/Fx";
import { useApp } from "../../store/AppContext";
import correctSfx from "../../assets/correct.mp3";
import "./Correct.css";

type LocState = { word?: string; reward?: number; finished?: boolean };

// 正解演出を表示してから、次の問題へ自動で進むまでの時間 (ms)
const HOLD_MS = 2000;

export function Correct() {
  const navigate = useNavigate();
  const { state } = useApp();
  const loc = useLocation();
  const { reward = 10, finished = false } = (loc.state as LocState | null) ?? {};
  const [displayed, setDisplayed] = useState(state.balls - reward);
  // StrictMode の二重実行でも効果音を一度だけ鳴らすためのガード
  const playedRef = useRef(false);

  // 所持玉のカウントアップ演出
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

  // 正解効果音（添付音源）を再生。StrictMode の二重実行でも一度だけ鳴らす。
  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    const audio = new Audio(correctSfx);
    audio.volume = 1;
    void audio.play().catch(() => {
      /* 自動再生がブロックされた環境では無視 */
    });
    // 音源自体が約1.8秒で終わるため、あえて cleanup では止めない
    // （StrictMode の再マウントで即停止してしまうのを避ける）
  }, []);

  const next = useCallback(() => {
    if (finished) {
      sessionStorage.removeItem("tanpachi:session");
      navigate("/home", { replace: true });
    } else {
      navigate("/learn", { replace: true });
    }
  }, [finished, navigate]);

  // ボタンを押さなくても約2秒で自動的に次へ進む
  useEffect(() => {
    const t = window.setTimeout(next, HOLD_MS);
    return () => window.clearTimeout(t);
  }, [next]);

  // 舞い上がるコイン（毎回ランダム）
  const coins = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: 4 + Math.random() * 92,
        delay: Math.random() * 0.6,
        dur: 0.9 + Math.random() * 0.9,
        size: 12 + Math.random() * 18,
      })),
    [],
  );

  return (
    <div className="correct">
      <Fx rays sparkles={64} petals={12} />

      {/* ちかちか系の演出レイヤー */}
      <div className="correct-burst" aria-hidden />
      <div className="correct-rays-fast" aria-hidden />
      <div className="correct-rings" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="correct-strobe" aria-hidden />
      <div className="correct-flash" aria-hidden />
      <div className="correct-edge" aria-hidden />
      <div className="correct-confetti" aria-hidden>
        {coins.map((c) => (
          <span
            key={c.id}
            className="correct-coin"
            style={{
              left: `${c.x}%`,
              width: c.size,
              height: c.size,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="correct-body">
        <div className="correct-title-wrap">
          <h1 className="correct-title brush">正解!</h1>
        </div>
        <div className="correct-ball-wrap">
          <span className="ball correct-ball" />
        </div>
        <div className="correct-plus">
          <span className="plus">+{reward}</span>
          <span className="unit brush">玉</span>
        </div>

        <section className="gold-frame correct-balance">
          <div className="label">現在の所持玉</div>
          <BallCounter value={displayed} size="md" delta={reward} />
        </section>
      </div>
    </div>
  );
}
