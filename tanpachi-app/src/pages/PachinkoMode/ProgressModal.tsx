import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle, Clock, X, XCircle } from "../../components/Icons";
import type { SpinSessionAnswer } from "../../hooks/usePachinkoSpin";
import { accuracy } from "../../store/AppContext";
import { accuracyChip, calcScore, formatDuration, grade } from "../Result/resultModel";
import "../Result/Result.css";
import "./ProgressModal.css";

type Props = {
  /** 表示 / 非表示 */
  open: boolean;
  /** ゲームへ戻る(モーダルを閉じるだけでゲームは続行する) */
  onClose: () => void;
  /** このセッションで回答済みの記録(集計元) */
  answers: SpinSessionAnswer[];
  /** このセッションの開始時刻 (epoch ms) */
  startedAt: number;
  /** 現在の周回で出題した数 */
  drawn: number;
  /** 収録問題数 */
  total: number;
  /** 所持玉(AppState の唯一の値) */
  balls: number;
  /** 連続正解数(AppState の唯一の値) */
  streak: number;
  /** 通算の正答率(AppState から算出済み) */
  totalAccuracy: number;
};

/**
 * プレイ途中の結果を確認するモーダル。
 *
 * - 最終結果画面(/result)とは別物で、あくまで「今の状態の確認」だけを行う
 * - 表示する値は既存の単一情報源から導出するだけで、独自の状態は持たない
 *   (正解数 = セッションの解答記録 / 所持玉 = AppState.balls)
 * - 学習時間はフックが保持する開始時刻からの経過時間なので、
 *   開閉してもリセットも停止もしない
 * - デザインは最終結果画面の CSS クラス(r-card / r-metric / r-chip 等)を流用する
 */
