import { useState } from "react";
import { useNavigate } from "react-router-dom";
import hall from "./hall.jpg";
import "./Login.css";

type Seat = {
  id: string;
  badge: string;
  name: string;
  hint: string;
};

const SEATS: Seat[] = [
  {
    id: "pachitan",
    badge: "既存アカウント",
    name: "パチたん",
    hint: "続きからスタート",
  },
  {
    id: "guest",
    badge: "ゲスト",
    name: "ゲスト",
    hint: "ログインせずにはじめる",
  },
];

export function Login() {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string | null>(null);

  const enter = (seat: Seat) => {
    if (picked) return;
    setPicked(seat.id);
    window.setTimeout(() => navigate("/home"), 420);
  };

  return (
    <div className="login">
      <div className="login-bg" style={{ backgroundImage: `url(${hall})` }} />
      <div className="login-vignette" />

      <div className="login-content">
        <p className="login-kicker">パチ単語</p>
        <h1 className="login-title">ログイン</h1>
        <p className="login-sub">アカウントを選んでスタート</p>

        <ul className="login-seats">
          {SEATS.map((seat, i) => (
            <li key={seat.id} style={{ animationDelay: `${0.18 + i * 0.12}s` }}>
              <button
                className={`login-seat${picked === seat.id ? " is-picked" : ""}`}
                onClick={() => enter(seat)}
                disabled={picked !== null}
              >
                <span className="login-avatar" aria-hidden>
                  {seat.name.slice(0, 1)}
                </span>
                <span className="login-seat-body">
                  <span className="login-badge">{seat.badge}</span>
                  <span className="login-name">{seat.name}</span>
                  <span className="login-hint">{seat.hint}</span>
                </span>
                <span className="login-enter-label">はじめる</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {picked && <div className="login-flash" aria-hidden />}
    </div>
  );
}
