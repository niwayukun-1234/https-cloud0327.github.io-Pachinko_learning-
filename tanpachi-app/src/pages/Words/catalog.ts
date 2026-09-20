import type { CatalogStatus, PartOfSpeech, WordStat, WordStatus } from "../../types";
import { WORDS } from "../../data/words";

/** 学習実績がまだ無い単語の初期値 */
export const EMPTY_STAT: WordStat = { count: 0, correct: 0, lastAt: null };

/** 学習状態の初期値（store 未登録の単語用） */
export const EMPTY_STATUS: WordStatus = { learned: false, weak: false, starred: false };

/** 状態フィルターのタブ */
export type StatusTab = "all" | CatalogStatus;

/** 並び順 */
export type SortOption = "id" | "reviewFirst" | "alpha" | "recent";

export const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "review", label: "要復習" },
  { value: "mastered", label: "習得済み" },
  { value: "unlearned", label: "未習得" },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "id", label: "図鑑No順" },
  { value: "reviewFirst", label: "要復習優先" },
  { value: "alpha", label: "A-Z順" },
  { value: "recent", label: "最近学習順" },
];

/** 品詞フィルター。実データに存在する品詞だけを並べ、
 *  選んでも必ず0件になる項目を作らない。 */
export const POS_FILTERS: (PartOfSpeech | "all")[] = [
  "all",
  ...(["動詞", "名詞", "形容詞", "副詞"] as PartOfSpeech[]).filter((p) =>
    WORDS.some((w) => w.partOfSpeech === p),
  ),
];

/** 状態の表示テキスト（色だけに頼らず文字でも伝える） */
export const STATUS_TEXT: Record<CatalogStatus, string> = {
  mastered: "習得済み",
  review: "要復習",
  unlearned: "未習得",
};

/**
 * 単語の学習状態を、実データ（学習回数・正答率・直近の正誤）から判定する。
 * 「まだ出題されていない＝未習得」「直近で間違えた／正答率が低い＝要復習」。
 */
export function catalogStatus(stat?: WordStat, ws?: WordStatus): CatalogStatus {
  const s = stat ?? EMPTY_STAT;
  if (s.count === 0 && !ws?.learned) return "unlearned";
  if (ws?.weak) return "review";
  if (s.count === 0) return "unlearned";
  if (s.correct / s.count < 0.75) return "review";
  return "mastered";
}

/** 正答率(%)。未学習は null */
export function accuracyOf(stat?: WordStat): number | null {
  const s = stat ?? EMPTY_STAT;
  if (s.count === 0) return null;
  return Math.round((s.correct / s.count) * 100);
}

/** 直近学習からの経過日数。未学習は null */
export function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86400000));
}

/** 直近学習の表示ラベル */
export function lastStudiedLabel(iso: string | null | undefined, now: number): string {
  const d = daysSince(iso, now);
  if (d === null) return "未学習";
  if (d === 0) return "今日";
  if (d === 1) return "昨日";
  return `${d}日前`;
}
