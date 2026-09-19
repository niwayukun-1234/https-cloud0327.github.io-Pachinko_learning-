import { CheckCircle, TrendingUp, Trophy } from "../../components/Icons";
import type { ResultView } from "../../types";
import { maxScore } from "./resultModel";

type Props = {
  data: ResultView;
  /** カウントアップ中の正答率 */
  displayAccuracy: number;
  /** カウントアップ中のスコア */
  displayScore: number;
};

/** 正答率に応じた評価チップ（モックアップの「優秀」相当を実データで出し分け） */
function accuracyChip(rate: number) {
  if (rate >= 90) return { label: "優秀", cls: "green" };
  if (rate >= 70) return { label: "良好", cls: "gold" };
  return { label: "要復習", cls: "red" };
}

export function ResultHero({ data, displayAccuracy, displayScore }: Props) {
  const chip = accuracyChip(data.accuracyRate);
  const scoreRatio = Math.min(100, Math.round((displayScore / maxScore(data.totalCount)) * 100));
  const wrongCount = data.totalCount - data.correctCount;

  return (
    <section className="r-card-gold" aria-label="今回のプレイ結果">
      <div className="r-hero-top" />

      <div className="r-hero-head">
        <div className="r-hero-tag-row">
          <div className="r-hero-tag">
            <span className="t rz">【 今回の学習結果 】</span>
            {data.isNewRecord && <span className="r-new-record">NEW RECORD!</span>}
          </div>

          <div className="r-gain-pill">
            <TrendingUp size={14} />
            <b className="rn">+{data.gainedBalls}玉 確定</b>
          </div>
        </div>

        <div className="r-hero-rank-row">
          <div className="r-rank-stamp">
            <span>{data.scoreRank}</span>
          </div>

          <div className="r-hero-eval">
            <div className="r-hero-eval-text">
              <div className="title">{data.evalTitle}</div>
              <div className="desc">{data.evalDescription}</div>
            </div>
            <span className="r-rank-en rn">RANK {data.rankEnglish}</span>
          </div>
        </div>
      </div>

      <div className="r-hero-grid">
        {/* 正解率（学習の質） */}
        <div className="r-metric">
          <div>
            <div className="r-metric-head">
              <span className="label">正解率</span>
              <span className={`r-chip ${chip.cls}`}>
                <CheckCircle size={10} />
                {chip.label}
              </span>
            </div>

            <div className="r-metric-value">
              <span className="num rn">{displayAccuracy}</span>
              <span className="unit rn">%</span>
            </div>

            <div className="r-metric-sub">
              <b className="rn">{data.correctCount}</b>
              <span className="slash">/</span>
              <span className="rn">{data.totalCount}</span>問 正解
            </div>
          </div>

          <div className="r-breakdown">
            <div className="r-breakdown-head">
              <span>出題順の結果</span>
              <span className="ok rn">
                正解 {data.correctCount} / 誤 {wrongCount}
              </span>
            </div>
            <div className="r-blocks">
              {data.words.map((w, i) => (
                <span
                  key={w.wordId + i}
                  className={`r-block ${w.correct ? "ok" : ""}`}
                  style={{ animationDelay: `${i * 25}ms` }}
                  title={`第${i + 1}問 ${w.word}: ${w.correct ? "正解" : "不正解"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* スコア（ゲーム要素） */}
        <div className="r-metric">
          <div>
            <div className="r-metric-head">
              <span className="label">スコア</span>
              <span className="r-chip gold">SCORE</span>
            </div>

            <div className="r-metric-value">
              <span className="num gold rn">{displayScore.toLocaleString()}</span>
              <span className="unit dim rn">pt</span>
            </div>

            <div className="r-metric-sub">
              <Trophy size={14} />
              <span style={{ marginLeft: 4 }}>
                {data.isNewRecord ? "自己ベスト更新！" : `通算正答率 ${data.totalAccuracy}%`}
              </span>
            </div>
          </div>

          <div className="r-breakdown">
            <div className="r-breakdown-head">
              <span>スコア達成度</span>
              <span className="ok rn" style={{ color: "#f5c542" }}>
                {scoreRatio}%
              </span>
            </div>
            <div className="r-gauge">
              <span style={{ width: `${scoreRatio}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
