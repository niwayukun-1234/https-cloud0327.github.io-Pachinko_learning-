import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fx } from "../../components/Fx";
import { Header } from "../../components/Header";
import { Gear, Speaker } from "../../components/Icons";
import {
  LEARN_RESULT_KEY,
  LEARN_REVIEW_KEY,
  LEARN_REWARD,
  LEARN_SESSION_KEY,
  LEARN_TOTAL,
} from "../../data/learn";
import { WORDS } from "../../data/words";
import { shuffle } from "../../lib/random";
import { speak } from "../../lib/speech";
import { useApp } from "../../store/AppContext";
import type { LearnSessionResult, SessionAnswer } from "../../types";
import "./Learn.css";

const TOTAL = LEARN_TOTAL;
const REWARD = LEARN_REWARD;
const SESSION_KEY = LEARN_SESSION_KEY;
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
  /** 解答済みの記録（リザルト画面の入力になる） */
  answers: SessionAnswer[];
  /** セッション開始時刻 (epoch ms) */
  startedAt: number;
  /** セッション内で獲得した玉の合計 */
  earnedBalls: number;
  combo: number;
  missStreak: number; // 連続不正解数（減算玉数の増加に使用）
  kakuhen: boolean;
  kakuhenAt: number; // 確変が到来する連続正解数（4〜7）
  kakuhenLen: number; // 確変の継続問題数（2〜3）
  kakuhenCount: number; // 確変中に答えた問題数
};

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** 復習モードで引き継いだ単語IDを取得する */
function takeReviewIds(): string[] {
  try {
    const raw = sessionStorage.getItem(LEARN_REVIEW_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(LEARN_REVIEW_KEY);
    const ids = JSON.parse(raw) as unknown;
    if (!Array.isArray(ids)) return [];
    return ids.filter((id): id is string => typeof id === "string" && WORDS.some((w) => w.id === id));
  } catch {
    return [];
  }
}

function createSession(): Session {
  // リザルト画面から引き継いだ「間違えた単語」があれば、それを優先して出題する
  const reviewIds = takeReviewIds();
  const source = reviewIds.length > 0 ? reviewIds : WORDS.map((w) => w.id);
  const order: string[] = [];
  while (order.length < TOTAL) order.push(...shuffle(source));

  // 通常セッションは既存どおり "challenge" から始める
  const first = order.indexOf("challenge");
  if (first > 0) [order[0], order[first]] = [order[first], order[0]];

  return {
    index: 0,
    order: order.slice(0, TOTAL),
    answers: [],
    startedAt: Date.now(),
    earnedBalls: 0,
    combo: 0,
    missStreak: 0,
    kakuhen: false,
    kakuhenAt: randInt(KAKUHEN_MIN_COMBO, KAKUHEN_MAX_COMBO),
    kakuhenLen: 0,
    kakuhenCount: 0,
  };
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

/** sessionStorage に保存済みのセッションを読み、旧形式も現在の形へ補完する */
function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Session>;
    if (!Array.isArray(saved.order) || saved.order.length === 0) return null;
    if (!Number.isInteger(saved.index) || (saved.index ?? -1) < 0) return null;

    const order = saved.order.filter(
      (id): id is string => typeof id === "string" && WORDS.some((word) => word.id === id),
    );
    if (order.length === 0) return null;

    const answers = Array.isArray(saved.answers) ? saved.answers : [];
    return {
      index: Math.min(saved.index ?? 0, order.length),
      order,
      answers,
      startedAt: typeof saved.startedAt === "number" ? saved.startedAt : Date.now(),
      earnedBalls:
        typeof saved.earnedBalls === "number"
          ? saved.earnedBalls
          : answers.filter((item) => item.correct).length * REWARD,
      combo: typeof saved.combo === "number" ? saved.combo : 0,
      missStreak: typeof saved.missStreak === "number" ? saved.missStreak : 0,
      kakuhen: saved.kakuhen === true,
      kakuhenAt:
        typeof saved.kakuhenAt === "number"
          ? saved.kakuhenAt
          : randInt(KAKUHEN_MIN_COMBO, KAKUHEN_MAX_COMBO),
      kakuhenLen: typeof saved.kakuhenLen === "number" ? saved.kakuhenLen : 0,
      kakuhenCount: typeof saved.kakuhenCount === "number" ? saved.kakuhenCount : 0,
    };
  } catch {
    return null;
  }
}

