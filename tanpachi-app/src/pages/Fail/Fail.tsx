import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import kakuhenSfx from "../../assets/kakuhen.mp3";
import { playMiss, playSfx } from "../../lib/sfx";
import "./Fail.css";

type FailKind = "miss" | "timeout" | "kakuhenEnd";
type LocState = { kind?: FailKind; finished?: boolean; penalty?: number; revive?: boolean };

// 失敗演出を表示してから次へ進むまでの時間 (ms)
const HOLD_MS = 2300;
// 確変終了→確変突入 に切り替わる時間と、切り替え後の保持時間 (ms)
const FLIP_MS = 1150;
const REVIVE_HOLD_MS = 2950;

/** 稲妻のポリライン座標（0〜100 の viewBox 空間）を生成 */
function bolt(x1: number, y1: number, x2: number, y2: number, segs = 9, jag = 13): string {
  const pts: string[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const j = i === 0 || i === segs ? 0 : 1;
    const x = x1 + (x2 - x1) * t + j * (Math.random() * 2 - 1) * jag;
    const y = y1 + (y2 - y1) * t + j * (Math.random() * 2 - 1) * jag;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export function Fail() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { kind = "miss", finished = false, penalty = 0, revive = false } =
    (loc.state as LocState | null) ?? {};
  const playedRef = useRef(false);
  // 確変終了 → 確変突入 への切り替えフラグ
  const [revived, setRevived] = useState(false);

  const title = revived
    ? "確変突入!"
    : kind === "timeout"
      ? "時間切れ"
      : kind === "kakuhenEnd"
        ? "確変終了"
        : "失敗";
  const cls = `fail-title${title.length > 2 ? " long" : ""}`;

  // 外れっぽい効果音を一度だけ鳴らす
  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    playMiss();
  }, []);

  // 確変終了の演出の途中で「確変突入!」へ切り替える
  useEffect(() => {
    if (!revive) return;
    const t = window.setTimeout(() => {
      setRevived(true);
      // 切り替えの瞬間に確変突入の音を鳴らす
      playSfx(kakuhenSfx);
    }, FLIP_MS);
    return () => window.clearTimeout(t);
  }, [revive]);

  const next = useCallback(() => {
    if (finished) {
      sessionStorage.removeItem("tanpachi:session");
      navigate("/home", { replace: true });
    } else {
      navigate("/learn", { replace: true });
    }
  }, [finished, navigate]);

  useEffect(() => {
    const hold = revive ? REVIVE_HOLD_MS : HOLD_MS;
    const t = window.setTimeout(next, hold);
    return () => window.clearTimeout(t);
  }, [next, revive]);

  // 放射状のスピードライン・稲妻・破片を毎回ランダム生成
  const bolts = useMemo(() => {
    const b: string[] = [];
    // 画面四辺から中心付近へ集まる稲妻
    for (let i = 0; i < 8; i++) {
      const edge = i % 4;
      let sx = 0;
      let sy = 0;
      if (edge === 0) {
        sx = Math.random() * 100;
        sy = -2;
      } else if (edge === 1) {
        sx = 102;
        sy = Math.random() * 100;
      } else if (edge === 2) {
        sx = Math.random() * 100;
        sy = 102;
      } else {
        sx = -2;
        sy = Math.random() * 100;
      }
      const tx = 42 + Math.random() * 16;
      const ty = 38 + Math.random() * 12;
      b.push(bolt(sx, sy, tx, ty, 9, 12));
    }
    // 短い枝葉の稲妻
    for (let i = 0; i < 4; i++) {
      b.push(
        bolt(Math.random() * 100, Math.random() * 60, 30 + Math.random() * 40, 30 + Math.random() * 30, 6, 9),
      );
    }
    return b;
  }, []);

  const shards = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        d: Math.random() * 0.5,
        r: Math.random() * 360,
        s: 8 + Math.random() * 20,
      })),
    [],
  );

  const showPenalty = penalty > 0;

  return (
    <div className={`fail fail-${kind}${revived ? " revive" : ""}`}>
      {/* 放射状スピードライン */}
      <div className="fail-rays" aria-hidden />
      <div className="fail-rays fail-rays-2" aria-hidden />

      {/* 稲妻 */}
      <svg className="fail-bolts" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {bolts.map((p, i) => (
          <polyline
            key={i}
            points={p}
            className="fail-bolt"
            style={{ animationDelay: `${(i % 5) * 0.1}s` }}
          />
        ))}
      </svg>

      {/* 破片 */}
      <div className="fail-shards" aria-hidden>
        {shards.map((s) => (
          <span
            key={s.id}
            className="fail-shard"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.s,
              height: s.s * 0.5,
              transform: `rotate(${s.r}deg)`,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}
      </div>

      {/* 中央の光・フラッシュ */}
      <div className="fail-glow" aria-hidden />
      <div className="fail-flash" aria-hidden />
      <div className="fail-edge" aria-hidden />

      <div className="fail-body">
        <div className="fail-title-wrap">
          <span className={cls} data-text={title}>
            {title}
          </span>
        </div>
        {revived ? (
          <div className="fail-sub revive-sub">ラッシュ継続!</div>
        ) : (
          <>
            {kind === "kakuhenEnd" && <div className="fail-sub">ラッシュ終了…</div>}
            {kind === "timeout" && <div className="fail-sub">時間切れ…</div>}
            {showPenalty && (
              <div className="fail-penalty">
                <span className="ball" />
                <span className="fail-penalty-num">−{penalty}</span>
                <span className="fail-penalty-unit">玉</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