export function ProgressModal({
  open,
  onClose,
  answers,
  startedAt,
  drawn,
  total,
  balls,
  streak,
  totalAccuracy,
}: Props) {
  // 学習時間の「表示」を更新するための経過秒数。
  // 計測の基準はフックが持つ startedAt の1箇所だけで、ここでは二重に持たない
  // (開いている間だけ再描画するための表示用カウンタ)。
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!open) return;
    const update = () => setElapsedSeconds(Math.max(0, (Date.now() - startedAt) / 1000));
    // 初回は rAF で描画後に埋める(effect 内で同期 setState をしない)
    const raf = requestAnimationFrame(update);
    const id = window.setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [open, startedAt]);

  const view = useMemo(() => {
    const answered = answers.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const wrongCount = answered - correctCount;
    // 正答率・スコアは最終結果画面と同じ既存ロジックを再利用する
    const rate = accuracy({ correct: correctCount, answered });
    const score = calcScore(answers);
    const g = grade(rate, answered);
    return {
      answered,
      correctCount,
      wrongCount,
      rate,
      score,
      g,
      chip: accuracyChip(rate),
      // 進捗は「今の周回で何問目か」を出題数から求める
      progress: total === 0 ? 0 : Math.min(100, Math.round((drawn / total) * 100)),
      avgSeconds: answered === 0 ? 0 : answers.reduce((s, a) => s + a.seconds, 0) / answered,
    };
  }, [answers, drawn, total]);

  if (!open) return null;

  return (
    <div className="r-modal p-modal" onClick={onClose} role="presentation">
      <div
        className="r-modal-card r-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="途中結果"
      >
        <div className="r-modal-head">
          <span className="l">
            <BookOpen size={16} />
            <h3>途中結果</h3>
          </span>
          <button type="button" className="p-close" onClick={onClose} aria-label="ゲームに戻る">
            <X size={14} />
          </button>
        </div>

        <div className="p-body">
          {/* 正解率とスコア: 最終結果画面のヒーローをそのまま流用 */}
          <section className="r-card-gold" aria-label="現在の成績">
            <div className="r-hero-top" />

            <div className="r-hero-head">
              <div className="r-hero-tag-row">
                <div className="r-hero-tag">
                  <span className="t rz">【 途中結果 】</span>
                </div>
                <div className="r-gain-pill">
                  <b className="rn">
                    第{drawn}問 / 全{total}問
                  </b>
                </div>
              </div>

              <div className="r-hero-rank-row">
                <div className="r-rank-stamp">
                  <span>{view.g.scoreRank}</span>
                </div>
                <div className="r-hero-eval">
                  <div className="r-hero-eval-text">
                    <div className="title">{view.g.evalTitle}</div>
                    <div className="desc">{view.g.evalDescription}</div>
                  </div>
                  <span className="r-rank-en rn">RANK {view.g.rankEnglish}</span>
                </div>
              </div>
            </div>

            <div className="r-hero-grid">
              <div className="r-metric">
                <div>
                  <div className="r-metric-head">
                    <span className="label">正解率</span>
                    {/* 出し分けは最終結果画面と同じ既存ロジックを再利用する */}
                    <span className={`r-chip ${view.chip.cls}`}>
                      <CheckCircle size={10} />
                      {view.chip.label}
                    </span>
                  </div>
                  <div className="r-metric-value">
                    <span className="num rn">{view.rate}</span>
                    <span className="unit rn">%</span>
                  </div>
                  <div className="r-metric-sub">
                    <b className="rn">{view.correctCount}</b>
                    <span className="slash">/</span>
                    <span className="rn">{view.answered}</span>問 正解
                  </div>
                </div>
              </div>

              <div className="r-metric">
                <div>
                  <div className="r-metric-head">
                    <span className="label">スコア</span>
                    <span className="r-chip gold">SCORE</span>
                  </div>
                  <div className="r-metric-value">
                    <span className="num gold rn">{view.score.toLocaleString()}</span>
                    <span className="unit dim rn">pt</span>
                  </div>
                  <div className="r-metric-sub">通算正答率 {totalAccuracy}%</div>
                </div>
              </div>
            </div>
          </section>

          {/* 正解 / 不正解 / 進捗 / 所持玉 / 学習時間 */}
          <section className="r-card r-widget" aria-label="現在の進捗">
            <div className="r-widget-head">
              <div className="r-widget-title">
                <span className="t">現在の進捗</span>
              </div>
              <span className="r-widget-note">
                <Clock size={13} />
                <span>1問あたり {view.avgSeconds.toFixed(1)}秒</span>
              </span>
            </div>

            <div className="p-row">
              <span className="k">
                <CheckCircle size={14} /> 正解
              </span>
              <span className="v ok rn">
                {view.correctCount}
                <span className="u">問</span>
              </span>
            </div>

            <div className="p-row">
              <span className="k">
                <XCircle size={14} /> 不正解
              </span>
              <span className="v ng rn">
                {view.wrongCount}
                <span className="u">問</span>
              </span>
            </div>

            <div className="p-row">
              <span className="k">回答数 / 総問題数</span>
              <span className="v rn">
                {view.answered}
                <span className="u">/ {total} 問</span>
              </span>
            </div>

            <div className="p-row">
              <span className="k">現在の進捗</span>
              <span className="v rn">
                {view.progress}
                <span className="u">%（{drawn}/{total}）</span>
              </span>
            </div>

            <div className="r-gauge" aria-hidden>
              <span style={{ width: `${view.progress}%` }} />
            </div>

            <div className="p-row" style={{ marginTop: 10 }}>
              <span className="k">所持玉（保留玉）</span>
              <span className="v rn">
                {balls.toLocaleString()}
                <span className="u">玉</span>
              </span>
            </div>

            <div className="p-row">
              <span className="k">連続正解</span>
              <span className="v rn">
                {streak}
                <span className="u">連</span>
              </span>
            </div>

            <div className="p-row">
              <span className="k">
                <Clock size={14} /> 学習時間
              </span>
              <span className="v rn">{formatDuration(elapsedSeconds)}</span>
            </div>
          </section>
        </div>

        <div className="r-modal-foot">
          <button type="button" onClick={onClose}>
            ゲームに戻る
          </button>
        </div>
      </div>
    </div>
  );
}
