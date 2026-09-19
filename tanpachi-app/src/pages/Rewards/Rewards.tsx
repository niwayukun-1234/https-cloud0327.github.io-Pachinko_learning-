import { useState } from "react";
import { BallCounter } from "../../components/BallCounter";
import { Header } from "../../components/Header";
import { REWARDS } from "../../data/rewards";
import { useApp } from "../../store/AppContext";
import type { Reward, RewardCategory } from "../../types";
import "./Rewards.css";

const CATS: { key: RewardCategory; label: string }[] = [
  { key: "item", label: "アイテム" },
  { key: "bonus", label: "特典" },
  { key: "custom", label: "カスタマイズ" },
];

function RewardIcon({ icon }: { icon: Reward["icon"] }) {
  return <span className={`reward-icon ${icon}`} aria-hidden />;
}

export function Rewards() {
  const { state, purchase } = useApp();
  const [cat, setCat] = useState<RewardCategory>("item");
  const [toast, setToast] = useState<string | null>(null);

  const buy = (r: Reward) => {
    const ok = purchase(r.id, r.cost);
    setToast(ok ? `「${r.name}」を交換しました！` : "玉が足りません");
    window.setTimeout(() => setToast(null), 1800);
  };

  return (
    <>
      <Header title="報酬・交換" back />
      <div className="screen-scroll rewards">
        <div className="rewards-balance panel">
          <span className="label">所持玉</span>
          <BallCounter value={state.balls} size="sm" />
        </div>

        <div className="seg gold rewards-seg">
          {CATS.map((c) => (
            <button key={c.key} className={cat === c.key ? "active" : ""} onClick={() => setCat(c.key)}>
              {c.label}
            </button>
          ))}
        </div>

        <ul className="reward-list">
          {REWARDS.filter((r) => r.category === cat).map((r) => {
            const owned = state.purchased.includes(r.id);
            const affordable = state.balls >= r.cost;
            return (
              <li key={r.id} className="reward-card panel">
                <RewardIcon icon={r.icon} />
                <div className="reward-info">
                  <div className="reward-name">{r.name}</div>
                  <div className="reward-cost">
                    <span className="coin" />
                    {r.cost.toLocaleString()} 玉
                  </div>
                </div>
                <button
                  className={`btn-small-red ${owned ? "owned" : ""} ${!affordable && !owned ? "disabled" : ""}`}
                  onClick={() => buy(r)}
                  disabled={owned}
                >
                  {owned ? "交換済" : "交換"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {toast && <div className="toast fade-up">{toast}</div>}
    </>
  );
}
