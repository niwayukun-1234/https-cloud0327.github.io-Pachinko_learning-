import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { BallHistoryEntry, WordStatus } from "../types";
import { WORDS } from "../data/words";

export type AppState = {
  userName: string;
  level: number;
  exp: number; // toward next level
  expToNext: number;
  balls: number;
  totalSpins: number;
  jackpots: number;
  todayMinutes: number;
  goalMinutes: number;
  learnedCount: number;
  streakDays: number;
  correct: number;
  answered: number;
  earnedToday: number;
  wordStatus: Record<string, WordStatus>;
  history: BallHistoryEntry[];
  purchased: string[];
  hourly: number[]; // 24 buckets of minutes
};

type Action =
  | { type: "ANSWER"; wordId: string; correct: boolean; reward: number; penalty: number }
  | { type: "ADD_BALLS"; amount: number; reason: string }
  | { type: "SPIN"; cost: number; win: number; jackpot: boolean }
  | { type: "TOGGLE_STAR"; wordId: string }
  | { type: "PURCHASE"; rewardId: string; cost: number }
  | { type: "RESET" };

const STORAGE_KEY = "tanpachi:v1";

const initialWordStatus = (): Record<string, WordStatus> =>
  Object.fromEntries(
    WORDS.map((w, i) => [
      w.id,
      { learned: i < 4, weak: i === 1 || i === 3, starred: i === 0 },
    ]),
  );

export const initialState: AppState = {
  userName: "たんパチ太郎",
  level: 12,
  exp: 320,
  expToNext: 500,
  balls: 1230,
  totalSpins: 248,
  jackpots: 3,
  todayMinutes: 15,
  goalMinutes: 30,
  learnedCount: 328,
  streakDays: 7,
  correct: 87,
  answered: 100,
  earnedToday: 230,
  wordStatus: initialWordStatus(),
  history: [
    { id: "h1", at: new Date().toISOString(), delta: 10, reason: "英単語学習 正解" },
    { id: "h2", at: new Date(Date.now() - 3600_000).toISOString(), delta: 120, reason: "パチンコ 大当たり" },
    { id: "h3", at: new Date(Date.now() - 7200_000).toISOString(), delta: -10, reason: "パチンコ 回転" },
  ],
  purchased: [],
  hourly: [0, 0, 0, 0, 0, 0, 1, 2, 1, 3, 12, 3, 2, 1, 4, 15, 3, 2, 6, 3, 2, 5, 3, 1],
};

const uid = () => Math.random().toString(36).slice(2, 10);

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
    case "ADD_BALLS": {
      return {
        ...state,
        balls: Math.max(0, state.balls + action.amount),
        earnedToday: action.amount > 0 ? state.earnedToday + action.amount : state.earnedToday,
        history:
          action.amount !== 0
            ? [
                { id: uid(), at: new Date().toISOString(), delta: action.amount, reason: action.reason },
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
    case "TOGGLE_STAR": {
      const status = state.wordStatus[action.wordId] ?? { learned: false, weak: false, starred: false };
      return {
        ...state,
        wordStatus: { ...state.wordStatus, [action.wordId]: { ...status, starred: !status.starred } },
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
  addBalls: (amount: number, reason: string) => void;
  spin: (cost: number, win: number, jackpot: boolean) => void;
  toggleStar: (wordId: string) => void;
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
  const addBalls = useCallback(
    (amount: number, reason: string) => dispatch({ type: "ADD_BALLS", amount, reason }),
    [],
  );
  const spin = useCallback(
    (cost: number, win: number, jackpot: boolean) => dispatch({ type: "SPIN", cost, win, jackpot }),
    [],
  );
  const toggleStar = useCallback((wordId: string) => dispatch({ type: "TOGGLE_STAR", wordId }), []);
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
    () => ({ state, answer, addBalls, spin, toggleStar, purchase, reset }),
    [state, answer, addBalls, spin, toggleStar, purchase, reset],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const accuracy = (s: AppState) =>
  s.answered === 0 ? 0 : Math.round((s.correct / s.answered) * 100);
