import { CheckCircle, Lock, RotateCcw } from "../../components/Icons";
import type { CatalogStatus } from "../../types";

/**
 * 学習状態を示す記号。色だけで状態を伝えないよう、
 * 一覧・詳細のどちらでも「文字＋アイコン」の組み合わせで使う。
 */
export function StatusMark({ st, size = 11 }: { st: CatalogStatus; size?: number }) {
  if (st === "mastered") return <CheckCircle size={size} />;
  if (st === "review") return <RotateCcw size={size} />;
  return <Lock size={size} />;
}
