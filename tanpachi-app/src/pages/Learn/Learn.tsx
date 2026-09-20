import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fx } from "../../components/Fx";
import { Header } from "../../components/Header";
import { Speaker } from "../../components/Icons";
import { WORDS } from "../../data/words";
import { useApp } from "../../store/AppContext";
import { rollMidBonus } from "../../lib/bonus";
import { getSettings } from "../../lib/settings";
import "./Learn.css";

const TOTAL = 10;
const REWARD = 10;
const SESSION_KEY = "tanpachi:session";
// 問題の制限時間（6秒）。時間切れは不正解扱い。
const QUESTION_MS = 6000;

// 不正解・未回答で減る玉数（連続で間違えるほど増える）
const PENALTY_BASE = 10;
const PENALTY_MAX = 50;

// 確変: 4〜7連続正解の間でランダムに到来し、2〜3問以内（1問ミスでも即終了）で終わる。
const KAKUHEN_BONUS = 100;
const KAKUHEN_MIN_COMBO = 4;
const KAKUHEN_MAX_COMBO = 7;
const KAKUHEN_MIN_LEN = 2;
const KAKUHEN_MAX_LEN = 3;

// 確変終了のタイミングで「終了かと思いきや確変突入」に切り替わる確率
const REVIVE_CHANCE = 0.5;

