import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BallCounter } from "../../components/BallCounter";
import { Fx } from "../../components/Fx";
import { useApp } from "../../store/AppContext";
import correctSfx from "../../assets/correct.mp3";
import kakuhenSfx from "../../assets/kakuhen.mp3";
import tripleSfx from "../../assets/triple.mp3";
import "./Correct.css";

type LocState = {
  word?: string;
  reward?: number;
  bonus?: number;
  combo?: number;
  kakuhen?: boolean;
  finished?: boolean;
};

// 通常の正解演出を表示してから次へ進むまでの時間 (ms)
const HOLD_MS = 2000;
// 獲得玉数に比例してあふれるパチンコ玉の数（下限/上限＝「あふれる感」と描画負荷の両立）
const FLOOD_MIN = 24;
const FLOOD_MAX = 200;
// 3連続正解（音声再生）時は上から50個の玉が降る
const TRIPLE_BALLS = 50;
// 音声が取れなかった場合の保険待ち時間 (ms)
const KAKUHEN_FALLBACK_MS = 11000;
const TRIPLE_FALLBACK_MS = 17000;

/** 連続正解の回数を 1〜5 の演出レベルに変換 */
function fxTier(combo: number, kakuhen: boolean) {
  if (kakuhen) return 5;
  if (combo >= 8) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

// 再生中の効果音を保持。画面遷移後も鳴らし続け、次の音と重ならないようにする。
let currentSfx: HTMLAudioElement | null = null;
function playSfx(src: string): HTMLAudioElement {
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
  return audio;
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
    finished = false,
  } = (loc.state as LocState | null) ?? {};

  const baseReward = Math.max(0, reward - bonus);
  const tier = fxTier(combo, kakuhen);
  // 3連続正解（確変を除く）: 添付音楽を再生し、正解が一回転＋上から玉50個
  const isTriple = combo === 3 && !kakuhen;

  // 再生する効果音を決定
  //  - 確変中: 確変用音源
  //  - 3連続正解: 添付音楽
  //  - それ以外: 正解音
  const sfx = kakuhen ? kakuhenSfx : isTriple ? tripleSfx : correctSfx;
  // 音声が終わるまで正解の表記を保持するか（確変時 / 3連続正解時）
  const holdUntilSoundEnds = kakuhen || isTriple;

  const [displayed, setDisplayed] = useState(state.balls - reward);
  const [bonusRevealed, setBonusRevealed] = useState(false);
  // StrictMode の二重実行でも効果音を一度だけ鳴らすためのガード
  const playedRef = useRef(false);
  const soundRef = useRef<HTMLAudioElement | null>(null);

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

  // 正解効果音を再生。StrictMode の二重実行でも一度だけ鳴らす。
  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    // 音源は自然再生のままにして、遷移時も鳴り続けるようにする
    soundRef.current = playSfx(sfx);
  }, [sfx]);

  const next = useCallback(() => {
    if (finished) {
      sessionStorage.removeItem("tanpachi:session");
      navigate("/home", { replace: true });
    } else {
      navigate("/learn", { replace: true });
    }
  }, [finished, navigate]);

  // 自動的に次へ進む。
  //  - 通常: 2秒で進む
  //  - 確変 / 3連続正解: 音声が終わるまで正解の表記を保持してから進む
  useEffect(() => {
    if (!holdUntilSoundEnds) {
      const t = window.setTimeout(next, HOLD_MS);
      return () => window.clearTimeout(t);
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      next();
    };
    const fallbackMs = kakuhen ? KAKUHEN_FALLBACK_MS : TRIPLE_FALLBACK_MS;
    const timer = window.setTimeout(finish, fallbackMs);
    const audio = soundRef.current;
    const onEnded = () => finish();
    if (audio) audio.addEventListener("ended", onEnded);
    return () => {
      window.clearTimeout(timer);
      if (audio) audio.removeEventListener("ended", onEnded);
    };
  }, [holdUntilSoundEnds, kakuhen, next]);

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

  // 上から降ってくる（あふれる）パチンコ玉。
  // 3連続正解のときは音声に合わせて50個、それ以外は獲得玉数に比例。
  const floodCount = isTriple ? TRIPLE_BALLS : Math.min(Math.max(reward, FLOOD_MIN), FLOOD_MAX);
  const flood = useMemo(
    () =>
      Array.from({ length: floodCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * (isTriple ? 2.2 : 0.9),
        dur: 1.0 + Math.random() * 1.2,
        size: 24 + Math.random() * 28,
      })),
    [floodCount, isTriple],
  );

  return (
    <div className={`correct tier-${tier}${kakuhen ? " kakuhen" : ""}`}>
      <Fx rays sparkles={intensity.sparkles} petals={intensity.petals} />

      {/* 上から降ってくるパチンコ玉 */}
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
          <div className={`correct-title-rot${kakuhen ? " spin" : ""}${isTriple ? " one-spin" : ""}`}>
            <h1 className="correct-title brush">正解!</h1>
          </div>
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
