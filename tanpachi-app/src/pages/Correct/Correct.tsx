import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BallCounter } from "../../components/BallCounter";
import { Fx } from "../../components/Fx";
import { useApp } from "../../store/AppContext";
import correctSfx from "../../assets/correct.mp3";
import kakuhenSfx from "../../assets/kakuhen.mp3";
import "./Correct.css";

type LocState = {
  word?: string;
  reward?: number;
  bonus?: number;
  combo?: number;
  kakuhen?: boolean;
  kakuhenTrigger?: boolean;
  finished?: boolean;
};

// 通常の正解演出を表示してから次へ進むまでの時間 (ms)
const HOLD_MS = 2000;
// 確変（ボーナス）演出は少し長めに見せる
const KAKUHEN_HOLD_MS = 3600;
// 獲得玉数に比例してあふれるパチンコ玉の上限（描画負荷対策）
const FLOOD_MAX = 200;

/** 連続正解の回数を 1〜4 の演出レベルに変換 */
function fxTier(combo: number, kakuhen: boolean) {
  if (kakuhen) return 5;
  if (combo >= 8) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

// 再生中の効果音を保持。画面遷移後も鳴らし続け、次の音と重ならないようにする。
let currentSfx: HTMLAudioElement | null = null;
function playSfx(src: string) {
  if (currentSfx) {
    currentSfx.pause();
    currentSfx = null;
  }
  const audio = new Audio(src);
  audio.volume = 1;
  currentSfx = audio;
  void audio.play().catch(() => {
    /* 自動再生がブロックされた環境では無視 */
  });
}

export function Correct() {
  const navigate = useNavigate();
  const { state } = useApp();
  const loc = useLocation();
  const {
    reward = 10,
    bonus = 0,
    combo = 1,
    kakuhen = false,
    kakuhenTrigger = false,
    finished = false,
  } = (loc.state as LocState | null) ?? {};

  const baseReward = Math.max(0, reward - bonus);
  const tier = fxTier(combo, kakuhen);
  const [displayed, setDisplayed] = useState(state.balls - reward);
  const [bonusRevealed, setBonusRevealed] = useState(false);
  // StrictMode の二重実行でも効果音を一度だけ鳴らすためのガード
  const playedRef = useRef(false);

  // 所持玉のカウントアップ演出（確変時は演出の途中から +100 ボーナスが加算される）
  useEffect(() => {
    const before = state.balls - reward;
    const baseEnd = before + baseReward;
    const end = state.balls;
    const dur = bonus > 0 ? 1400 : 800;
    const bonusStart = 0.5; // 演出のちょうど中間からボーナス加算
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      let val: number;
      if (bonus > 0 && p >= bonusStart) {
        const q = (p - bonusStart) / (1 - bonusStart);
        val = baseEnd + (end - baseEnd) * (1 - Math.pow(1 - q, 3));
      } else {
        const q = bonus > 0 ? p / bonusStart : p;
        val = before + (baseEnd - before) * (1 - Math.pow(1 - q, 3));
      }
      setDisplayed(Math.round(val));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.balls, reward, baseReward, bonus]);

  // ボーナス（+100玉）を演出の途中で出現させる
  useEffect(() => {
    if (bonus <= 0) return;
    const t = window.setTimeout(() => setBonusRevealed(true), 700);
    return () => window.clearTimeout(t);
  }, [bonus]);

  // 正解効果音を再生。確変突入時は専用の音源を使う。
  // StrictMode の二重実行でも一度だけ鳴らす。
  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    // 音源は自然再生のままにして、遷移時も鳴り続けるようにする
    // （確変音源は約14秒ある）
    playSfx(kakuhenTrigger ? kakuhenSfx : correctSfx);
  }, [kakuhenTrigger]);

  const next = useCallback(() => {
    if (finished) {
      sessionStorage.removeItem("tanpachi:session");
      navigate("/home", { replace: true });
    } else {
      navigate("/learn", { replace: true });
    }
  }, [finished, navigate]);

  // ボタンを押さなくても自動的に次へ進む
  useEffect(() => {
    const hold = bonus > 0 || kakuhen ? KAKUHEN_HOLD_MS : HOLD_MS;
    const t = window.setTimeout(next, hold);
    return () => window.clearTimeout(t);
  }, [next, bonus, kakuhen]);

  // コンボ/確変が進むほど演出がどんどん豪華になる
  const intensity = useMemo(
    () => ({
      sparkles: 40 + combo * 12 + (kakuhen ? 40 : 0),
      petals: 8 + combo * 4,
      coins: 24 + combo * 6 + (kakuhen ? 30 : 0),
      rings: 3 + Math.min(combo, 6) + (kakuhen ? 3 : 0),
    }),
    [combo, kakuhen],
  );

  // 舞い上がるコイン（毎回ランダム）
  const coins = useMemo(
    () =>
      Array.from({ length: intensity.coins }, (_, i) => ({
        id: i,
        x: 4 + Math.random() * 92,
        delay: Math.random() * 0.6,
        dur: 0.9 + Math.random() * 0.9,
        size: 12 + Math.random() * 18,
      })),
    [intensity.coins],
  );

  // 獲得玉数に比例して、正解の後ろ側であふれるパチンコ玉
  const floodCount = Math.min(reward, FLOOD_MAX);
  const flood = useMemo(
    () =>
      Array.from({ length: floodCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 0.8 + Math.random() * 1.1,
        size: 10 + Math.random() * 16,
      })),
    [floodCount],
  );

  return (
    <div className={`correct tier-${tier}${kakuhen ? " kakuhen" : ""}`}>
      <Fx rays sparkles={intensity.sparkles} petals={intensity.petals} />

      {/* 獲得玉数分、正解の後ろ側であふれるパチンコ玉 */}
      <div className="correct-ball-flood" aria-hidden>
        {flood.map((b) => (
          <span
            key={b.id}
            className="flood-ball ball"
            style={{
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          />
        ))}
      </div>

      {/* ちかちか系の演出レイヤー */}
      <div className="correct-burst" aria-hidden />
      <div className="correct-rays-fast" aria-hidden />
      <div className="correct-rings" aria-hidden>
        {Array.from({ length: intensity.rings }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="correct-strobe" aria-hidden />
      <div className="correct-flash" aria-hidden />
      <div className="correct-edge" aria-hidden />
      {tier >= 2 && <div className="correct-lightning" aria-hidden />}
      {tier >= 3 && (
        <div className="correct-fireworks" aria-hidden>
          {Array.from({ length: 3 + (tier - 3) * 3 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${15 + i * 22}%`,
                top: `${18 + (i % 3) * 16}%`,
                animationDelay: `${0.2 + i * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}
      {tier >= 4 && <div className="correct-rainbow" aria-hidden />}
      {kakuhen && <div className="correct-kakuhen-flash" aria-hidden />}
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
        {kakuhen && <div className="correct-kakuhen-badge">確変!</div>}
        {!kakuhen && combo >= 2 && (
          <div className={`correct-combo tier-${tier}`}>
            <span className="combo-label">連続正解</span>
            <span className="combo-num">
              {combo}
              <small>コンボ</small>
            </span>
          </div>
        )}
        <div className="correct-title-wrap">
          <h1 className="correct-title brush">正解!</h1>
        </div>
        <div className="correct-ball-wrap">
          <span className="ball correct-ball" />
        </div>
        <div className="correct-plus">
          <span className="plus">+{baseReward}</span>
          <span className="unit brush">玉</span>
        </div>

        {/* 確変ボーナス: 演出の途中から出現 */}
        {bonus > 0 && (
          <div className={`correct-bonus${bonusRevealed ? " show" : ""}`}>
            <span className="bonus-label">確変ボーナス</span>
            <span className="bonus-num">+{bonus}</span>
            <span className="bonus-unit">玉</span>
          </div>
        )}

        <section className="gold-frame correct-balance">
          <div className="label">現在の所持玉</div>
          <BallCounter value={displayed} size="md" delta={reward} />
        </section>
      </div>
    </div>
  );
}
