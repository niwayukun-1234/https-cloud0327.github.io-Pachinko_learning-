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

// 確変: 4〜7連続正解の間でランダムに到来し、2〜3問以内（1問ミスでも即終了）で終わる。
const KAKUHEN_BONUS = 100;
const KAKUHEN_MIN_COMBO = 4;
const KAKUHEN_MAX_COMBO = 7;
const KAKUHEN_MIN_LEN = 2;
const KAKUHEN_MAX_LEN = 3;

type Session = {
  index: number;
  order: string[];
  combo?: number;
  kakuhen?: boolean;
  kakuhenAt?: number; // 確変が到来する連続正解数（4〜7）
  kakuhenLen?: number; // 確変の継続問題数（2〜3）
  kakuhenCount?: number; // 確変中に答えた問題数
};

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 残り問題を「難しい問題優先」の並びに組み替える（確変中用） */
function hardFirst(count: number): string[] {
  const hard = WORDS.filter((w) => w.difficulty === "hard").map((w) => w.id);
  const other = WORDS.filter((w) => w.difficulty !== "hard").map((w) => w.id);
  const pool = [...shuffle(hard), ...shuffle(other)];
  const out: string[] = [];
  while (out.length < count) out.push(...shuffle(pool));
  return out.slice(0, count);
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
  const s: Session = {
    index: 0,
    order: order.slice(0, TOTAL),
    combo: 0,
    kakuhen: false,
    kakuhenAt: randInt(KAKUHEN_MIN_COMBO, KAKUHEN_MAX_COMBO),
    kakuhenLen: 0,
    kakuhenCount: 0,
  };
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
      let kakuhen = session.kakuhen ?? false;
      let kakuhenLen = session.kakuhenLen ?? 0;
      let kakuhenCount = session.kakuhenCount ?? 0;
      let order = session.order;

      const kakuhenAt = session.kakuhenAt ?? randInt(KAKUHEN_MIN_COMBO, KAKUHEN_MAX_COMBO);

      if (!kakuhen && combo >= kakuhenAt) {
        // 4〜7連続のどこかで確変突入。以後は残りを難問優先に組み替える。
        kakuhen = true;
        kakuhenLen = randInt(KAKUHEN_MIN_LEN, KAKUHEN_MAX_LEN);
        kakuhenCount = 1;
        const remaining = TOTAL - (session.index + 1);
        order = [...session.order.slice(0, session.index + 1), ...hardFirst(remaining)];
      } else if (kakuhen) {
        kakuhenCount += 1;
        if (kakuhenCount > kakuhenLen) kakuhen = false;
      }

      const bonus = kakuhen ? KAKUHEN_BONUS : 0;
      const reward = REWARD * combo + bonus;
      answer(word.id, true, reward);
      const next: Session = {
        ...session,
        index: session.index + 1,
        order,
        combo,
        kakuhen,
        kakuhenAt,
        kakuhenLen,
        kakuhenCount,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      // 正解した瞬間に正解画面へ（タイムラグなし）
      navigate("/learn/correct", {
        state: {
          word: word.word,
          reward,
          bonus,
          combo,
          kakuhen,
          finished: next.index >= TOTAL,
        },
      });
      return;
    }

    // 不正解: コンボをリセットし、確変中なら確変も終了
    answer(word.id, false, 0);
    const next: Session = {
      ...session,
      index: session.index + 1,
      combo: 0,
      kakuhen: false,
      kakuhenCount: 0,
    };
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
    <div className={`learn${session.kakuhen ? " kakuhen" : ""}`}>
      {session.kakuhen && <div className="learn-rainbow" aria-hidden />}
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

        {session.combo && !session.kakuhen ? (
          <div className="learn-combo" key={session.combo}>
            連続正解 <b>{session.combo}</b> 回
          </div>
        ) : null}

        {session.kakuhen ? <div className="learn-kakuhen-badge">確変中!</div> : null}

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
