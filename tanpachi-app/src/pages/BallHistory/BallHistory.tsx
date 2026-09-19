import { BallCounter } from "../../components/BallCounter";
import { Header } from "../../components/Header";
import { useApp } from "../../store/AppContext";
import "./BallHistory.css";

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
};

export function BallHistory() {
  const { state } = useApp();
  return (
    <>
      <Header title="玉の履歴" back />
      <div className="screen-scroll history">
        <div className="rewards-balance panel">
          <span className="label">所持玉</span>
          <BallCounter value={state.balls} size="sm" />
        </div>
        <ul className="list">
          {state.history.map((h) => (
            <li key={h.id} className="list-item history-item">
              <span className="ball" style={{ width: 20, height: 20 }} />
              <span className="grow">
                <span className="reason">{h.reason}</span>
                <span className="time">{fmt(h.at)}</span>
              </span>
              <span className={`delta ${h.delta >= 0 ? "plus" : "minus"}`}>
                {h.delta >= 0 ? "+" : ""}
                {h.delta} 玉
              </span>
            </li>
          ))}
          {state.history.length === 0 && <li className="list-item">履歴はまだありません</li>}
        </ul>
      </div>
    </>
  );
}
