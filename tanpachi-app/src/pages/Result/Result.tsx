import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { Gear } from "../../components/Icons";
import { LEARN_RESULT_KEY, LEARN_REVIEW_KEY, LEARN_SESSION_KEY } from "../../data/learn";
import { useCountUp } from "../../hooks/useCountUp";
import { useApp } from "../../store/AppContext";
import type { LearnSessionResult } from "../../types";
import { buildResultView } from "./resultModel";
import { ResultBalls } from "./ResultBalls";
import { ResultFooter } from "./ResultFooter";
import { ResultHero } from "./ResultHero";
import { ResultTime } from "./ResultTime";
import { ResultUser } from "./ResultUser";
import { ResultWords } from "./ResultWords";
import "./Result.css";

/** 直近のセッション結果を sessionStorage から読む */
function loadResult(): LearnSessionResult | null {
  try {
    const raw = sessionStorage.getItem(LEARN_RESULT_KEY);
    return raw ? (JSON.parse(raw) as LearnSessionResult) : null;
  } catch {
    return null;
  }
}

export function Result() {
  const navigate = useNavigate();
  const { state, recordSession } = useApp();
  const session = useMemo(() => loadResult(), []);
  const [showSettings, setShowSettings] = useState(false);
  const recorded = useRef<string | null>(null);

  // セッション終了直後の state を基準にする。
  // recordSession で state が更新されるため、初回レンダー時の値に固定しないと
  // 学習時間が二重に加算されてしまう。
  const [base] = useState(() => state);
  const view = useMemo(() => (session ? buildResultView(session, base) : null), [session, base]);

  // 自己ベスト・本日の学習時間をセッション単位で1回だけ反映する
  useEffect(() => {
    if (!session || !view) return;
    if (recorded.current === session.id) return;
    recorded.current = session.id;
    recordSession(session.id, view.score, Math.floor(view.studyTimeSeconds / 60));
  }, [session, view, recordSession]);

  const displayScore = useCountUp(view?.score ?? 0);
  const displayAccuracy = useCountUp(view?.accuracyRate ?? 0);
  const displayBalls = useCountUp(
    view?.heldBalls ?? 0,
    650,
    Math.max(0, (view?.heldBalls ?? 0) - (view?.gainedBalls ?? 0)),
  );

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(LEARN_RESULT_KEY);
    sessionStorage.removeItem(LEARN_SESSION_KEY);
  }, []);

  const goHome = useCallback(() => {
    clearSession();
    navigate("/home", { replace: true });
  }, [clearSession, navigate]);

  const learnMore = useCallback(() => {
    clearSession();
    navigate("/learn", { replace: true });
  }, [clearSession, navigate]);

  /** 間違えた単語だけで次のセッションを組み立てる */
  const reviewMissed = useCallback(() => {
    if (!view) return;
    const missed = view.words.filter((w) => !w.correct).map((w) => w.wordId);
    if (missed.length === 0) return;
    sessionStorage.setItem(LEARN_REVIEW_KEY, JSON.stringify(missed));
    clearSession();
    navigate("/learn", { replace: true });
  }, [view, clearSession, navigate]);

  // 結果データが無い（直接アクセス・リロード）場合はホームへ戻す
  if (!view) {
    return (
      <>
        <Header title="リザルト" back="/home" />
        <div className="screen-scroll">
          <p style={{ fontSize: 13, color: "var(--text-sub)" }}>
            表示できる学習結果がありません。学習モードから始めてください。
          </p>
        </div>
      </>
    );
  }

  const hasMissed = view.correctCount < view.totalCount;

  return (
    <div className="result">
      <Header
        className="result-header"
        title={
          <span className="result-title">
            <span className="bracket">《</span>
            <span className="label">リザルト</span>
            <span className="bracket">》</span>
          </span>
        }
        back={false}
        left={
          <button className="back" onClick={goHome} aria-label="ホームへ戻る">
            戻る
          </button>
        }
        right={
          <button className="icon-btn" aria-label="設定" onClick={() => setShowSettings(true)}>
            <Gear size={20} />
          </button>
        }
      />

      <ResultUser
        userName={state.userName}
        level={state.level}
        expPercent={view.expPercent}
        streakDays={view.streakDays}
      />

      <div className="result-scroll">
        <ResultHero data={view} displayAccuracy={displayAccuracy} displayScore={displayScore} />

        <ResultBalls
          heldBalls={view.heldBalls}
          gainedBalls={view.gainedBalls}
          spinCost={view.spinCost}
          displayBalls={displayBalls}
        />

        <ResultTime
          studyTimeSeconds={view.studyTimeSeconds}
          goalMinutes={view.goalMinutes}
          todayAccumulatedSeconds={view.todayAccumulatedSeconds}
          averageSeconds={view.averageSeconds}
        />

        <ResultWords words={view.words} onReviewMissed={reviewMissed} />

        <div className="r-quote">
          <p>{view.nextStep}</p>
        </div>
      </div>

      <ResultFooter
        onPlayPachinko={() => {
          clearSession();
          navigate("/pachinko", { replace: true });
        }}
        onLearnMore={learnMore}
        onGoHome={goHome}
        hasMissed={hasMissed}
        onReviewMissed={reviewMissed}
      />

      {showSettings && (
        <div className="r-modal" onClick={() => setShowSettings(false)}>
          <div className="r-modal-card r-card" onClick={(e) => e.stopPropagation()}>
            <div className="r-modal-head">
              <span className="l">
                <Gear size={16} />
                <h3>設定</h3>
              </span>
            </div>
            <div className="r-modal-list">
              <div className="r-log">
                <span className="l">
                  <span className="reason">マイページで設定を変更できます</span>
                  <span className="time">学習目標・プロフィールなど</span>
                </span>
              </div>
            </div>
            <div className="r-modal-foot">
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  navigate("/mypage");
                }}
              >
                マイページを開く
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
