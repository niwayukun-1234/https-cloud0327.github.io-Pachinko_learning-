import { useCallback, useRef, useState } from "react";
import { QUIZ_QUESTIONS, type QuizQuestion } from "../data/toeicQuiz";

/** Fisher–Yates シャッフル(非破壊) */
function shuffle<T>(input: readonly T[]): T[] {
  const list = [...input];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** 全問を1周する出題順(問題インデックスのデッキ)を作る */
function buildDeck(size: number): number[] {
  return shuffle(Array.from({ length: size }, (_, i) => i));
}

export type UseQuizModal = {
  /** 現在出題中の問題(未出題なら null) */
  current: QuizQuestion | null;
  /** 次の1問を引く(セッション内で重複しない) */
  drawNext: () => QuizQuestion;
  /** 出題プールを初期化する */
  resetPool: () => void;
  /** 現在の周回で既に出題した数 */
  drawn: number;
  /** 現在の周回で残っている問題数 */
  remaining: number;
  /** 収録問題数 */
  total: number;
};

/**
 * クイズの出題ロジック(ランダム選出・重複回避)。
 *
 * - `questions` からランダムに1問選ぶ
 * - 一度出た問題は、全問を出題し終えるまで重複しない
 * - 全100問を出題し終えたら出題プールをリセットして再出題可能
 */
export function useQuizModal(): UseQuizModal {
  const total = QUIZ_QUESTIONS.length;
  const deckRef = useRef<number[]>([]);
  const cursorRef = useRef(0);
  const [current, setCurrent] = useState<QuizQuestion | null>(null);
  const [drawn, setDrawn] = useState(0);

  const drawNext = useCallback((): QuizQuestion => {
    // 初回、または1周し終えたら新しいデッキを組む(=プールのリセット)
    if (deckRef.current.length === 0 || cursorRef.current >= deckRef.current.length) {
      deckRef.current = buildDeck(total);
      cursorRef.current = 0;
      setDrawn(0);
    }
    const index = deckRef.current[cursorRef.current];
    cursorRef.current += 1;
    const question = QUIZ_QUESTIONS[index];
    setCurrent(question);
    setDrawn((d) => d + 1);
    return question;
  }, [total]);

  const resetPool = useCallback(() => {
    deckRef.current = buildDeck(total);
    cursorRef.current = 0;
    setDrawn(0);
  }, [total]);

  return {
    current,
    drawNext,
    resetPool,
    drawn,
    remaining: Math.max(0, total - drawn),
    total,
  };
}
