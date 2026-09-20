import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { BallHistoryEntry, QuizSpinResult, WordStat, WordStatus } from "../types";
import { WORDS } from "../data/words";

export type AppState = {
  userName: string;
  level: number;
  exp: number; // toward next level
  expToNext: number;
  balls: number;
  totalSpins: number;
  jackpots: number;
  streak: number; // パチンコ内の連続正解数
  todayMinutes: number;
  goalMinutes: number;
  learnedCount: number;
  streakDays: number;
  correct: number;
  answered: number;
  /** これまでのセッションの最高スコア（自己ベスト判定に使う） */
  bestScore: number;
  /** 最後に記録したセッションID（同じセッションの二重加算を防ぐ） */
  lastSessionId: string | null;
  earnedToday: number;
  wordStatus: Record<string, WordStatus>;
  /** 単語ごとの学習実績（図鑑の学習回数・正答率・直近学習に使う） */
  wordStats: Record<string, WordStat>;
  /** 図鑑の総収録語数 */
  catalogTotal: number;
  /** 図鑑で習得済みの語数 */
  catalogMastered: number;
  history: BallHistoryEntry[];
  purchased: string[];
  hourly: number[]; // 24 buckets of minutes
};

type Action =
  | { type: "ANSWER"; wordId: string; correct: boolean; reward: number; penalty: number }
  | { type: "SPIN"; cost: number; win: number; jackpot: boolean }
  | { type: "SPIN_QUIZ"; result: QuizSpinResult }
  | { type: "RECORD_SESSION"; sessionId: string; score: number; minutes: number }
  | { type: "TOGGLE_STAR"; wordId: string }
  | { type: "SET_REVIEW"; wordId: string; review: boolean }
  | { type: "PURCHASE"; rewardId: string; cost: number }
  | { type: "RESET" };

const STORAGE_KEY = "tanpachi:v1";

/** 図鑑の初期表示で「未習得」を見せる単語（学習履歴なし） */
const isUnstudied = (i: number) => i % 7 === 6;

const initialWordStatus = (): Record<string, WordStatus> =>
  Object.fromEntries(
    WORDS.map((w, i) => [
      w.id,
      {
        learned: !isUnstudied(i) && i % 3 !== 0,
        weak: !isUnstudied(i) && i % 4 === 0,
        starred: i % 7 === 0,
      },
    ]),
  );

/** 初期表示用の学習実績（学習回数・正答率・直近学習日） */
const initialWordStats = (): Record<string, WordStat> =>
  Object.fromEntries(
    WORDS.map((w, i) => {
      // 未習得の単語は履歴を持たせない（出題回数0＝まだ学習していない）
      if (isUnstudied(i)) return [w.id, { count: 0, correct: 0, lastAt: null }];
      const count = 2 + ((i * 3) % 5); // 2〜6回
      const ratio = i % 4 === 0 ? 0.5 : 0.9;
      return [
        w.id,
        {
          count,
          correct: Math.min(count, Math.round(count * ratio)),
          lastAt: new Date(Date.now() - ((i * 5) % 14 + 1) * 86400000).toISOString(),
        },
      ];
    }),
  );

export const initialState: AppState = {
  userName: "たんパチ太郎",
  level: 12,
  exp: 320,
  expToNext: 500,
  balls: 1230,
  totalSpins: 248,
  jackpots: 3,
  streak: 0,
  todayMinutes: 15,
  goalMinutes: 30,
  learnedCount: 328,
  streakDays: 7,
  correct: 87,
  answered: 100,
  bestScore: 0,
  lastSessionId: null,
  earnedToday: 230,
  wordStatus: initialWordStatus(),
  wordStats: initialWordStats(),
  catalogTotal: 248,
  catalogMastered: 182,
  history: [
    { id: "h1", at: new Date().toISOString(), delta: 10, reason: "英単語学習 正解" },
    { id: "h2", at: new Date(Date.now() - 3600_000).toISOString(), delta: 120, reason: "パチンコ 大当たり" },
    { id: "h3", at: new Date(Date.now() - 7200_000).toISOString(), delta: -10, reason: "パチンコ 回転" },
  ],
  purchased: [],
  hourly: [0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 12, 3, 2, 1, 4, 15, 3, 2, 6, 3, 2, 5, 3, 1],
};

