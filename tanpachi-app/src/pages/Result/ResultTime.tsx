import { Clock, Flame, Target } from "../../components/Icons";
import { formatDuration } from "./resultModel";

type Props = {
  studyTimeSeconds: number;
  goalMinutes: number;
  todayAccumulatedSeconds: number;
  averageSeconds: number;
};

/** 学習時間ウィジェット。本日の目標に対する達成度を表示する。 */
export function ResultTime({
  studyTimeSeconds,
  goalMinutes,
  todayAccumulatedSeconds,
  averageSeconds,
}: Props) {
  const todayMinutes = Math.floor(todayAccumulatedSeconds / 60);
  const goalPercent = Math.min(
    100,
    Math.round((todayAccumulatedSeconds / Math.max(1, goalMinutes * 60)) * 100),
  );

  return (
    <section className="r-card r-widget" aria-label="学習時間">
      <div className="r-widget-head">
        <div className="r-widget-title">
          <Clock size={14} />
          <span className="t">学習時間</span>
        </div>
        <span className="r-widget-note">
          <Flame size={13} />
          <span>1問あたり {averageSeconds.toFixed(1)}秒</span>
        </span>
      </div>

      <div className="r-widget-value">
        <span className="r-big-num">
          <span className="num rn">{formatDuration(studyTimeSeconds)}</span>
          <span className="unit dim">/ 今回</span>
        </span>
        <span className="r-chip blue">今回の学習</span>
      </div>

      <div className="r-time-goal">
        <div className="r-time-goal-head">
          <span className="l">
            <Target size={13} />
            <span>目標 {goalMinutes}分</span>
          </span>
          <span className="r">
            本日累計 {todayMinutes}分 ({goalPercent}%)
          </span>
        </div>
        <div className="r-goal-bar">
          <span style={{ width: `${goalPercent}%` }} />
        </div>
      </div>
    </section>
  );
}
