export type Word = {
  id: string;
  word: string;
  phonetic: string;
  meaning: string;
  choices: string[]; // includes the correct meaning
};

export type WordStatus = {
  learned: boolean;
  weak: boolean;
  starred: boolean;
};

export type BallHistoryEntry = {
  id: string;
  at: string; // ISO
  delta: number;
  reason: string;
};

export type RewardCategory = "item" | "bonus" | "custom";

export type Reward = {
  id: string;
  name: string;
  cost: number;
  category: RewardCategory;
  icon: "sakura" | "premium" | "title" | "theme" | "sound";
};

export type MenuItem = {
  label: string;
  badge?: number;
  trailing?: string;
  icon: string;
};

/**
 * クイズ1問分の結果を、1回転分の抽選結果としてまとめたもの。
 *
 * 既存の `ANSWER` / `SPIN` を別々に呼ぶと玉が2回動いて不自然になるため、
 * 「クイズ＝抽選」を1アクションで反映するための型。
 */
export type QuizSpinResult = {
  /** クイズデータ上のID(例: "toeic-1") */
  quizId: string;
  /** 出題された英単語 */
  word: string;
  /** 正解したか */
  correct: boolean;
  /** 正解時の加算玉(不正解は 0) */
  reward: number;
  /** 不正解時の減算玉(案2-Aでは 0) */
  penalty: number;
  /** 回転コスト(消費玉) */
  cost: number;
  /** この回転を終えた時点の連続正解数 */
  streak: number;
  /** FEVER(大当たり)扱いか */
  jackpot: boolean;
};

/** 1回転の演出フェーズ */
export type SpinPhase = "idle" | "spinning" | "quiz" | "judging" | "result";
