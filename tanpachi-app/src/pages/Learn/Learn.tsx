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

type Session = {
  index: number;
  order: string[];
  /** 解答済みの記録（リザルト画面の入力になる） */
  answers: SessionAnswer[];
  /** セッション開始時刻 (epoch ms) */
  startedAt: number;
};

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

  return { index: 0, order: order.slice(0, TOTAL), answers: [], startedAt: Date.now() };
}

/** sessionStorage に保存済みのセッションを読む（新規作成はしない） */
function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    // 旧形式のセッションには answers / startedAt が無いため補う
    return { ...s, answers: s.answers ?? [], startedAt: s.startedAt ?? Date.now() };
  } catch {
    return null;
  }
}

function loadSession(): Session {
  const saved = readSession();
  // 中断したセッションを再開する
  if (saved && saved.index < saved.order.length) return saved;

  const s = createSession();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

/** 完了したセッションをリザルト画面用に書き出す */
function writeResult(s: Session) {
  const result: LearnSessionResult = {
    id: `${s.startedAt}-${s.answers.length}`,
    finishedAt: new Date().toISOString(),
    answers: s.answers,
    earnedBalls: s.answers.filter((a) => a.correct).length * REWARD,
    startedAt: s.startedAt,
  };
  sessionStorage.setItem(LEARN_RESULT_KEY, JSON.stringify(result));
  sessionStorage.removeItem(SESSION_KEY);
}

export function Learn() {
  const navigate = useNavigate();
  const { answer } = useApp();
  const [session, setSession] = useState<Session>(loadSession);
  const [selected, setSelected] = useState<string | null>(null);
  // 問題を表示した時刻（performance.now() 基準）。イベントの timeStamp と比較する。
  const questionAt = useRef(0);

  const total = session.order.length || TOTAL;
  const word = useMemo(
    () => WORDS.find((w) => w.id === session.order[session.index]) ?? WORDS[0],
    [session],
  );
  const choices = useMemo(() => shuffle(word.choices), [word]);

  // 1問ごとの解答時間を測る
  useEffect(() => {
    questionAt.current = performance.now();
  }, [word.id]);

  const playWord = useCallback(() => speak(word.word), [word]);

  const isCorrect = selected === word.meaning;

  const choose = (c: string, now: number) => {
    if (selected) return;
    setSelected(c);
    const correct = c === word.meaning;
    answer(word.id, correct, REWARD);

    const seconds = Math.max(0.1, Math.round(((now - questionAt.current) / 1000) * 10) / 10);
    const next: Session = {
      ...session,
      index: session.index + 1,
      answers: [
        ...session.answers,
        {
          wordId: word.id,
          word: word.word,
          phonetic: word.phonetic,
          meaning: word.meaning,
          selected: c,
          correct,
          seconds,
        },
      ],
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));

    if (correct) {
      const finished = next.index >= total;
      if (finished) writeResult(next);
      window.setTimeout(() => {
        navigate("/learn/correct", {
          state: { word: word.word, reward: REWARD, finished },
        });
      }, 900);
    }
  };

  const goNext = () => {
    // 直前に保存したセッション（最後の解答を含む）を基準にする。
    // 不正解で終えた場合はこのボタンから結果画面へ進む。
    const latest = readSession() ?? session;
    if (latest.index >= total) {
      writeResult(latest);
      navigate("/result", { replace: true });
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
            <span style={{ width: `${((session.index + 1) / total) * 100}%` }} />
          </div>
          <span className="count">
            <b>{session.index + 1}</b>問
          </span>
        </div>

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
                onClick={(e) => choose(c, e.timeStamp)}
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
          {session.index + 1 >= total ? "結果を見る" : "次の問題へ"}
        </button>
      </div>
    </div>
  );
}
