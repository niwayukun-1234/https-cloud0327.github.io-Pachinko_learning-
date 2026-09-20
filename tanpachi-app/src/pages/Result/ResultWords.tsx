import { useState } from "react";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Speaker,
  XCircle,
} from "../../components/Icons";
import { speak } from "../../lib/speech";
import type { SessionAnswer } from "../../types";

type Filter = "all" | "incorrect" | "correct";

type Props = {
  words: SessionAnswer[];
  onReviewMissed: () => void;
};

/** 出題単語の内訳。正誤・正解の意味・解答時間を実データで表示する。 */
export function ResultWords({ words, onReviewMissed }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const wrong = words.filter((w) => !w.correct);
  const right = words.filter((w) => w.correct);
  const list = filter === "incorrect" ? wrong : filter === "correct" ? right : words;

  return (
    <section className="r-card r-review" aria-label="出題単語の内訳">
      <button
        type="button"
        className="r-review-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="l">
          <BookOpen size={16} />
          <span className="t">出題単語の内訳</span>
          <span className="sub rn">
            全{words.length}問中 {right.length}問正解
          </span>
        </span>

        <span className="r">
          {wrong.length > 0 && <span className="r-chip red">要復習 {wrong.length}語</span>}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="r-review-body">
          <div className="r-filters">
            <button
              type="button"
              className={`r-filter ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              すべて ({words.length})
            </button>
            <button
              type="button"
              className={`r-filter ${filter === "incorrect" ? "active wrong" : ""}`}
              onClick={() => setFilter("incorrect")}
            >
              要復習 ({wrong.length})
            </button>
            <button
              type="button"
              className={`r-filter ${filter === "correct" ? "active ok" : ""}`}
              onClick={() => setFilter("correct")}
            >
              正解 ({right.length})
            </button>
          </div>

          <div className="r-words">
            {list.map((w, i) => (
              <div className="r-word" key={w.wordId + i}>
                <div className="l">
                  {w.correct ? (
                    <CheckCircle size={14} className="ok-icon" />
                  ) : (
                    <XCircle size={14} className="ng-icon" />
                  )}
                  <div className="body">
                    <div className="en">
                      <b>{w.word}</b>
                      <button
                        type="button"
                        className="speak"
                        onClick={() => speak(w.word, 0.9)}
                        aria-label={`${w.word} の発音を聞く`}
                      >
                        <Speaker size={13} />
                      </button>
                      <span className="phon">{w.phonetic}</span>
                    </div>
                    <div className="ja">
                      {w.meaning}
                      {!w.correct && w.selected && (
                        <span className="miss">誤: {w.selected}</span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="sec">{w.seconds.toFixed(1)}秒</span>
              </div>
            ))}
            {list.length === 0 && <div className="r-word">該当する単語はありません</div>}
          </div>

          {wrong.length > 0 && (
            <button type="button" className="r-review-cta" onClick={onReviewMissed}>
              間違えた単語（{wrong.length}語）をもう一度解く
            </button>
          )}
        </div>
      )}
    </section>
  );
}