const uid = () => Math.random().toString(36).slice(2, 10);

const EMPTY_STAT: WordStat = { count: 0, correct: 0, lastAt: null };

/** 解答1件を単語の学習実績に反映する */
function bumpStat(
  stats: Record<string, WordStat>,
  wordId: string,
  correct: boolean,
): Record<string, WordStat> {
  const prev = stats[wordId] ?? EMPTY_STAT;
  return {
    ...stats,
    [wordId]: {
      count: prev.count + 1,
      correct: prev.correct + (correct ? 1 : 0),
      lastAt: new Date().toISOString(),
    },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ANSWER": {
      // 正解は報酬を加算、不正解はペナルティ分を減算（0未満にならないようクランプ）
      const delta = action.correct ? action.reward : -action.penalty;
      const status = state.wordStatus[action.wordId] ?? { learned: false, weak: false, starred: false };
      const nextExp = state.exp + (action.correct ? 10 : 2);
      const levelUp = nextExp >= state.expToNext;
      return {
        ...state,
        balls: Math.max(0, state.balls + delta),
        earnedToday: action.correct ? state.earnedToday + delta : state.earnedToday,
        correct: state.correct + (action.correct ? 1 : 0),
        answered: state.answered + 1,
        learnedCount: state.learnedCount + (action.correct && !status.learned ? 1 : 0),
        exp: levelUp ? nextExp - state.expToNext : nextExp,
        level: levelUp ? state.level + 1 : state.level,
        wordStatus: {
          ...state.wordStatus,
          [action.wordId]: {
            ...status,
            learned: status.learned || action.correct,
            weak: !action.correct,
          },
        },
        wordStats: bumpStat(state.wordStats, action.wordId, action.correct),
        history:
          action.correct || delta < 0
            ? [
                {
                  id: uid(),
                  at: new Date().toISOString(),
                  delta,
                  reason: action.correct ? "英単語学習 正解" : "英単語学習 不正解",
                },
                ...state.history,
              ].slice(0, 50)
            : state.history,
      };
    }
    case "SPIN": {
      const delta = action.win - action.cost;
      return {
        ...state,
        balls: Math.max(0, state.balls + delta),
        totalSpins: state.totalSpins + 1,
        jackpots: state.jackpots + (action.jackpot ? 1 : 0),
        history: [
          {
            id: uid(),
            at: new Date().toISOString(),
            delta,
            reason: action.jackpot ? "パチンコ 大当たり" : "パチンコ 回転",
          },
          ...state.history,
        ].slice(0, 50),
      };
    }
    case "SPIN_QUIZ": {
      const { result } = action;
      const delta = result.reward - result.penalty - result.cost;
      const expGain = result.correct ? 10 : 2;
      const nextExp = state.exp + expGain;
      const levelUp = nextExp >= state.expToNext;
      // パチンコのクイズで出た単語が図鑑に収録されていれば、実績に反映する
      const catalogWord = WORDS.find((w) => w.word === result.word);
      return {
        ...state,
        balls: Math.max(0, state.balls + delta),
        earnedToday: state.earnedToday + Math.max(0, result.reward - result.penalty),
        totalSpins: state.totalSpins + 1,
        jackpots: state.jackpots + (result.jackpot ? 1 : 0),
        streak: result.streak,
        correct: state.correct + (result.correct ? 1 : 0),
        answered: state.answered + 1,
        learnedCount: state.learnedCount + (result.correct ? 1 : 0),
        exp: levelUp ? nextExp - state.expToNext : nextExp,
        level: levelUp ? state.level + 1 : state.level,
        wordStats: catalogWord
          ? bumpStat(state.wordStats, catalogWord.id, result.correct)
          : state.wordStats,
        history: [
          {
            id: uid(),
            at: new Date().toISOString(),
            delta,
            reason: result.mode === "hanamai"
              ? `花舞 ${result.jackpot ? "大当たり" : "ハズレ"} / 学習${result.correct ? "正解" : "不正解"} (${result.word})`
              : result.jackpot
              ? `パチンコ 大当たり (${result.word})`
              : result.correct
                ? `パチンコ 正解 (${result.word})`
                : `パチンコ 不正解 (${result.word})`,
          },
          ...state.history,
        ].slice(0, 50),
      };
    }
    case "RECORD_SESSION": {
      // 同じセッションを2度記録しない（StrictMode の再実行対策）
      if (state.lastSessionId === action.sessionId) return state;
      return {
        ...state,
        lastSessionId: action.sessionId,
        bestScore: Math.max(state.bestScore, action.score),
        todayMinutes: state.todayMinutes + action.minutes,
      };
    }
    case "TOGGLE_STAR": {
      const status = state.wordStatus[action.wordId] ?? { learned: false, weak: false, starred: false };
      return {
        ...state,
        wordStatus: { ...state.wordStatus, [action.wordId]: { ...status, starred: !status.starred } },
      };
    }
    case "SET_REVIEW": {
      // 図鑑から「要復習 / 習得済み」を切り替える（既存の weak・learned のみ更新）
      const status = state.wordStatus[action.wordId] ?? { learned: false, weak: false, starred: false };
      return {
        ...state,
        wordStatus: {
          ...state.wordStatus,
          [action.wordId]: action.review
            ? { ...status, weak: true }
            : { ...status, weak: false, learned: true },
        },
      };
    }
    case "PURCHASE": {
      if (state.balls < action.cost || state.purchased.includes(action.rewardId)) return state;
      return {
        ...state,
        balls: state.balls - action.cost,
        purchased: [...state.purchased, action.rewardId],
        history: [
          { id: uid(), at: new Date().toISOString(), delta: -action.cost, reason: "報酬交換" },
          ...state.history,
        ].slice(0, 50),
      };
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

type Ctx = {
  state: AppState;
  answer: (wordId: string, correct: boolean, reward?: number, penalty?: number) => void;
  spin: (cost: number, win: number, jackpot: boolean) => void;
  /** クイズ=抽選の1回転分をまとめて確定させる */
  spinQuiz: (result: QuizSpinResult) => void;
  /** セッション終了を記録する（自己ベスト更新 + 本日の学習時間の加算） */
  recordSession: (sessionId: string, score: number, minutes: number) => void;
  toggleStar: (wordId: string) => void;
  /** 図鑑で単語を「要復習 / 習得済み」に切り替える */
  setReview: (wordId: string, review: boolean) => void;
  purchase: (rewardId: string, cost: number) => boolean;
  reset: () => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const answer = useCallback(
    (wordId: string, correct: boolean, reward = 10, penalty = 0) =>
      dispatch({ type: "ANSWER", wordId, correct, reward, penalty }),
    [],
  );
  const spin = useCallback(
    (cost: number, win: number, jackpot: boolean) => dispatch({ type: "SPIN", cost, win, jackpot }),
    [],
  );
  const spinQuiz = useCallback((result: QuizSpinResult) => dispatch({ type: "SPIN_QUIZ", result }), []);
  const recordSession = useCallback(
    (sessionId: string, score: number, minutes: number) =>
      dispatch({ type: "RECORD_SESSION", sessionId, score, minutes }),
    [],
  );
  const toggleStar = useCallback((wordId: string) => dispatch({ type: "TOGGLE_STAR", wordId }), []);
  const setReview = useCallback(
    (wordId: string, review: boolean) => dispatch({ type: "SET_REVIEW", wordId, review }),
    [],
  );
  const purchase = useCallback(
    (rewardId: string, cost: number) => {
      if (state.balls < cost || state.purchased.includes(rewardId)) return false;
      dispatch({ type: "PURCHASE", rewardId, cost });
      return true;
    },
    [state.balls, state.purchased],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const value = useMemo(
    () => ({ state, answer, spin, spinQuiz, recordSession, toggleStar, setReview, purchase, reset }),
    [state, answer, spin, spinQuiz, recordSession, toggleStar, setReview, purchase, reset],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/**
 * 正答率 (%)。
 * 通算(AppState)でも、パチンコの途中結果のような部分集計でも同じ式を使えるよう、
 * 必要な項目だけを受け取る。未回答(0除算)は 0% とする。
 */
export const accuracy = (s: { correct: number; answered: number }) =>
  s.answered === 0 ? 0 : Math.round((s.correct / s.answered) * 100);
