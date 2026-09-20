import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fx } from "../../components/Fx";
import { Logo } from "../../components/Logo";
import { useApp } from "../../store/AppContext";
import "./PachinkoMode.css";

const SPIN_COST = 10;
const JACKPOT_WIN = 150;
const SMALL_WIN = 30;
const JACKPOT_RATE = 1 / 12;
const SMALL_RATE = 1 / 5;
const SYMBOLS = ["7", "桜", "玉", "学", "勝", "富"];

type Phase = "idle" | "spinning" | "result";
type Outcome = "none" | "small" | "jackpot";

function pickOutcome(): Outcome {
  const r = Math.random();
  if (r < JACKPOT_RATE) return "jackpot";
  if (r < JACKPOT_RATE + SMALL_RATE) return "small";
  return "none";
}

function reelsFor(outcome: Outcome): string[] {
  if (outcome === "jackpot") return ["7", "7", "7"];
  if (outcome === "small") {
    const s = SYMBOLS[1 + Math.floor(Math.random() * (SYMBOLS.length - 1))];
    return [s, s, s];
  }
  // deliberately non-matching
  const a = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  let b = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  while (b === a) b = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const c = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  return [a, b, c];
}

export function PachinkoMode() {
  const navigate = useNavigate();
  const { state, spin } = useApp();
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<Outcome>("none");
  const [reels, setReels] = useState<string[]>(["た", "ん", "パ"]);
  const [stopped, setStopped] = useState<boolean[]>([true, true, true]);
  const [auto, setAuto] = useState(false);
  const [fxOn, setFxOn] = useState(true);
  const [balls, setBalls] = useState<{ id: number; x: number }[]>([]);
  const timers = useRef<number[]>([]);
  const stoppedRef = useRef<boolean[]>([true, true, true]);

  const clearTimers = () => {
    timers.current.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
    timers.current = [];
  };

  const canPlay = state.balls >= SPIN_COST;

  const doSpin = useCallback(() => {
    if (phase !== "idle" || state.balls < SPIN_COST) return;
    const oc = pickOutcome();
    const final = reelsFor(oc);
    setOutcome(oc);
    setPhase("spinning");
    setStopped([false, false, false]);
    setBalls(Array.from({ length: 5 }, (_, i) => ({ id: Date.now() + i, x: 20 + Math.random() * 60 })));

    // Reel rolling
    const roll = window.setInterval(() => {
      setReels((prev) =>
        prev.map((v, i) => (stoppedRef.current[i] ? v : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])),
      );
    }, 70);

    const stopAt = (i: number, ms: number) =>
      timers.current.push(
        window.setTimeout(() => {
          stoppedRef.current[i] = true;
          setStopped([...stoppedRef.current]);
          setReels((prev) => prev.map((v, j) => (j === i ? final[i] : v)));
        }, ms),
      );

    stoppedRef.current = [false, false, false];
    stopAt(0, fxOn ? 900 : 300);
    stopAt(1, fxOn ? 1500 : 500);
    stopAt(2, fxOn ? (oc === "none" ? 2100 : 2800) : 700);

    timers.current.push(
      window.setTimeout(
        () => {
          window.clearInterval(roll);
          const win = oc === "jackpot" ? JACKPOT_WIN : oc === "small" ? SMALL_WIN : 0;
          spin(SPIN_COST, win, oc === "jackpot");
          setPhase("result");
          timers.current.push(
            window.setTimeout(
              () => {
                setPhase("idle");
                setBalls([]);
              },
              oc === "jackpot" ? 2200 : 900,
            ),
          );
        },
        fxOn ? (oc === "none" ? 2150 : 2850) : 750,
      ),
    );
    timers.current.push(roll);
  }, [phase, state.balls, spin, fxOn]);

  useEffect(() => () => clearTimers(), []);

  // Auto play
  useEffect(() => {
    if (!auto || phase !== "idle") return;
    const t = window.setTimeout(() => {
      if (canPlay) doSpin();
      else setAuto(false);
    }, 500);
    return () => window.clearTimeout(t);
  }, [auto, phase, canPlay, doSpin]);

  const showJackpot = phase === "result" && outcome === "jackpot";
  const showSmall = phase === "result" && outcome === "small";

  return (
    <div className={`pachi ${showJackpot ? "jackpot" : ""}`}>
      <Fx sparkles={30} petals={fxOn ? 10 : 0} rays={showJackpot} />
      <header className="pachi-header">
        <button className="back-ghost" onClick={() => navigate("/home")} aria-label="ホームへ">
          ‹
        </button>
        <div className="pachi-title">
          <span className="deco">❮</span>
          <span>パチンコモード</span>
          <span className="deco">❯</span>
        </div>
        <span className="pachi-header-spacer" aria-hidden />
      </header>

      <section className="pachi-counter gold-frame">
        <div>
          <span className="label">所持玉</span>
          <span className="value">
            <span className="ball" />
            <b>{state.balls.toLocaleString()}</b>
            <small>玉</small>
          </span>
        </div>
        <div>
          <span className="label">総回転数</span>
          <span className="value">
            <b>{state.totalSpins}</b>
            <small>回</small>
          </span>
        </div>
        <div>
          <span className="label">大当たり</span>
          <span className="value">
            <b>{state.jackpots}</b>
            <small>回</small>
          </span>
        </div>
      </section>

      <section className="machine">
        <div className="machine-ring">
          <div className="machine-ring-inner">
            <div className="machine-face">
              <div className="machine-logo">
                <Logo size="md" />
              </div>
              <div className="reels">
                {reels.map((r, i) => (
                  <span
                    key={i}
                    className={`reel ${stopped[i] ? "stopped" : "rolling"} ${
                      phase === "result" && outcome !== "none" ? "hit" : ""
                    }`}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <div className="pins" aria-hidden>
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ left: `${(i % 8) * 13 + 6}%`, top: `${Math.floor(i / 8) * 26 + 10}%` }} />
                ))}
              </div>
              {balls.map((b) => (
                <span key={b.id} className="drop-ball ball" style={{ left: `${b.x}%` }} />
              ))}
              <span className="kanji-badge left brush">学</span>
              <span className="kanji-badge right brush">勝</span>
            </div>
          </div>
        </div>
        {showJackpot && (
          <div className="jackpot-banner pop">
            <span className="brush">大当たり!</span>
            <span className="win">+{JACKPOT_WIN}玉</span>
          </div>
        )}
        {showSmall && (
          <div className="small-banner pop">
            <span>小当たり +{SMALL_WIN}玉</span>
          </div>
        )}
      </section>

      <section className="controls">
        <div className="control-col">
          <button className={`toggle ${auto ? "on" : ""}`} onClick={() => setAuto((a) => !a)}>
            <span>オート</span>
            <b>{auto ? "ON" : "OFF"}</b>
          </button>
          <button className={`toggle ${fxOn ? "on" : ""}`} onClick={() => setFxOn((f) => !f)}>
            <span>演出</span>
            <b>{fxOn ? "ON" : "OFF"}</b>
          </button>
        </div>
        <button
          className={`push ${phase === "spinning" ? "spinning" : ""}`}
          onClick={doSpin}
          disabled={phase !== "idle" || !canPlay}
          aria-label="PUSH"
        >
          <span className="push-face">PUSH</span>
        </button>
        <div className="control-col">
          <button className="toggle menu-btn" onClick={() => navigate("/rewards")}>
            <span>🎁</span>
            <b>メニュー</b>
          </button>
          <span className="cost-hint">1回 {SPIN_COST}玉</span>
        </div>
      </section>

      <footer className="pachi-footer">
        <p className="brush">
          その一打が、
          <br />
          未来の自分を変えていく。
        </p>
      </footer>
      {!canPlay && phase === "idle" && (
        <div className="no-balls">
          玉が足りません。<button onClick={() => navigate("/learn")}>英単語を学んで玉を集める</button>
        </div>
      )}
    </div>
  );
}
