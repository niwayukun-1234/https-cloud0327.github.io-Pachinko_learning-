import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fx } from "../../components/Fx";
import { BookOpen, Gear } from "../../components/Icons";
import { Logo } from "../../components/Logo";
import { QuizModal } from "../../components/QuizModal";
import { QUIZ_TITLE } from "../../data/toeicQuiz";
import { usePachinkoSpin } from "../../hooks/usePachinkoSpin";
import { accuracy, useApp } from "../../store/AppContext";
import { ProgressModal } from "./ProgressModal";
import "./PachinkoMode.css";

const SYMBOLS = ["7", "桜", "玉", "学", "勝", "富"];

/** 出題中に表示するリール(モーダルの背後で回っている想定) */
const QUIZ_REELS = ["英", "単", "語"];

/** 外れ演出のリール(揃わない) */
const MISS_REELS = ["3", "4", "8"];

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

export function PachinkoMode() {
  const navigate = useNavigate();
  const { state, spinQuiz } = useApp();
  const [auto, setAuto] = useState(false);
  const [fxOn, setFxOn] = useState(true);
  const [rolling, setRolling] = useState<string[]>(["た", "ん", "パ"]);
  // 途中結果のモーダル表示。ゲーム状態には一切触れない(開閉するだけ)。
  const [showProgress, setShowProgress] = useState(false);

  const spin = usePachinkoSpin({
    balls: state.balls,
    streak: state.streak,
    onCommit: spinQuiz,
  });

  const { phase, question, judgement, result, canSpin, busy, press, answer } = spin;
  const { spinCost } = spin.config;

  // リール演出: 回転中はランダム、それ以外は位相に応じた固定表示
  useEffect(() => {
    if (phase !== "spinning") return;
    const id = window.setInterval(() => {
      setRolling([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 70);
    return () => window.clearInterval(id);
  }, [phase]);

  // オート: PUSH可能になったら自動で押す(クイズの回答はプレイヤーが行う)
  useEffect(() => {
    if (!auto || !canSpin) return;
    const t = window.setTimeout(() => press(), 450);
    return () => window.clearTimeout(t);
  }, [auto, canSpin, press]);

  const isWin = result?.correct === true;
  const isMiss = result !== null && !result.correct;

  // パチンコ台のリール表示
  const reels: string[] =
    phase === "spinning" ? rolling : isWin ? ["7", "7", "7"] : isMiss ? MISS_REELS : QUIZ_REELS;

  const showModal = phase === "quiz" || phase === "judging";

  return (
    <div className={`pachi ${isWin ? "jackpot" : ""}`}>
      <Fx sparkles={30} petals={fxOn ? 10 : 0} rays={isWin} />
      <header className="pachi-header">
        <button className="back-ghost" onClick={() => navigate("/home")} aria-label="ホームへ">
          ‹
        </button>
        <div className="pachi-title">
          <span className="deco">❮</span>
          <span>パチンコモード</span>
          <span className="deco">❯</span>
        </div>
        <button className="icon-btn" aria-label="設定" onClick={() => navigate("/mypage")}>
          <Gear size={22} />
        </button>
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
          <span className="label">連続正解</span>
          <span className="value">
            <b>{state.streak}</b>
            <small>連</small>
          </span>
        </div>
      </section>

      {/* 途中結果: 現在までの進捗を見るだけ。ゲームは終了しない */}
      <button
        type="button"
        className="p-outcome-bar"
        onClick={() => setShowProgress(true)}
        aria-label="途中結果を見る（ゲームは続きます）"
      >
        <span className="l">
          <BookOpen size={14} />
          <span>途中結果</span>
        </span>
        <span className="note">
          {spin.drawn}/{spin.total}問目 ・ ゲームは続きます
        </span>
      </button>

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
                    className={`reel ${phase === "spinning" ? "rolling" : "stopped"} ${isWin ? "hit" : ""}`}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <div className="pins" aria-hidden>
                {Array.from({ length: 24 }, (_, i) => (
                  <i
                    key={i}
                    style={{ left: `${(i % 8) * 13 + 6}%`, top: `${Math.floor(i / 8) * 26 + 10}%` }}
                  />
                ))}
              </div>
              <span className="kanji-badge left brush">学</span>
              <span className="kanji-badge right brush">勝</span>
            </div>
          </div>
        </div>
        {isWin && result && (
          <div className="jackpot-banner pop">
            <span className="brush">大当たり!</span>
            <span className="win">+{result.reward}玉</span>
          </div>
        )}
        {isMiss && (
          <div className="miss-banner pop">
            <span>ハズレ… 正解は「{question?.correctAnswer ?? ""}」</span>
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
          onClick={press}
          disabled={busy || !canSpin}
          aria-label="PUSH"
        >
          <span className="push-face">PUSH</span>
        </button>
        <div className="control-col">
          <button className="toggle menu-btn" onClick={() => navigate("/rewards")}>
            <span>🎁</span>
            <b>メニュー</b>
          </button>
          <span className="cost-hint">1回 {spinCost}玉</span>
        </div>
      </section>

      <footer className="pachi-footer">
        <p className="brush">
          その一打が、
          <br />
          未来の自分を変えていく。
        </p>
      </footer>

      {!canSpin && phase === "idle" && (
        <div className="no-balls">
          玉が足りません。<button onClick={() => navigate("/learn")}>英単語を学んで玉を集める</button>
        </div>
      )}

      {/* 1回転=1問の英単語クイズ。背景のパチンコ台は薄暗くぼかして見せる */}
      <QuizModal
        visible={showModal}
        question={question}
        judgement={judgement}
        disabled={phase === "judging"}
        onAnswer={answer}
        title={QUIZ_TITLE}
        streak={state.streak}
        remaining={spin.remaining}
        total={spin.total}
      />

      {/* プレイ途中の結果確認。開閉してもゲームは継続したまま */}
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
