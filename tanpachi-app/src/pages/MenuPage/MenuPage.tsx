import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { ChevronRight, Gift, Trophy, User } from "../../components/Icons";
import { MenuIcon } from "../../components/MenuIcon";
import { TabBar } from "../../components/TabBar";
import { MENU_ITEMS } from "../../data/rewards";
import "./MenuPage.css";

export function MenuPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const tap = (label: string) => {
    setToast(`「${label}」は準備中です`);
    window.setTimeout(() => setToast(null), 1500);
  };

  return (
    <>
      <Header title="メニュー" back="/home" />
      <div className="screen-scroll with-tab menu-page">
        <ul className="list menu-shortcuts">
          <li>
            <button className="list-item" onClick={() => navigate("/mypage")}>
              <User size={20} />
              <span className="grow">マイページ</span>
              <ChevronRight size={18} className="chev" />
            </button>
          </li>
          <li>
            <button className="list-item" onClick={() => navigate("/rewards")}>
              <Gift size={20} />
              <span className="grow">報酬・交換</span>
              <ChevronRight size={18} className="chev" />
            </button>
          </li>
          <li>
            <button className="list-item" onClick={() => navigate("/records")}>
              <Trophy size={20} />
              <span className="grow">学習記録</span>
              <ChevronRight size={18} className="chev" />
            </button>
          </li>
        </ul>

        <ul className="list">
          {MENU_ITEMS.map((m) => (
            <li key={m.label}>
              <button className="list-item" onClick={() => tap(m.label)}>
                <MenuIcon name={m.icon} />
                <span className="grow">{m.label}</span>
                {m.badge !== undefined && <span className="badge-red">{m.badge}</span>}
                {m.trailing ? (
                  <span className="trailing">{m.trailing}</span>
                ) : (
                  <ChevronRight size={18} className="chev" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <TabBar />
      {toast && <div className="toast fade-up">{toast}</div>}
    </>
  );
}
