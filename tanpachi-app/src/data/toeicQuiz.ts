import rawQuiz from "./toeicQuiz.json";

/**
 * TOEIC 英単語クイズのデータ定義。
 *
 * `toeicQuiz.json` のフォーマットは仕様で指定された構造をそのまま使用しており、
 * このファイルでは JSON を型付けして読み出すだけに留めている(データは改変しない)。
 */
export type QuizQuestion = {
  id: number;
  word: string;
  level: string;
  /** 正解の日本語訳 */
  correctAnswer: string;
  /** 4択(正解を含む・シャッフル済み) */
  choices: string[];
  /** `choices` 内での正解の位置 */
  correctIndex: number;
};

export type QuizDataset = {
  title: string;
  count: number;
  questions: QuizQuestion[];
};

/** 読み込んだクイズデータセット */
export const TOEIC_QUIZ: QuizDataset = rawQuiz as QuizDataset;

/** 出題プールとなる問題配列 */
export const QUIZ_QUESTIONS: QuizQuestion[] = TOEIC_QUIZ.questions;

/** クイズのタイトル(モーダルの見出しに使用) */
export const QUIZ_TITLE: string = TOEIC_QUIZ.title;

/** 収録問題数 */
export const QUIZ_TOTAL: number = QUIZ_QUESTIONS.length;

/**
 * 指定した選択肢が正解かどうかを判定する。
 * `correctIndex` を唯一の正解ソースとして扱う。
 */
export function isCorrectChoice(question: QuizQuestion, choiceIndex: number): boolean {
  return question.correctIndex === choiceIndex;
}
