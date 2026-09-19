import { useState } from "react";
import { Header } from "../../components/Header";
import { ChevronRight, User } from "../../components/Icons";
import { MenuIcon } from "../../components/MenuIcon";
import { MYPAGE_ITEMS } from "../../data/rewards";
import { useApp } from "../../store/AppContext";
import "./MyPage.css";

export function MyPage() {
  const { state, reset } = useApp();
  const [toast, setToast] = useState<string | null>(null);
  const expPct = Math.round((state.exp / state.expToNext) * 100);

  const tap = (label: string) => {
    setToast(`「${label}」は準備中です`);
    window.setTimeout(() => setToast(null), 1500);
  };

  return (
    <>
      <Header title="マイページ" back />
      <div className="screen-scroll mypage">
        <section className="mypage-profile">
          <span className="avatar">
            <User size={34} />
          </span>
          <div className="profile-info">
            <div className="name">{state.userName}</div>
            <div className="lv">Lv.{state.level}</div>
            <div className="progress">
              <span style={{ width: `${expPct}%` }} />
            </div>
            <div className="exp">
              次のレベルまで {state.exp} / {state.expToNext}
            </div>
          </div>
        </section>

        <section className="home-banner mypage-banner">
          <p className="banner-title brush">継続は力なり</p>
          <p className="banner-sub">遊びながら、確かな力を。</p>
        </section>

        <ul className="list">
          {MYPAGE_ITEMS.map((m) => (
            <li key={m.label}>
              <button className="list-item" onClick={() => tap(m.label)}>
                <MenuIcon name={m.icon} />
                <span className="grow">{m.label}</span>
                <ChevronRight size={18} className="chev" />
              </button>
            </li>
          ))}
        </ul>

        <button
          className="mypage-reset"
          onClick={() => {
            if (window.confirm("学習データと所持玉を初期状態に戻しますか？")) reset();
          }}
        >
          データを初期化
        </button>
      </div>
      {toast && <div className="toast fade-up">{toast}</div>}
    </>
  );
}
