import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fx } from "../../components/Fx";
import { Header } from "../../components/Header";
import { Gear, Speaker } from "../../components/Icons";
import { WORDS } from "../../data/words";
import { useApp } from "../../store/AppContext";
import "./Learn.css";

const TOTAL = 10;
const REWARD = 10;
const SESSION_KEY = "tanpachi:session";

type Session = { index: number; order: string[]; combo?: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSession(): Session {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Session;
      if (s.index < TOTAL) return s;
    }
  } catch {
    /* ignore */
  }
  const ids = WORDS.map((w) => w.id);
  const order: string[] = [];
  while (order.length < TOTAL) order.push(...shuffle(ids));
  // Always start with "challenge" like the mock
  const first = order.indexOf("challenge");
  if (first > 0) [order[0], order[first]] = [order[first], order[0]];
  const s = { index: 0, order: order.slice(0, TOTAL), combo: 0 };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

export function Learn() {
  const navigate = useNavigate();
  const { answer } = useApp();
  const [session, setSession] = useState<Session>(loadSession);
  const [selected, setSelected] = useState<string | null>(null);

  const word = useMemo(
    () => WORDS.find((w) => w.id === session.order[session.index]) ?? WORDS[0],
    [session],
  );
  const choices = useMemo(() => shuffle(word.choices), [word]);

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(word.word);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [word]);

  const isCorrect = selected === word.meaning;

  const choose = (c: string) => {
    if (selected) return;
    setSelected(c);
    const isRight = c === word.meaning;

    if (isRight) {
      // 連続正解コンボ。コンボが伸びるほど獲得玉数が増える。
      const combo = (session.combo ?? 0) + 1;
      const reward = REWARD * combo;
      answer(word.id, true, reward);
      const next: Session = { ...session, index: session.index + 1, combo };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      // 正解した瞬間に正解画面へ（タイムラグなし）
      navigate("/learn/correct", {
        state: { word: word.word, reward, combo, finished: next.index >= TOTAL },
      });
      return;
    }

    // 不正解: コンボをリセット
    answer(word.id, false, 0);
    const next: Session = { ...session, index: session.index + 1, combo: 0 };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
  };

  const goNext = () => {
    if (session.index + 1 >= TOTAL) {
      sessionStorage.removeItem(SESSION_KEY);
      navigate("/home");
    } else {
      setSelected(null);
      setSession(loadSession());
    }
  };

  return (
    <div className="learn">
      <Fx petals={10} sparkles={16} />
      <Header
        title="学習モード"
        back="/home"
        right={
          <button className="icon-btn" aria-label="設定" onClick={() => navigate("/mypage")}>
            <Gear size={22} />
          </button>
        }
      />
      <div className="learn-body">
        <div className="learn-progress">
          <div className="progress">
            <span style={{ width: `${((session.index + 1) / TOTAL) * 100}%` }} />
          </div>
          <span className="count">
            <b>{session.index + 1}</b>問
          </span>
        </div>

        {session.combo ? (
          <div className="learn-combo" key={session.combo}>
            連続正解 <b>{session.combo}</b> 回
          </div>
        ) : null}

        <div className="learn-word">
          <h1>{word.word}</h1>
          <div className="phon-row">
            <span className="phon">{word.phonetic}</span>
            <button className="icon-btn" onClick={speak} aria-label="発音を聞く">
              <Speaker size={22} />
            </button>
          </div>
          <p className="prompt">この単語の意味を選べ</p>
        </div>

        <div className="choices">
          {choices.map((c) => {
            const state =
              selected === null
                ? ""
                : c === word.meaning
                  ? "correct"
                  : c === selected
                    ? "wrong"
                    : "dim";
            return (
              <button
                key={c}
                className={`choice ${state}`}
                onClick={() => choose(c)}
                disabled={selected !== null}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className={`learn-result ${selected ? "show" : ""}`}>
          {selected && isCorrect && (
            <>
              <span className="result-title brush pop">正解!</span>
              <span className="result-reward pop">
                <span className="ball" />
                <b>+{REWARD}</b>
                <span>玉</span>
              </span>
            </>
          )}
          {selected && !isCorrect && (
            <>
              <span className="result-title wrong brush pop">不正解…</span>
              <span className="result-answer fade-up">
                正解は「{word.meaning}」
              </span>
            </>
          )}
        </div>

        <button
          className={`btn-cta learn-next ${selected && !isCorrect ? "" : "hidden"}`}
          onClick={goNext}
        >
          次の問題へ
        </button>
      </div>
    </div>
  );
}
