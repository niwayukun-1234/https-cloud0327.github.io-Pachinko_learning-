import { useEffect } from "react";
import { ArrowRight, BookOpen, CheckCircle, RotateCcw, Speaker, Star, X } from "../../components/Icons";
import { speak } from "../../lib/speech";
import type { CatalogStatus, Word, WordStat, WordStatus } from "../../types";
import { STATUS_TEXT, accuracyOf, lastStudiedLabel } from "./catalog";
import { StatusMark } from "./StatusMark";

type Props = {
  word: Word;
  stat?: WordStat;
  ws?: WordStatus;
  status: CatalogStatus;
  now: number;
  onClose: () => void;
  onToggleStar: () => void;
  onToggleReview: () => void;
  onJumpToRow: () => void;
};

/** タップした単語の詳細（英単語 → 意味 → 品詞 → 例文 → 学習履歴） */
export function WordDetail({
  word,
  stat,
  ws,
  status,
  now,
  onClose,
  onToggleStar,
  onToggleReview,
  onJumpToRow,
}: Props) {
  const starred = ws?.starred ?? false;
  const count = stat?.count ?? 0;
  const acc = accuracyOf(stat);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="wt-sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="wt-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${word.word} の詳細`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wt-sheet-grip" />

        <div className="wt-sheet-head">
          <div className="wt-sheet-no">
            <span className="n">No.{String(word.indexNo).padStart(3, "0")}</span>
            <span className="pos">{word.partOfSpeech}</span>
          </div>
          <div className="wt-sheet-head-r">
            <button
              className={`wt-star ${starred ? "on" : ""}`}
              onClick={onToggleStar}
              aria-pressed={starred}
              aria-label={starred ? "お気に入りから外す" : "お気に入りに追加"}
            >
              <Star size={18} filled={starred} />
            </button>
            <button className="wt-sheet-x" onClick={onClose} aria-label="閉じる">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="wt-sheet-body">
          <div className="wt-sheet-word">
            <h2>{word.word}</h2>
            <button className="wt-speak" onClick={() => speak(word.word)} aria-label="発音を聞く">
              <Speaker size={16} />
            </button>
          </div>
          <div className="wt-sheet-phon">{word.phonetic}</div>

          <div className="wt-sheet-meaning">
            <div className="wt-sheet-ja">{word.meaning}</div>
            <p className="wt-sheet-detail">{word.meaningDetail}</p>
          </div>

          <div className={`wt-state st-${status}`}>
            <span className="wt-state-badge">
              <StatusMark st={status} size={12} />
              {STATUS_TEXT[status]}
            </span>
            <p className="wt-state-desc">
              {status === "review"
                ? "復習リストに入っています。もう一度解くと記憶が定着します。"
                : status === "unlearned"
                  ? "まだ出題されていない単語です。学習すると図鑑に記録されます。"
                  : "意味を正しく選べています。この調子で定着させましょう。"}
            </p>
            <button className="wt-state-btn" onClick={onToggleReview}>
              {status === "review" ? (
                <>
                  <CheckCircle size={13} /> 習得済みにする
                </>
              ) : (
                <>
                  <RotateCcw size={13} /> 要復習にする
                </>
              )}
            </button>
          </div>

          <div className="wt-sheet-sec">
            <h3>
              <BookOpen size={13} /> 例文
            </h3>
            <p className="wt-ex-en">{word.exampleEn}</p>
            <p className="wt-ex-ja">{word.exampleJa}</p>
          </div>

          <div className="wt-sheet-sec">
            <h3>よく使う表現</h3>
            <div className="wt-collo">
              {word.collocations.map((c) => (
                <span key={c} className="wt-collo-chip">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="wt-sheet-sec">
            <h3>学習履歴</h3>
            <div className="wt-hist">
              <div className="wt-hist-cell">
                <span className="k">学習回数</span>
                <span className="v">
                  {count}
                  <i>回</i>
                </span>
              </div>
              <div className="wt-hist-cell">
                <span className="k">正解率</span>
                <span className="v">{acc === null ? "—" : `${acc}%`}</span>
              </div>
              <div className="wt-hist-cell">
                <span className="k">直近学習</span>
                <span className="v sm">{lastStudiedLabel(stat?.lastAt, now)}</span>
              </div>
            </div>
            <p className="wt-hist-note">出題範囲 {word.level}</p>
          </div>
        </div>

        <div className="wt-sheet-foot">
          <button className="wt-foot-ghost" onClick={onClose}>
            閉じる
          </button>
          <button className="wt-foot-main" onClick={onJumpToRow}>
            一覧で見る <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
