import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useNavigate } from "react-router-dom";
import { Home } from "../../components/Icons";
import { QuizModal } from "../../components/QuizModal";
import { QUIZ_TITLE } from "../../data/toeicQuiz";
import { accuracy, useApp } from "../../store/AppContext";
import { ProgressModal } from "./ProgressModal";
import { Board } from "./hanamai/Board";
import { GameAudio } from "./hanamai/audio";
import { useHanamaiSpin } from "./hanamai/useHanamaiSpin";
import "./PachinkoMode.css";

// Vite imports keep assets working under relative/base-path deployments.
const images = import.meta.glob<string>("./hanamai/assets/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});
const asset = (name: string) => images[`./hanamai/assets/${name}.png`];

export function PachinkoMode() {
  const navigate = useNavigate();
  const { state, spinQuiz } = useApp();
  const spin = useHanamaiSpin({
    balls: state.balls,
    streak: state.streak,
    onCommit: spinQuiz,
  });
  const { phase, cut, reels, rush, demo, reward, busy, start, finish } = spin;
  const save = {
    balls: state.balls,
    turns: state.totalSpins,
    wins: state.jackpots,
  };
  const [auto, setAuto] = useState(false);
  const [power, setPower] = useState(3);
  const [sound, setSound] = useState(false);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [modal, setModal] = useState<"settings" | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [volume, setVolume] = useState(0.55);
  const [voice, setVoice] = useState(true);
  const audio = useRef(new GameAudio());
  const toggleSound = (on: boolean) => {
    audio.current.enable(on);
    setSound(on);
    if (on) {
      audio.current.beep(659, 0.15);
      audio.current.speak("花舞、開幕！");
    }
  };
  const tone = useCallback(
    (frequency: number, duration = 0.12, delay = 0) =>
      audio.current.beep(frequency, duration, delay),
    [],
  );
  useEffect(() => {
    const engine = audio.current;
    return () => engine.dispose();
  }, []);
  useEffect(() => {
    if (sound && cut && phase === "spin") audio.current.cue(`cut${cut}`);
  }, [cut, phase, sound]);
  useEffect(() => {
    if (!sound) return;
    if (phase === "quiz") {
      audio.current.stopSpeech();
      return;
    }
    audio.current.cue(phase);
  }, [phase, sound]);
  useEffect(() => {
    if (phase !== "spin" && phase !== "reach") return;
    const id = setInterval(
      () => tone(240, 0.025),
      phase === "reach" ? 120 : 85,
    );
    return () => clearInterval(id);
  }, [phase, tone]);
  useEffect(() => {
    const pause = () => audio.current.enable(sound && !document.hidden);
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [sound]);
  useEffect(() => {
    if (!auto || !spin.canSpin || modal || showProgress) return;
    const id = setTimeout(() => start(), 850);
    return () => clearTimeout(id);
  }, [auto, spin.canSpin, start, modal, showProgress]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.code !== "Space" ||
        e.repeat ||
        modal ||
        showProgress ||
        (e.target instanceof HTMLElement &&
          ["INPUT", "BUTTON"].includes(e.target.tagName))
      )
        return;
      if (phase === "quiz" || phase === "judging") return;
      e.preventDefault();
      if (phase === "push") finish();
      else if (phase === "idle") start();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, start, finish, modal, showProgress]);
  const message = {
    idle: "学んで、咲かせる。その一瞬を。",
    spin: "運命が、廻りはじめる。",
    quiz: "英単語に挑戦！",
    judging: "学習記録を保存しました。",
    reach: "想いよ、届け。",
    push: "一撃に、すべてを。",
    win: "満開の、その先へ。",
    miss: "次の一輪を、咲かせよう。",
  }[phase];
  return (
    <div className={`hanamai-mode ${reduced ? "reduced" : ""}`}>
      <main
        className={`hanamai-game ${reduced ? "reduced " : ""}${phase === "win" ? "celebrating" : ""}`}
      >
        <header className="topbar">
          <div className="brand-art">
            <img src={asset("logo")} alt="パチ単語" />
          </div>
          <div className="balance">
            <span>所持玉</span>
            <strong>
              {save.balls.toLocaleString()}
              <small> 玉</small>
            </strong>
          </div>
          <button
            className="utility home"
            onClick={() => navigate("/home")}
            aria-label="ホームに戻る"
            title="ホームに戻る"
          >
            <b>
              <Home size={20} />
            </b>
            <span>ホーム</span>
          </button>
          <button
            className="utility"
            onClick={() => setModal("settings")}
            aria-label="設定"
          >
            <b>⚙</b>
            <span>設定</span>
          </button>
        </header>
        <section className={`machine ${phase}`} aria-label="花舞パチンコ">
          <div className="ambient-sparks" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  animationDelay: `${i * 0.17}s`,
                }}
              />
            ))}
          </div>
          <div className="energy-ring" aria-hidden="true" />
          <div className="rail rail-left" />
          <div className="rail rail-right" />
          <div className="top-logo">
            <img src={asset("hanamai")} alt="花舞 HANAMAI" />
          </div>
          <div className="cabinet">
            <div className="inner-board">
              <Board
                active={
                  phase === "spin" || phase === "reach" || phase === "win"
                }
                power={power}
                reduced={reduced}
              />
              <div className="hanamai-display">
                <div className="scene">
                  <img
                    src={asset("reference")}
                    alt="桜が舞う和装の少女の演出"
                  />
                </div>
                <div className="screen-shade" />
                <div className="screen-top">
                  <span>{rush ? `桜 RUSH 残り${rush}回` : "通常 1/5"}</span>
                  <span>{demo ? "DEMO" : `第 ${save.turns} 回転`}</span>
                </div>
                <div className="screen-petals">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        left: `${i * 9}%`,
                        animationDelay: `${i * 0.4}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="screen-caption">
                  {phase === "reach"
                    ? "激 熱"
                    : phase === "win"
                      ? "桜 花 満 開"
                      : phase === "push"
                        ? "一撃で、咲かせろ。"
                        : rush
                          ? "桜 RUSH"
                          : "桜花爛漫"}
                </div>
                <div className="reels">
                  {reels.map((n, i) => (
                    <div
                      className={`${n === 7 ? "seven" : ""} ${phase === "spin" || (phase === "reach" && i === 1) ? "rolling" : ""}`}
                      key={i}
                    >
                      {n}
                      <small>✿</small>
                    </div>
                  ))}
                </div>
                <div className="screen-bottom">{message}</div>
                <div className="screen-sweep" aria-hidden="true" />
              </div>
              <img className="side left" src={asset("left")} alt="千本桜" />
              <img className="side right" src={asset("right")} alt="一撃必勝" />
              <div className="glass-channel channel-left" />
              <div className="glass-channel channel-right" />
              <div className="pocket-flower">
                <img src={asset("sakura")} alt="桜" />
              </div>
              <img
                className="chance-ornament"
                src={asset("chance")}
                alt="CHANCE GO"
              />
              <div className="hold-indicators">
                {[0, 1, 2, 3].map((i) => (
                  <span className={busy ? "lit" : ""} key={i}>
                    ✿
                  </span>
                ))}
              </div>
              <div className="entry-pocket">
                <span>START</span>
                <i />
              </div>
              <div className="tray" aria-hidden="true" />
            </div>
          </div>
          {cut > 0 && phase === "spin" && (
            <div
              key={`${save.turns}-${cut}`}
              className={`spectacle spectacle-${cut}`}
              aria-hidden="true"
            >
              <div className="speed-lines" />
              <div className="slash slash-one" />
              <div className="slash slash-two" />
              {cut === 2 && (
                <div className="portrait-cut">
                  <img src={asset("reference")} alt="" />
                </div>
              )}
              <div className="cut-title">
                <small>
                  {cut === 1
                    ? "SAKURA BURST"
                    : cut === 2
                      ? "HANAMAI AWAKENING"
                      : "BLOOMING STORY"}
                </small>
                <strong>
                  {cut === 1
                    ? "桜、舞え。"
                    : cut === 2
                      ? "花 舞 覚 醒"
                      : "咲き誇れ！"}
                </strong>
                <span>
                  {cut === 1
                    ? "千の花びらが、運命を彩る。"
                    : cut === 2
                      ? "この一瞬に、想いを込めて。"
                      : "物語は、まだ終わらない。"}
                </span>
              </div>
            </div>
          )}
          {phase === "miss" && (
            <div className="miss-burst" aria-hidden="true">
              <div className="speed-lines" />
              <strong>次の一花へ</strong>
              <span>SAKURA STORY CONTINUES</span>
              <div className="petal-burst">
                {Array.from({ length: 18 }, (_, i) => (
                  <i
                    key={i}
                    style={
                      {
                        "--angle": `${i * 20}deg`,
                        "--distance": `${70 + (i % 4) * 25}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            </div>
          )}
          {(phase === "reach" || phase === "push") && (
            <div className="cut-in">
              {phase === "reach" ? (
                <img src={asset("chance")} alt="CHANCE" />
              ) : (
                <button onClick={finish} aria-label="PUSHで結果を開く">
                  <img src={asset("push")} alt="PUSH" />
                  <span>押して、咲かせろ。</span>
                </button>
              )}
            </div>
          )}
          {phase === "win" && (
            <div className="win-overlay">
              <img src={asset("hanamai")} alt="花舞" />
              <span>桜 花 満 開</span>
              <strong>大当たり</strong>
              <div>
                +{reward.toLocaleString()}
                <small> 玉</small>
              </div>
              <p>{demo ? "演出体験 — DEMO" : "桜 RUSH 突入 · 5回転"}</p>
            </div>
          )}
        </section>
        <section className="console" aria-label="操作パネル">
          <button
            className="audio-toggle"
            aria-pressed={sound}
            onClick={() => toggleSound(!sound)}
          >
            {sound ? "♪ 音声ON" : "♪ 音声OFF"}
          </button>
          <div className="left-controls">
            <button
              className={`auto-button ${auto ? "on" : ""}`}
              role="switch"
              aria-checked={auto}
              onClick={() => setAuto((a) => !a)}
              aria-label="オート"
            >
              <span>オート</span>
              <strong>{auto ? "ON" : "OFF"}</strong>
            </button>
            <div className="speed-control">
              <span>打ち出し速度</span>
              <div>
                <button
                  aria-label="速度を下げる"
                  disabled={power === 1}
                  onClick={() => setPower((p) => Math.max(1, p - 1))}
                >
                  −
                </button>
                <div
                  className="speed-bars"
                  role="meter"
                  aria-label="打ち出し速度"
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-valuenow={power}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i
                      key={i}
                      className={i <= power ? "lit" : ""}
                      style={{ height: `${10 + i * 4}px` }}
                    />
                  ))}
                </div>
                <button
                  aria-label="速度を上げる"
                  disabled={power === 5}
                  onClick={() => setPower((p) => Math.min(5, p + 1))}
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
          <div className="launch-group">
            <button
              className="launch"
              disabled={
                modal !== null ||
                showProgress ||
                (phase !== "idle" && phase !== "push") ||
                (save.balls < 10 && phase !== "push")
              }
              onClick={() => (phase === "push" ? finish() : start())}
              aria-label={phase === "push" ? "PUSHで結果を開く" : "発射する"}
            >
              <img src={asset("push")} alt="PUSH 発射" />
            </button>
            <span className="play-status" aria-live="polite">
              {phase === "idle"
                ? save.balls < 10
                  ? "玉不足：メニューから学習へ"
                  : "タップで発射 · 10玉"
                : phase === "win"
                  ? "大当たり！"
                  : phase === "push"
                    ? "PUSHを押せ！"
                    : phase === "reach"
                      ? "激熱リーチ！"
                      : phase === "spin"
                        ? "変動中"
                        : phase === "quiz"
                          ? "英単語に答えよう"
                          : phase === "judging"
                            ? "回答を記録しました"
                            : "次の回転へ"}
            </span>
          </div>
          <button
            className="handle"
            onClick={() => setPower((p) => (p === 5 ? 1 : p + 1))}
            aria-label={`ハンドル：速度${power}、タップで変更`}
          >
            <img src={asset("handle")} alt="ハンドル" />
          </button>
          <div className="lower-tray" aria-hidden="true" />
        </section>
        {phase === "win" && !reduced && (
          <div className="confetti">
            {Array.from({ length: 45 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  animationDelay: `${i * 0.045}s`,
                  background: i % 2 ? "#ffc94e" : "#ff92b0",
                }}
              />
            ))}
          </div>
        )}
        {modal && (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label="演出設定"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close"
                autoFocus
                onClick={() => setModal(null)}
              >
                閉じる ×
              </button>
              <h2>演出設定</h2>
              <label className="setting-row">
                サウンド
                <input
                  type="checkbox"
                  checked={sound}
                  onChange={(e) => toggleSound(e.target.checked)}
                />
              </label>
              <label className="setting-row">
                音量 {Math.round(volume * 100)}%
                <input
                  aria-label="音量"
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    audio.current.setVolume(v);
                  }}
                />
              </label>
              <label className="setting-row">
                掛け声
                <input
                  type="checkbox"
                  checked={voice}
                  onChange={(e) => {
                    setVoice(e.target.checked);
                    audio.current.voice = e.target.checked;
                    if (!e.target.checked) audio.current.stopSpeech();
                  }}
                />
              </label>
              <label className="setting-row">
                動きを抑える
                <input
                  type="checkbox"
                  checked={reduced}
                  onChange={(e) => setReduced(e.target.checked)}
                />
              </label>
              <p>
                掛け声は端末の日本語音声です。英単語の出題中は掛け声を止め、発音を聞けるようにしています。
              </p>
            </section>
          </div>
        )}
      </main>
      <QuizModal
        visible={phase === "quiz" || phase === "judging"}
        question={spin.question}
        judgement={spin.judgement}
        disabled={phase === "judging"}
        onAnswer={spin.answer}
        title={QUIZ_TITLE}
        streak={state.streak}
        remaining={spin.remaining}
        total={spin.total}
        independentLottery
      />
      <ProgressModal
        open={showProgress}
        onClose={() => setShowProgress(false)}
        answers={spin.answers}
        startedAt={spin.startedAt}
        drawn={spin.drawn}
        total={spin.total}
        balls={state.balls}
        streak={state.streak}
        totalAccuracy={accuracy(state)}
      />
    </div>
  );
}
