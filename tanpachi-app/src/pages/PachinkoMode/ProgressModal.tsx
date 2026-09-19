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
 * - 評価ランク・スコア・正答率チップは最終結果画面と同じロジックを再利用する
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
    // 正答率・スコアは最終結果画面と同じ既存ロジックを再利用する(結果整合性を担保)
    const rate = accuracy({ correct: correctCount, answered });
    const score = calcScore(answers);
    const g = grade(rate, answered);
    const progress = total === 0 ? 0 : Math.min(100, Math.round((drawn / total) * 100));
    const avgSeconds = answered === 0 ? 0 : answers.reduce((s, a) => s + a.seconds, 0) / answered;
    return {
      answered,
      correctCount,
      wrongCount,
      rate,
      score,
      g,
      chip: accuracyChip(rate),
      progress,
      avgSeconds,
    };
  }, [answers, drawn, total]);

  if (!open) return null;

  return (
    <div className="r-modal p-modal" onClick={onClose} role="presentation">
      <div
        className="r-modal-card r-card p-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="途中結果"
      >
        {/* ヘッダー: ゲーム画面らしい上枠(タイトル + 閉じる) */}
        <div className="p-head">
          <div className="p-head-bar">
            <span className="deco">❮</span>
            <span className="head-title">
              <BookOpen size={14} />
              <b className="rz">途中結果</b>
            </span>
            <span className="deco">❯</span>
          </div>
          <button
            type="button"
            className="p-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* 評価パネル: ランクと評価メッセージを1セットで自然に折り返す */}
        <section className="p-grade" aria-label="現在の成績">
          <div className="p-grade-strip">
            <span className="tag">【 途中結果 】</span>
            <span className="rn q">第{drawn}問 / 全{total}問</span>
          </div>

          <div className="p-grade-body">
            <div className="p-grade-rank">
              <span className="k">{view.g.scoreRank}</span>
              <span className="en rn">RANK {view.g.rankEnglish}</span>
            </div>
            <div className="p-grade-text">
              <div className="p-grade-title">{view.g.evalTitle}</div>
              <div className="p-grade-desc">{view.g.evalDescription}</div>
            </div>
          </div>

          <div className="p-grade-foot">
            <span className={`r-chip ${view.chip.cls}`}>
              <CheckCircle size={10} />
              {view.chip.label}
            </span>
            <span className="p-grade-next">{view.g.nextStep}</span>
          </div>
        </section>

        {/* ヒーロー統計: 4つの主要数字を視認性高く並べて優劣を一瞬で見せる */}
        <section className="p-hero-stats" aria-label="主要ステータス">
          <div className="p-hs-cell ok">
            <span className="p-hs-label">
              <CheckCircle size={13} /> 正解
            </span>
            <span className="p-hs-num rn">
              {view.correctCount}
              <span className="u">問</span>
            </span>
          </div>
          <div className="p-hs-cell ng">
            <span className="p-hs-label">
              <XCircle size={13} /> 不正解
            </span>
            <span className="p-hs-num rn">
              {view.wrongCount}
              <span className="u">問</span>
            </span>
          </div>
          <div className="p-hs-cell">
            <span className="p-hs-label">正解率</span>
            <span className="p-hs-num rn">
              {view.rate}
              <span className="u">%</span>
            </span>
          </div>
          <div className="p-hs-cell ball">
            <span className="p-hs-label">保留玉</span>
            <span className="p-hs-num rn">
              <span className="r-ball xs" aria-hidden />
              {balls.toLocaleString()}
              <span className="u">玉</span>
            </span>
          </div>
        </section>

        {/* 進捗詳細: 補助情報を1枚のカードに整理(進捗メーターを含む) */}
        <section className="p-progress" aria-label="現在の進捗">
          <div className="p-progress-head">
            <span className="t">現在の進捗</span>
            <span className="note">
              <Clock size={12} />
              <span>1問 {view.avgSeconds.toFixed(1)}秒</span>
            </span>
          </div>

          <div className="p-progress-gauge" aria-hidden>
            <span className="r-gauge" >
              <i style={{ width: `${view.progress}%` }} />
            </span>
            <span className="p-gauge-val rn">
              {view.progress}
              <span className="u">%</span>
            </span>
          </div>
          <div className="p-progress-meta rn">
            回答 {view.answered} / {total} 問　・　連続正解 <b>{streak}</b> 連
          </div>

          <div className="p-progress-rows">
            <div className="p-progress-row">
              <span className="k">
                <Clock size={13} /> 学習時間
              </span>
              <span className="v rn">{formatDuration(elapsedSeconds)}</span>
            </div>
            <div className="p-progress-row">
              <span className="k">スコア</span>
              <span className="v gold rn">{view.score.toLocaleString()}<span className="u">pt</span></span>
            </div>
            <div className="p-progress-row">
              <span className="k">通算正答率</span>
              <span className="v rn">{totalAccuracy}<span className="u">%</span></span>
            </div>
          </div>
        </section>

        {/* フッター: ゲームへ戻る(閉じるだけ・状態は変えない) */}
        <div className="p-foot">
          <button type="button" className="p-back-btn" onClick={onClose}>
            <span className="arrow">⟵</span>
            <span>ゲームに戻る</span>
          </button>
          <span className="p-foot-note">
            ※ 表示後にゲームはそのまま続行されます
          </span>
        </div>
      </div>
    </div>
  );
}
