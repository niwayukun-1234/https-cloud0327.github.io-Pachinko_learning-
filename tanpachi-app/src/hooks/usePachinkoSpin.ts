import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizQuestion } from "../data/toeicQuiz";
import type { QuizSpinResult, SpinPhase } from "../types";
import { useQuizModal } from "./useQuizModal";

/**
 * 1回転の演出テンポ(ミリ秒)。
 * 設問3-A「テンポ重視」: 合計 約3秒 + 回答時間。
 */
export type QuizSpinTimings = {
  /** リールが回転する演出 */
  spinMs: number;
  /** 正解/不正解のフラッシュ演出(モーダル内) */
  judgingMs: number;
  /** パチンコの当たり/外れ演出(モーダルを閉じた後) */
  resultMs: number;
};

/**
 * クイズ=抽選のルール設定。
 * ここ1箇所を書き換えるだけで、正解報酬・不正解ペナルティ・演出テンポを
 * 切り替えられるようにまとめている。
 */
export type QuizSpinConfig = {
  /** 1回転あたりの消費玉 */
  spinCost: number;
  /** 不正解時の減算玉(0 なら「増えないだけ」) */
  penalty: number;
  /** 連続正解数から正解報酬を決める */
  rewardFor: (streak: number) => number;
  /** 何連チャンごとに FEVER ボーナスを出すか */
  feverEvery: number;
  /** FEVER ボーナスの加算玉 */
  feverBonus: number;
  timings: QuizSpinTimings;
};

/**
 * 既定ルール
 * - 設問1: 1-B(連続正解ボーナス) 1〜2連=+15 / 3〜4連=+25 / 5連以上=+40、
 *   さらに 5連ごとに +50 の FEVER ボーナス
 * - 設問2: 2-A(不正解は増えないだけ・回転コスト10玉は消費)
 * - 設問3: 3-A(テンポ重視)
 */
export const QUIZ_SPIN_CONFIG: QuizSpinConfig = {
  spinCost: 10,
  penalty: 0,
  rewardFor: (streak) => (streak >= 5 ? 40 : streak >= 3 ? 25 : 15),
  feverEvery: 5,
  feverBonus: 50,
  timings: { spinMs: 900, judgingMs: 1200, resultMs: 1000 },
};

/** 1回転の判定結果 */
export type QuizJudgement = {
  /** ユーザーが選んだ選択肢のインデックス */
  selectedIndex: number;
  correct: boolean;
  /** 加算される玉(正解報酬 + FEVERボーナス) */
  reward: number;
  /** 減算される玉 */
  penalty: number;
  /** この回転を終えた時点の連続正解数 */
  streak: number;
  /** FEVER(大当たり)扱いか */
  jackpot: boolean;
};

type Options = {
  /** 現在の所持玉(回転可能かの判定に使用) */
  balls: number;
  /** 現在の連続正解数(報酬計算に使用) */
  streak: number;
  /** 1回転の結果をストアへ確定させる */
  onCommit: (result: QuizSpinResult) => void;
  config?: QuizSpinConfig;
};

export type UsePachinkoSpin = {
  phase: SpinPhase;
  /** 出題中の問題 */
  question: QuizQuestion | null;
  /** 回答直後の判定(モーダル内のフラッシュ演出用) */
  judgement: QuizJudgement | null;
  /** 確定した結果(パチンコの当たり/外れ演出用) */
  result: QuizJudgement | null;
  /** PUSH 可能か */
  canSpin: boolean;
  /** 進行中(PUSHを無効化すべき)か */
  busy: boolean;
  /** 現在の周回で既に出題した数 */
  drawn: number;
  /** 現在の周回で残っている問題数 */
  remaining: number;
  /** 収録問題数 */
  total: number;
  press: () => void;
  answer: (choiceIndex: number) => void;
  config: QuizSpinConfig;
};

/**
 * 1回転のライフサイクルを一元管理するフック。
 *
 * idle --press()--> spinning --(リール演出)--> quiz --answer(i)--> judging
 *   --(判定フラッシュ)--> result --(当たり/外れ演出)--> idle
 *
 * クイズの正誤がその回転の抽選結果そのものを決定する。
 */
export function usePachinkoSpin({ balls, streak, onCommit, config = QUIZ_SPIN_CONFIG }: Options): UsePachinkoSpin {
  const { current, drawNext, drawn, remaining, total } = useQuizModal();
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [judgement, setJudgement] = useState<QuizJudgement | null>(null);
  const [result, setResult] = useState<QuizJudgement | null>(null);

  const timers = useRef<number[]>([]);
  const phaseRef = useRef<SpinPhase>("idle");

  const setPhaseSafe = useCallback((next: SpinPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const canSpin = phase === "idle" && balls >= config.spinCost;
  const busy = phase !== "idle";

  /** PUSH: リールを短く回転させてからクイズを出す */
  const press = useCallback(() => {
    if (phaseRef.current !== "idle" || balls < config.spinCost) return;
    setJudgement(null);
    setResult(null);
    setPhaseSafe("spinning");
    later(() => {
      const next = drawNext();
      setQuestion(next);
      setPhaseSafe("quiz");
    }, config.timings.spinMs);
  }, [balls, config.spinCost, config.timings.spinMs, drawNext, later, setPhaseSafe]);

  /** 回答: 正誤がその回転の抽選結果を決める */
  const answer = useCallback(
    (choiceIndex: number) => {
      if (phaseRef.current !== "quiz" || !question) return;
      if (choiceIndex < 0 || choiceIndex >= question.choices.length) return;

      const correct = question.correctIndex === choiceIndex;
      const nextStreak = correct ? streak + 1 : 0;
      const jackpot = correct && nextStreak % config.feverEvery === 0;
      const reward = correct ? config.rewardFor(nextStreak) + (jackpot ? config.feverBonus : 0) : 0;

      const judged: QuizJudgement = {
        selectedIndex: choiceIndex,
        correct,
        reward,
        penalty: config.penalty,
        streak: nextStreak,
        jackpot,
      };

      setJudgement(judged);
      setPhaseSafe("judging");

      later(() => {
        // 所持玉・回転数を確定させる
        onCommit({
          quizId: `toeic-${question.id}`,
          word: question.word,
          correct,
          reward,
          penalty: config.penalty,
          cost: config.spinCost,
          streak: nextStreak,
          jackpot,
        });
        setResult(judged);
        setPhaseSafe("result");
        later(() => {
          setQuestion(null);
          setJudgement(null);
          setResult(null);
          setPhaseSafe("idle");
        }, config.timings.resultMs);
      }, config.timings.judgingMs);
    },
    [config, later, onCommit, question, setPhaseSafe, streak],
  );

  return {
    phase,
    question: question ?? current,
    judgement,
    result,
    canSpin,
    busy,
    drawn,
    remaining,
    total,
    press,
    answer,
    config,
  };
}
