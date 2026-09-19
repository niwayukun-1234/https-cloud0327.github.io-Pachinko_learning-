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

/** 学習セッション1問分の解答記録 */
export type SessionAnswer = {
  wordId: string;
  word: string;
  phonetic: string;
  meaning: string;
  /** 選択した意味（未解答は null） */
  selected: string | null;
  correct: boolean;
  /** 解答にかかった秒数 */
  seconds: number;
};

/** 直近に完了した学習セッションの生データ（リザルト画面の入力） */
export type LearnSessionResult = {
  /** セッション識別子（自己ベスト記録の二重反映を防ぐ） */
  id: string;
  finishedAt: string; // ISO
  answers: SessionAnswer[];
  /** このセッションで獲得した玉 */
  earnedBalls: number;
  /** セッション開始時刻 (epoch ms) */
  startedAt: number;
};

/** リザルト画面の表示ランク */
export type ScoreRank = "極" | "秀" | "優" | "良";
export type RankEnglish = "SSS" | "S" | "A" | "B";

/** リザルト画面が必要とする全データ（既存 state + セッション記録から導出） */
export type ResultView = {
  accuracyRate: number;
  correctCount: number;
  totalCount: number;
  score: number;
  isNewRecord: boolean;
  scoreRank: ScoreRank;
  rankEnglish: RankEnglish;
  evalTitle: string;
  evalDescription: string;
  /** 結果ごとの短い講評（次の一歩） */
  nextStep: string;
  heldBalls: number;
  gainedBalls: number;
  /** セッションの学習時間（秒） */
  studyTimeSeconds: number;
  goalMinutes: number;
  todayAccumulatedSeconds: number;
  streakDays: number;
  masteredCount: number;
  level: number;
  /** 次のレベルまでの進捗 (%) */
  expPercent: number;
  /** 1回のパチンコプレイで消費する玉 */
  spinCost: number;
  words: SessionAnswer[];
  /** 解答の速さ（1問あたり平均秒） */
  averageSeconds: number;
  /** 既存 state の通算正答率 (%) */
  totalAccuracy: number;
};
