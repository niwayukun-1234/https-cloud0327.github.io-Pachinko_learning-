import { useNavigate } from "react-router-dom";
import { History, Plus } from "../../components/Icons";

type Props = {
  heldBalls: number;
  gainedBalls: number;
  spinCost: number;
  /** カウントアップ中の所持玉 */
  displayBalls: number;
};

/**
 * 所持玉ウィジェット。
 * 履歴は既存の /history 画面（実データ）へ遷移して再利用する。
 */
export function ResultBalls({ heldBalls, gainedBalls, spinCost, displayBalls }: Props) {
  const navigate = useNavigate();

  return (
    <section className="r-card r-widget" aria-label="所持玉">
      <div className="r-widget-head">
        <div className="r-widget-title">
          <span className="t">所持玉</span>
          <span className="r-chip amber">ゲーム通貨</span>
        </div>

        <button type="button" className="r-history-btn" onClick={() => navigate("/history")}>
          <History size={12} />
          <span>玉の履歴</span>
        </button>
      </div>

      <div className="r-widget-value">
        <div className="left">
          <span className="r-ball md" aria-hidden />
          <span className="r-big-num">
            <span className="num rn">{displayBalls.toLocaleString()}</span>
            <span className="unit">玉</span>
          </span>
        </div>

        <div className="r-gain-box">
          <div className="label">今回獲得</div>
          <div className="val rn">
            <Plus size={12} />
            <span>{gainedBalls}玉</span>
          </div>
        </div>
      </div>

      <div className="r-widget-foot">
        <span>パチンコ台プレイ可能</span>
        <span className="hl rn">1回あたり {spinCost}玉消費</span>
      </div>

      {/* 保有玉と今回獲得の関係を1本のバーで示す（実データのみ） */}
      <div className="r-hold-bar" aria-hidden>
        <span
          style={{
            width: `${heldBalls === 0 ? 0 : Math.max(4, Math.min(100, (gainedBalls / heldBalls) * 100))}%`,
          }}
        />
      </div>
    </section>
  );
}
