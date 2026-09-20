import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BallCounter } from "../../components/BallCounter";
import { Fx } from "../../components/Fx";
import { useApp } from "../../store/AppContext";
import correctSfx from "../../assets/correct.mp3";
import kakuhenSfx from "../../assets/kakuhen.mp3";
import tripleSfx from "../../assets/triple.mp3";
import { playBonus, playSfx, stopSfx } from "../../lib/sfx";
import { isBigBonus, midBonusTier } from "../../lib/bonus";
import { useSettings } from "../../lib/settings";
import "./Correct.css";

type LocState = {
  word?: string;
  reward?: number;
  bonus?: number;
  // 演出の途中で出現する中間ボーナス（+50/+100/+150 など）
  midBonus?: number;
  combo?: number;
  kakuhen?: boolean;
  // 確変中の1回目の正解だけ専用BGM＆大きな演出にする
  kakuhenFirst?: boolean;
  finished?: boolean;
};

// 通常の正解演出を表示してから次へ進むまでの時間 (ms)
const HOLD_MS = 2000;
// 獲得玉数に比例してあふれるパチンコ玉の数（下限/上限＝「あふれる感」と描画負荷の両立）
const FLOOD_MIN = 24;
const FLOOD_MAX = 200;
// 3連続正解（音声再生）時は上から50個の玉が降る
const TRIPLE_BALLS = 50;
// 長い演出の実際の音源長 (ms)：中間ボーナスの表示タイミング（半分）に使う
const KAKUHEN_MS = 14300;
const TRIPLE_MS = 8100;
// 音声が取れなかった場合の保険待ち時間 (ms)
const KAKUHEN_FALLBACK_MS = 17000;
const TRIPLE_FALLBACK_MS = 11000;
// 中間ボーナスで降らせる玉の上限（描画負荷対策）
const MID_FLOOD_MAX = 150;

