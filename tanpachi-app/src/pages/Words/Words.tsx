import { useMemo, useState } from "react";
import { Header } from "../../components/Header";
import { Play, Star } from "../../components/Icons";
import { TabBar } from "../../components/TabBar";
import { WORDS } from "../../data/words";
import { useApp } from "../../store/AppContext";
import "./Words.css";

type Filter = "all" | "learned" | "weak";

const speak = (text: string) => {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

export function Words() {
  const { state, toggleStar } = useApp();
  const [filter, setFilter] = useState<Filter>("all");

  const status = (id: string) => state.wordStatus[id] ?? { learned: false, weak: false, starred: false };

  // Display counts follow the mock (328 / 280 / 48), scaled with the local list.
  const counts = useMemo(() => {
    const learnedLocal = WORDS.filter((w) => status(w.id).learned).length;
    const weakLocal = WORDS.filter((w) => status(w.id).weak).length;
    const base = state.learnedCount;
    return {
      all: base,
      learned: Math.max(learnedLocal, base - 48),
      weak: Math.max(weakLocal, 48),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.wordStatus, state.learnedCount]);

  const list = WORDS.filter((w) => {
    const s = status(w.id);
    if (filter === "learned") return s.learned;
    if (filter === "weak") return s.weak;
    return true;
  });

  return (
    <>
      <Header title="単語帳" back="/home" />
      <div className="screen-scroll with-tab words">
        <div className="seg gold words-seg">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
            すべて ({counts.all})
          </button>
          <button className={filter === "learned" ? "active" : ""} onClick={() => setFilter("learned")}>
            覚えた ({counts.learned})
          </button>
          <button className={filter === "weak" ? "active" : ""} onClick={() => setFilter("weak")}>
            苦手 ({counts.weak})
          </button>
        </div>

        <ul className="word-list">
          {list.map((w) => {
            const s = status(w.id);
            return (
              <li key={w.id} className="word-card panel">
                <div className="word-main">
                  <div className="word-en">{w.word}</div>
                  <div className="word-phon">{w.phonetic}</div>
                </div>
                <div className="word-ja">{w.meaning}</div>
                <button className="word-play" onClick={() => speak(w.word)} aria-label="発音">
                  <Play size={16} />
                </button>
                <button
                  className={`word-star ${s.starred ? "on" : ""}`}
                  onClick={() => toggleStar(w.id)}
                  aria-label="お気に入り"
                >
                  <Star size={20} filled={s.starred} />
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="word-empty">該当する単語はありません</li>}
        </ul>
      </div>
      <TabBar />
    </>
  );
}
