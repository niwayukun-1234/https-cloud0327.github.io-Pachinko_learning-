import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Flame, Pachinko, User } from "../../components/Icons";
import { TabBar } from "../../components/TabBar";
import { accuracy, useApp } from "../../store/AppContext";
import "./Home.css";

// 英単語の難易度（TOEICスコア別）
const DIFFICULTIES = [500, 600, 700, 750, 800, 850, 900] as const;
const DEFAULT_DIFFICULTY = 600;

// バナー（継続は力なり）クリック時に開くURL
const BANNER_URL = "https://www.youtube.com/watch?v=0LE9VE_iMSU";

export function Home() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState<number>(DEFAULT_DIFFICULTY);
  const pct = Math.min(100, Math.round((state.todayMinutes / state.goalMinutes) * 100));
  const expPct = Math.round((state.exp / state.expToNext) * 100);

  return (
    <>
      <div className="screen-scroll with-tab home">
        <div className="home-top">
          <Link to="/mypage" className="home-user">
            <span className="avatar">
              <User size={24} />
            </span>
            <span>
              <span className="name">{state.userName}</span>
              <span className="lv-row">
                <span className="lv">Lv.{state.level}</span>
                <span className="progress lv-bar">
                  <span style={{ width: `${expPct}%` }} />
                </span>
              </span>
            </span>
          </Link>
          <button className="icon-btn" aria-label="通知" onClick={() => navigate("/menu")}>
            <Bell size={22} />
          </button>
        </div>

        <a
          className="home-banner"
          href={BANNER_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="継続は力なり（動画を開く）"
        >
          <p className="banner-title brush">継続は力なり</p>
          <p className="banner-sub">今日もコツコツ、未来の自分が熱くなる。</p>
        </a>

        <section className="panel home-today">
          <div className="today-left">
            <span className="today-label">今日の学習</span>
            <span className="today-value">
              <Flame size={22} className="flame" />
              <b>{state.todayMinutes}</b>
              <span className="unit">分</span>
            </span>
          </div>
          <div className="today-right">
            <div className="goal-row">
              <span>目標</span>
              <span>{state.goalMinutes} 分</span>
            </div>
            <div className="progress">
              <span style={{ width: `${pct}%` }} />
            </div>
          </div>
        </section>

        <section className="stats-row">
          <div className="stat-card">
            <div className="label">覚えた単語</div>
            <div className="value">
              {state.learnedCount}
              <span className="unit">語</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="label">連続学習</div>
            <div className="value">
              {state.streakDays}
              <span className="unit">日</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="label">正答率</div>
            <div className="value">
              {accuracy(state)}
              <span className="unit">%</span>
            </div>
          </div>
        </section>

        <section className="panel home-difficulty">
          <div className="difficulty-head">
            <span className="difficulty-title">英単語の難易度</span>
            <span className="difficulty-sub">TOEICスコア別</span>
          </div>
          <div className="difficulty-options" role="radiogroup" aria-label="英単語の難易度">
            {DIFFICULTIES.map((score) => (
              <button
                key={score}
                type="button"
                role="radio"
                aria-checked={difficulty === score}
                className={`difficulty-btn ${difficulty === score ? "active" : ""}`}
                onClick={() => setDifficulty(score)}
              >
                <b>{score}</b>
                <span>点</span>
              </button>
            ))}
          </div>
        </section>

        <button
          className="btn-cta blue home-cta"
          onClick={() => navigate("/pachinko", { state: { difficulty } })}
        >
          <span className="cta-row">
            <Pachinko size={28} />
            <span>
              パチンコを始める
              <span className="sub">TOEIC {difficulty}点レベルで出題！</span>
            </span>
          </span>
        </button>
      </div>
      <TabBar />
    </>
  );
}
