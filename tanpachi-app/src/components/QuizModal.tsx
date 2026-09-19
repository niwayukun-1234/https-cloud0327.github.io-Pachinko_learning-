import { useCallback } from "react";
import type { QuizQuestion } from "../data/toeicQuiz";
import type { QuizJudgement } from "../hooks/usePachinkoSpin";
import { Fx } from "./Fx";
import { CheckCircle, Speaker, XCircle, Zap } from "./Icons";
import "./QuizModal.css";

type Props = {
  /** 表示 / 非表示 */
  visible: boolean;
  /** 現在の問題データ */
  question: QuizQuestion | null;
  /** 回答直後の判定(フラッシュ演出用) */
  judgement: QuizJudgement | null;
  /** 回答をロックするか(判定中・演出中) */
  disabled: boolean;
  /** 回答時のコールバック(選択肢インデックス) */
  onAnswer: (choiceIndex: number) => void;
  /** クイズタイトル */
  title: string;
  /** 連続正解数 */
  streak: number;
  /** 今周の残り問題数 */
  remaining: number;
  /** 収録問題数 */
  total: number;
};

/** 発音を読み上げる(Web Speech API) */
function speak(word: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

/**
 * 1回転ごとに必ず出題される英単語4択クイズのモーダル。
 *
 * - 背景のパチンコ台は薄暗くぼかして見せる
 * - 4択はパチンコの「入賞口」に対応させ、既存の黒×赤×金の世界観に合わせる
 * - 正解時は金色の光、不正解時は控えめな演出
 * - 回答するとその場で正誤判定が確定する(=クイズが抽選結果そのもの)
 */
export function QuizModal({
  visible,
  question,
  judgement,
  disabled,
  onAnswer,
  title,
  streak,
  remaining,
  total,
}: Props) {
  const handleSpeak = useCallback(() => {
    if (question) speak(question.word);
  }, [question]);

  if (!visible || !question) return null;

  const isJudged = judgement !== null;
  const locked = disabled || isJudged;

  // 7セグ風リール表示: 出題中は「英単語」、判定後は結果を表示
  const reels = isJudged ? (judgement.correct ? ["7", "7", "7"] : ["3", "4", "8"]) : ["英", "単", "語"];

  return (
    <div className="quiz-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`quiz-cabinet ${isJudged ? (judgement.correct ? "is-win" : "is-lose") : ""}`}>
        <Fx sparkles={isJudged && judgement.correct ? 26 : 10} petals={isJudged && judgement.correct ? 8 : 0} />
        {isJudged && judgement.correct && <div className="quiz-flash" aria-hidden />}

        <div className="quiz-inner">
          {/* 上枠: LEDチェイサー + ブランド + 7セグREEL + 戦績 */}
          <div className="quiz-bezel">
            <div className="quiz-leds" aria-hidden>
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className={`quiz-led ${i % 2 === 0 ? "a" : "b"}`}
                  style={{ animationDelay: `${(i % 7) * 0.11}s` }}
                />
              ))}
            </div>
            <div className="quiz-bezel-row">
              <span className="quiz-brand">{title}</span>
              <span className={`quiz-reel ${isJudged && judgement.correct ? "hit" : ""}`}>
                {reels.map((r, i) => (
                  <b key={i}>[{r}]</b>
                ))}
              </span>
            </div>
            <div className="quiz-bezel-meta">
              <span>
                連続正解 <b>{streak}</b> 連
              </span>
              <span>
                残り <b>{remaining}</b> / {total} 問
              </span>
            </div>
          </div>

          {/* 問題 */}
          <div className="quiz-question">
            <div className="quiz-level-row">
              <span className="quiz-level">{question.level}</span>
              <button type="button" className="quiz-speak" onClick={handleSpeak} aria-label="発音を聞く">
                <Speaker size={16} />
                <span>発音</span>
              </button>
            </div>
            <h2 className="quiz-word gold-text">{question.word}</h2>
            <p className="quiz-prompt">この単語の意味を選べ</p>
          </div>

          {/* 判定バナー(回答直後。4択の上に差し込むので選択肢が隠れない) */}
          {isJudged && (
            <div className={`quiz-verdict ${judgement.correct ? "win" : "lose"}`}>
              {judgement.correct ? (
                <>
                  <span className="quiz-verdict-title pop">
                    <CheckCircle size={26} />
                    正解!
                  </span>
                  <span className="quiz-verdict-reward pop">
                    <Zap size={18} />+{judgement.reward}玉
                  </span>
                  {judgement.jackpot && <em className="quiz-verdict-fever pop">FEVER BONUS!</em>}
                </>
              ) : (
                <>
                  <span className="quiz-verdict-title lose pop">
                    <XCircle size={26} />
                    不正解…
                  </span>
                  <span className="quiz-verdict-answer">正解は「{question.correctAnswer}」</span>
                </>
              )}
            </div>
          )}

          {/* 4択(入賞口) */}
          <div className="quiz-choices">
            {question.choices.map((text, i) => {
              const state = !isJudged
                ? ""
                : i === question.correctIndex
                  ? "is-correct"
                  : i === judgement.selectedIndex
                    ? "is-wrong"
                    : "is-dim";
              return (
                <button
                  key={i}
                  type="button"
                  className={`quiz-choice ${state}`}
                  onClick={() => onAnswer(i)}
                  disabled={locked}
                >
                  <span className="quiz-choice-badge">{i + 1}</span>
                  <span className="quiz-choice-text">{text}</span>
                  <span className="quiz-choice-tag">入賞口{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