type Session = {
  index: number;
  order: string[];
  combo?: number;
  missStreak?: number; // 連続不正解数（減算玉数の増加に使用）
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
    missStreak: 0,
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
  const { answer, addBalls } = useApp();
  const [session] = useState<Session>(loadSession);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_MS);
  // 回答済みフラグ（時間切れとの二重発火を防ぐ）
  const answeredRef = useRef(false);

  const word = useMemo(
    () => WORDS.find((w) => w.id === session.order[session.index]) ?? WORDS[0],
    [session],
  );
  const choices = useMemo(() => shuffle(word.choices), [word]);

  // 最新の session / word をタイマーから参照するための ref
  const liveRef = useRef({ session, word });
  liveRef.current = { session, word };

  const speak = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(word.word);
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [word]);

  // 不正解 / 時間切れ → 失敗演出へ（玉が減る）
  const goFail = useCallback(
    (kind: "miss" | "timeout") => {
      const cur = liveRef.current.session;
      const w = liveRef.current.word;
      const wasKakuhen = cur.kakuhen ?? false;
      // 連続不正解数に応じて減算量を増やす
      const missStreak = (cur.missStreak ?? 0) + 1;
      const penalty = Math.min(PENALTY_BASE * missStreak, PENALTY_MAX);
      // 確変中に外した場合も「確変が終わるタイミング」。
      // 1/2 の確率で「終了かと思いきや確変突入」に切り替えて継続する。
      const revive = wasKakuhen && Math.random() < REVIVE_CHANCE;
      answer(w.id, false, 0, penalty);

      const next: Session = {
        ...cur,
        index: cur.index + 1,
        combo: 0,
        missStreak,
        kakuhen: revive,
        kakuhenLen: revive ? randInt(KAKUHEN_MIN_LEN, KAKUHEN_MAX_LEN) : cur.kakuhenLen,
        kakuhenCount: 0,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      navigate("/learn/fail", {
        state: {
          kind: kind === "timeout" ? "timeout" : wasKakuhen ? "kakuhenEnd" : "miss",
          finished: next.index >= TOTAL,
          penalty,
          revive,
        },
      });
    },
    [answer, navigate],
  );

  // 制限時間タイマー（6秒）。時間切れで失敗演出へ。
  useEffect(() => {
    answeredRef.current = false;
    setTimeLeft(QUESTION_MS);
    const start = performance.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, QUESTION_MS - (performance.now() - start));
      setTimeLeft(left);
      if (left <= 0) window.clearInterval(id);
    }, 100);
    const to = window.setTimeout(() => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      goFail("timeout");
    }, QUESTION_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(to);
    };
  }, [session.index, goFail]);

  const choose = (c: string) => {
    if (selected || answeredRef.current) return;
    answeredRef.current = true;
    setSelected(c);

    if (c !== word.meaning) {
      goFail("miss");
      return;
    }

    // ---- 正解 ----
    // 設定で確変がオフなら確変に入らない
    const settings = getSettings();
    const combo = (session.combo ?? 0) + 1;
    const wasKakuhen = session.kakuhen ?? false;
    const kakuhenAt = session.kakuhenAt ?? randInt(KAKUHEN_MIN_COMBO, KAKUHEN_MAX_COMBO);
    const entering = settings.kakuhenEnabled && !wasKakuhen && combo >= kakuhenAt;
    // この問題時点で確変中だったか（ボーナス判定に使用）
    const activeThisQ = wasKakuhen || entering;

    let kakuhen = activeThisQ;
    let kakuhenLen = session.kakuhenLen ?? 0;
    let kakuhenCount = wasKakuhen
      ? (session.kakuhenCount ?? 0) + 1
      : entering
        ? 1
        : 0;
    let kakuhenEnded = false;
    let kakuhenRevive = false;
    let order = session.order;

    if (entering) {
      // 4〜7連続のどこかで確変突入。以後は残りを難問優先に組み替える。
      kakuhenLen = randInt(KAKUHEN_MIN_LEN, KAKUHEN_MAX_LEN);
      const remaining = TOTAL - (session.index + 1);
      order = [...session.order.slice(0, session.index + 1), ...hardFirst(remaining)];
    } else if (wasKakuhen && kakuhenCount >= kakuhenLen) {
      // 確変が規定回数に達して終了タイミング。
      // 1/2 の確率で「終了かと思いきや確変突入」に切り替えて継続する。
      if (Math.random() < REVIVE_CHANCE) {
        kakuhen = true;
        kakuhenLen = randInt(KAKUHEN_MIN_LEN, KAKUHEN_MAX_LEN);
        kakuhenCount = 0;
        kakuhenRevive = true;
      } else {
        kakuhen = false;
        kakuhenEnded = true;
      }
    }

    const bonus = activeThisQ ? KAKUHEN_BONUS : 0;
    const reward = REWARD * combo + bonus;
    // 長い演出（確変1回目 / 3連続正解）のときは、演出の途中で出る中間ボーナスを抽選
    const kakuhenFirst = kakuhen && kakuhenCount === 1;
    const isTriple = combo === 3 && !kakuhen;
    const longAnim = kakuhenFirst || isTriple;
    const midBonus = longAnim ? rollMidBonus(kakuhen) : 0;
    // 連続正解でミス連続が途切れる
    answer(word.id, true, reward);
    if (midBonus > 0) addBalls(midBonus, "スペシャルボーナス");

    const next: Session = {
      ...session,
      index: session.index + 1,
      order,
      combo,
      missStreak: 0,
      kakuhen,
      kakuhenAt,
      kakuhenLen,
      kakuhenCount,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));

    // 確変終了（or 終了かと思いきや突入）の演出へ
    if (kakuhenEnded || kakuhenRevive) {
      navigate("/learn/fail", {
        state: {
          kind: "kakuhenEnd",
          finished: next.index >= TOTAL,
          revive: kakuhenRevive,
        },
      });
      return;
    }

    // 正解した瞬間に正解画面へ（タイムラグなし）
    navigate("/learn/correct", {
      state: {
        word: word.word,
        reward,
        bonus,
        midBonus,
        combo,
        kakuhen,
        // 確変中の1回目だけ専用BGMで大きく演出する
        kakuhenFirst,
        finished: next.index >= TOTAL,
      },
    });
  };

  const secs = Math.ceil(timeLeft / 1000);
  const pct = Math.max(0, Math.min(100, (timeLeft / QUESTION_MS) * 100));
  const low = timeLeft <= 2000;

  return (
    <div className={`learn${session.kakuhen ? " kakuhen" : ""}`}>
      {session.kakuhen && <div className="learn-rainbow" aria-hidden />}
      <Fx petals={10} sparkles={16} />
      <Header title="学習モード" back="/home" />
      <div className="learn-body">
        <div className="learn-progress">
          <div className="progress">
            <span style={{ width: `${((session.index + 1) / TOTAL) * 100}%` }} />
          </div>
          <span className="count">
            <b>{session.index + 1}</b>問
          </span>
        </div>

        {/* 制限時間 6秒 */}
        <div className={`learn-timer${low ? " low" : ""}`}>
          <span className="timer-num">{secs}</span>
          <div className="timer-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
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
      </div>
    </div>
  );
}