/** 連続正解の回数を 1〜4 の演出レベルに変換 */
function fxTier(combo: number) {
  if (combo >= 8) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export function Correct() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { sound } = useSettings();
  const loc = useLocation();
  const {
    reward = 10,
    bonus = 0,
    midBonus = 0,
    combo = 1,
    kakuhen = false,
    kakuhenFirst = false,
    finished = false,
  } = (loc.state as LocState | null) ?? {};

  // 確変の1回目だけ専用BGM＆豪華演出。2回目以降は通常の正解演出・音にする。
  const big = kakuhen && kakuhenFirst;
  // 基礎報酬（コンボ分）と確変ボーナス。中間ボーナスは別枠で加算される。
  const baseReward = Math.max(0, reward - bonus);
  // 確変中でも2回目以降は通常の演出レベルに戻す
  const tier = big ? 5 : fxTier(combo);
  // 3連続正解（確変を除く）: 添付音楽を再生し、正解が一回転＋上から玉50個
  const isTriple = combo === 3 && !kakuhen;
  // 「長い演出」（確変1回目 / 3連続正解）のときだけ中間ボーナスを出す
  const longAnim = big || isTriple;
  const showMid = longAnim && midBonus > 0;
  const midBig = isBigBonus(midBonus);
  // 中間ボーナスの玉数が大きいほど演出・音を豪華にするためのレベル(1〜4)
  const midTier = showMid ? midBonusTier(midBonus) : 0;
  const animMs = big ? KAKUHEN_MS : isTriple ? TRIPLE_MS : HOLD_MS;

  // この問題に入る前の所持玉（報酬・中間ボーナスを差し引いて求める）
  const startBalls = state.balls - reward - midBonus;
  // 中間ボーナスを受け取る前の表示目標（基礎報酬＋確変ボーナスまで）
  const midStageTarget = state.balls - midBonus;

  // 再生する効果音を決定
  //  - 確変の1回目: 確変用音源（長め）
  //  - 3連続正解: 添付音楽
  //  - それ以外（確変2回目以降を含む）: 通常の正解音
  const sfx = big ? kakuhenSfx : isTriple ? tripleSfx : correctSfx;
  // 音声が終わるまで正解の表記を保持するか（確変1回目 / 3連続正解時）
  const holdUntilSoundEnds = big || isTriple;

  const [displayed, setDisplayed] = useState(startBalls);
  const [bonusRevealed, setBonusRevealed] = useState(false);
  const [midRevealed, setMidRevealed] = useState(false);
  // StrictMode の二重実行でも効果音を一度だけ鳴らすためのガード
  const playedRef = useRef(false);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const displayedRef = useRef(startBalls);

  // 所持玉のカウントアップ（現在値→指定値へイージング）
  const animateTo = useCallback((to: number, dur: number) => {
    const from = displayedRef.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      displayedRef.current = v;
      setDisplayed(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // まず「基礎報酬＋確変ボーナス」までカウントアップ
  useEffect(() => {
    return animateTo(midStageTarget, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 中間ボーナスの出現時に、さらに加算して最終値までカウントアップ
  useEffect(() => {
    if (!showMid || !midRevealed) return;
    return animateTo(state.balls, 800);
  }, [animateTo, showMid, midRevealed, state.balls]);

  // 確変ボーナスを演出の前半で出現させる
  useEffect(() => {
    if (bonus <= 0) return;
    const t = window.setTimeout(() => setBonusRevealed(true), 700);
    return () => window.clearTimeout(t);
  }, [bonus]);

  // 中間ボーナスは「演出のちょうど半分」で出現
  useEffect(() => {
    if (!showMid) return;
    const t = window.setTimeout(() => setMidRevealed(true), animMs * 0.5);
    return () => window.clearTimeout(t);
  }, [showMid, animMs]);

  // 中間ボーナス出現の瞬間に、規模に応じたファンファーレを鳴らす
  useEffect(() => {
    if (!showMid || !midRevealed) return;
    playBonus(midTier);
  }, [showMid, midRevealed, midTier]);

  // 正解効果音を再生。StrictMode の二重実行でも一度だけ鳴らす。
  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    soundRef.current = playSfx(sfx);
  }, [sfx]);

  const next = useCallback(() => {
    // 演出が終わったら音楽も必ず止める（確変終了後も鳴り続けるのを防ぐ）
    stopSfx();
    if (finished) {
      sessionStorage.removeItem("tanpachi:session");
      navigate("/home", { replace: true });
    } else {
      navigate("/learn", { replace: true });
    }
  }, [finished, navigate]);

  // 自動的に次へ進む。
  //  - 通常: 2秒で進む
  //  - 確変1回目 / 3連続正解: 音声が終わるまで正解の表記を保持してから進む
  //  - ただし音がオフのときは待たずに演出の長さで進む
  useEffect(() => {
    if (!holdUntilSoundEnds || !sound) {
      const wait = holdUntilSoundEnds ? animMs : HOLD_MS;
      const t = window.setTimeout(next, wait);
      return () => window.clearTimeout(t);
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      next();
    };
    const fallbackMs = big ? KAKUHEN_FALLBACK_MS : TRIPLE_FALLBACK_MS;
    const timer = window.setTimeout(finish, fallbackMs);
    const audio = soundRef.current;
    const onEnded = () => finish();
    if (audio) audio.addEventListener("ended", onEnded);
    return () => {
      window.clearTimeout(timer);
      if (audio) audio.removeEventListener("ended", onEnded);
    };
  }, [holdUntilSoundEnds, big, sound, animMs, next]);

  // コンボ/確変が進むほど演出がどんどん豪華になる
  const intensity = useMemo(
    () => ({
      sparkles: 40 + combo * 12 + (big ? 40 : 0),
      petals: 8 + combo * 4,
      coins: 24 + combo * 6 + (big ? 30 : 0),
      rings: 3 + Math.min(combo, 6) + (big ? 3 : 0),
    }),
    [combo, big],
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

  // 中間ボーナス分の追加の玉（演出の途中で降ってくる）
  const midFlood = useMemo(
    () =>
      Array.from({ length: Math.min(midBonus, MID_FLOOD_MAX) }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.4,
        dur: 1.0 + Math.random() * 1.4,
        size: 26 + Math.random() * 30,
      })),
    [midBonus],
  );

  return (
    <div className={`correct tier-${tier}${big ? " kakuhen" : ""}`}>
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

      {/* 中間ボーナス分の玉（演出の途中から降ってくる） */}
      {showMid && midRevealed && (
        <div className="correct-ball-flood mid-flood" aria-hidden>
          {midFlood.map((b) => (
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
      )}

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
      {big && <div className="correct-kakuhen-flash" aria-hidden />}
      {/* 中間ボーナス: 玉数(tier)が大きいほど演出を重ねて豪華にする */}
      {showMid && midRevealed && (
        <>
          <div className={`correct-mid-flash mid-tier-${midTier}`} aria-hidden />
          {midTier >= 2 && <div className={`correct-mid-burst mid-tier-${midTier}`} aria-hidden />}
          {midTier >= 3 && (
            <div className="correct-mid-fireworks" aria-hidden>
              {Array.from({ length: midTier * 4 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    left: `${8 + i * (84 / (midTier * 4))}%`,
                    top: `${14 + (i % 4) * 18}%`,
                    animationDelay: `${0.1 + i * 0.16}s`,
                  }}
                />
              ))}
            </div>
          )}
          {midTier >= 4 && <div className="correct-mid-rainbow" aria-hidden />}
        </>
      )}
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
        {big && <div className="correct-kakuhen-badge">確変!</div>}
        {!big && combo >= 2 && (
          <div className={`correct-combo tier-${tier}`}>
            <span className="combo-label">連続正解</span>
            <span className="combo-num">
              {combo}
              <small>コンボ</small>
            </span>
          </div>
        )}
        <div className="correct-title-wrap">
          <div className={`correct-title-rot${big ? " spin" : ""}${isTriple ? " one-spin" : ""}`}>
            {/* 中間ボーナスと共に「正解」が回転しながら拡大する */}
            <div className={`correct-title-pop${midRevealed && showMid ? " pop" : ""}`}>
              <h1 className="correct-title brush">正解!</h1>
            </div>
          </div>
        </div>
        <div className="correct-ball-wrap">
          <span className="ball correct-ball" />
        </div>
        <div className="correct-plus">
          <span className="plus">+{baseReward}</span>
          <span className="unit brush">玉</span>
        </div>

        {/* 確変ボーナス: 演出の前半から出現 */}
        {bonus > 0 && (
          <div className={`correct-bonus${bonusRevealed ? " show" : ""}`}>
            <span className="bonus-label">確変ボーナス</span>
            <span className="bonus-num">+{bonus}</span>
            <span className="bonus-unit">玉</span>
          </div>
        )}

        {/* 中間ボーナス: 演出のちょうど半分で出現（＋正解文字の回転・拡大） */}
        {showMid && (
          <div
            className={`correct-bonus correct-midbonus mid-tier-${midTier}${
              midRevealed ? " show" : ""
            }${midBig ? " big" : ""}`}
          >
            <span className="bonus-label">{midBig ? "大当たり!" : "スペシャルボーナス"}</span>
            <span className="bonus-num">+{midBonus}</span>
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
