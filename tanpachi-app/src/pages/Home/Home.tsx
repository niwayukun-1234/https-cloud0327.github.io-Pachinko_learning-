import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Flame, Pachinko, User } from "../../components/Icons";
import { TabBar } from "../../components/TabBar";
import { accuracy, useApp } from "../../store/AppContext";
import { BallCounter } from "../../components/BallCounter";
import "./Home.css";

export function Home() {
  const { state } = useApp();
  const navigate = useNavigate();
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
          <span className="home-top-spacer" aria-hidden />
        </div>

        <section className="home-banner">
          <p className="banner-title brush">継続は力なり</p>
          <p className="banner-sub">今日もコツコツ、未来の自分が熱くなる。</p>
        </section>

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

        <section className="gold-frame home-balls">
          <div className="balls-head">
            <span>所持玉</span>
            <span className="coin" aria-hidden />
          </div>
          <div className="balls-body">
            <BallCounter value={state.balls} size="lg" />
            <Link to="/history" className="balls-history">
              玉の履歴
            </Link>
          </div>
        </section>

        <button className="btn-cta home-cta" onClick={() => navigate("/learn")}>
          <span className="cta-row">
            <BookOpen size={28} />
            <span>
              英単語を学ぶ
              <span className="sub">問題を解いて玉をゲット！</span>
            </span>
          </span>
        </button>
        <button className="btn-cta blue home-cta" onClick={() => navigate("/pachinko")}>
          <span className="cta-row">
            <Pachinko size={28} />
            <span>
              パチンコで遊ぶ
              <span className="sub">集めた玉で実機をプレイ！</span>
            </span>
          </span>
        </button>
      </div>
      <TabBar />
    </>
  );
}