function loadSession(): Session {
  const saved = readSession();
  if (saved && saved.index < saved.order.length) return saved;

  const session = createSession();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** 完了したセッションをリザルト画面用に書き出す */
function writeResult(s: Session) {
  const result: LearnSessionResult = {
    id: `${s.startedAt}-${s.answers.length}`,
    finishedAt: new Date().toISOString(),
    answers: s.answers,
    earnedBalls: s.earnedBalls,
    startedAt: s.startedAt,
  };
  sessionStorage.setItem(LEARN_RESULT_KEY, JSON.stringify(result));
  sessionStorage.removeItem(SESSION_KEY);
}

export function Learn() {
  const navigate = useNavigate();
  const { answer } = useApp();
  const [session] = useState<Session>(loadSession);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_MS);
  // 回答済みフラグ（時間切れとの二重発火を防ぐ）
  const answeredRef = useRef(false);
  const questionAt = useRef(0);

  const total = session.order.length || TOTAL;
  const word = useMemo(
    () => WORDS.find((w) => w.id === session.order[session.index]) ?? WORDS[0],
    [session],
  );
  const choices = useMemo(() => shuffle(word.choices), [word]);

  // 最新の session / word をタイマーから参照するための ref
  const liveRef = useRef({ session, word });
  liveRef.current = { session, word };

  const playWord = useCallback(() => speak(word.word), [word]);

  // 不正解 / 時間切れ → 失敗演出へ（玉が減る）
  const goFail = useCallback(
    (kind: "miss" | "timeout", selectedChoice: string | null = null) => {
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

      const seconds = Math.max(0.1, (performance.now() - questionAt.current) / 1000);
      const next: Session = {
        ...cur,
        index: cur.index + 1,
        answers: [
          ...cur.answers,
          {
            wordId: w.id,
            word: w.word,
            phonetic: w.phonetic,
            meaning: w.meaning,
            selected: selectedChoice,
            correct: false,
            seconds,
          },
        ],
        combo: 0,
        missStreak,
        kakuhen: revive,
        kakuhenLen: revive ? randInt(KAKUHEN_MIN_LEN, KAKUHEN_MAX_LEN) : cur.kakuhenLen,
        kakuhenCount: 0,
      };
      if (next.index >= TOTAL) writeResult(next);
      else sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
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
    questionAt.current = start;
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
      goFail("miss", c);
      return;
    }

    // ---- 正解 ----
    const combo = (session.combo ?? 0) + 1;
    const wasKakuhen = session.kakuhen ?? false;
    const kakuhenAt = session.kakuhenAt ?? randInt(KAKUHEN_MIN_COMBO, KAKUHEN_MAX_COMBO);
    const entering = !wasKakuhen && combo >= kakuhenAt;
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
    // 連続正解でミス連続が途切れる
    answer(word.id, true, reward);

    const seconds = Math.max(0.1, (performance.now() - questionAt.current) / 1000);
    const next: Session = {
      ...session,
      index: session.index + 1,
      order,
      answers: [
        ...session.answers,
        {
          wordId: word.id,
          word: word.word,
          phonetic: word.phonetic,
          meaning: word.meaning,
          selected: c,
          correct: true,
          seconds,
        },
      ],
      earnedBalls: session.earnedBalls + reward,
      combo,
      missStreak: 0,
      kakuhen,
      kakuhenAt,
      kakuhenLen,
      kakuhenCount,
    };
    if (next.index >= TOTAL) writeResult(next);
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));

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
        combo,
        kakuhen,
        // 確変中の1回目だけ専用BGMで大きく演出する
        kakuhenFirst: kakuhen && kakuhenCount === 1,
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
            <span style={{ width: `${((session.index + 1) / total) * 100}%` }} />
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
            <button className="icon-btn" onClick={playWord} aria-label="発音を聞く">
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
