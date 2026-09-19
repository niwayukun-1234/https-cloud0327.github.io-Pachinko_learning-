import { useMemo, useState } from "react";
import { Header } from "../../components/Header";
import { ChevronLeft, ChevronRight } from "../../components/Icons";
import { accuracy, useApp } from "../../store/AppContext";
import "./Records.css";

type Range = "day" | "week" | "month";

const WEEK = ["月", "火", "水", "木", "金", "土", "日"];

function fmtDate(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
function fmtWeek(d: Date) {
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getMonth() + 1}/${start.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}`;
}
function fmtMonth(d: Date) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function Records() {
  const { state } = useApp();
  const [range, setRange] = useState<Range>("day");
  const [offset, setOffset] = useState(0);

  const date = useMemo(() => {
    const d = new Date();
    if (range === "day") d.setDate(d.getDate() + offset);
    if (range === "week") d.setDate(d.getDate() + offset * 7);
    if (range === "month") d.setMonth(d.getMonth() + offset);
    return d;
  }, [range, offset]);

  const { bars, labels, total, max } = useMemo(() => {
    if (range === "day") {
      const bars = offset === 0 ? state.hourly : (() => {
        const r = seeded(offset + 100);
        return Array.from({ length: 24 }, (_, i) => (i < 6 ? 0 : Math.round(r() * 12)));
      })();
      const labels = bars.map((_, i) => (i % 3 === 0 ? String(i) : ""));
      return { bars, labels, total: bars.reduce((a, b) => a + b, 0), max: 30 };
    }
    if (range === "week") {
      const r = seeded(offset + 200);
      const bars = Array.from({ length: 7 }, () => 5 + Math.round(r() * 35));
      return { bars, labels: WEEK, total: bars.reduce((a, b) => a + b, 0), max: 45 };
    }
    const r = seeded(offset + 300);
    const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const bars = Array.from({ length: days }, () => Math.round(r() * 40));
    const labels = bars.map((_, i) => ((i + 1) % 5 === 0 ? String(i + 1) : ""));
    return { bars, labels, total: bars.reduce((a, b) => a + b, 0), max: 45 };
  }, [range, offset, state.hourly, date]);

  const title = range === "day" ? fmtDate(date) : range === "week" ? fmtWeek(date) : fmtMonth(date);
  const yTicks = range === "day" ? [30, 20, 10, 0] : [40, 30, 20, 10, 0];

  return (
    <>
      <Header title="学習記録" back />
      <div className="screen-scroll records">
        <div className="seg records-seg">
          {(["day", "week", "month"] as Range[]).map((r) => (
            <button
              key={r}
              className={range === r ? "active" : ""}
              onClick={() => {
                setRange(r);
                setOffset(0);
              }}
            >
              {r === "day" ? "日" : r === "week" ? "週" : "月"}
            </button>
          ))}
        </div>

        <div className="records-nav">
          <button className="icon-btn" onClick={() => setOffset((o) => o - 1)} aria-label="前へ">
            <ChevronLeft />
          </button>
          <span>{title}</span>
          <button
            className="icon-btn"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset === 0}
            aria-label="次へ"
            style={{ opacity: offset === 0 ? 0.3 : 1 }}
          >
            <ChevronRight />
          </button>
        </div>

        <section className="panel records-chart">
          <div className="chart-head">
            <span className="label">学習時間</span>
            <span className="value">
              {total}
              <small>分</small>
            </span>
          </div>
          <div className="chart">
            <div className="y-axis">
              {yTicks.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="plot">
              {yTicks.map((t) => (
                <i key={t} className="grid-line" style={{ bottom: `${(t / max) * 100}%` }} />
              ))}
              <div className="bars">
                {bars.map((v, i) => (
                  <span key={i} className="bar-col">
                    <span className="bar" style={{ height: `${Math.min(100, (v / max) * 100)}%` }} />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="x-axis" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
            {labels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
            <span className="x-unit">{range === "day" ? "(時)" : range === "month" ? "(日)" : ""}</span>
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
            <div className="label">正答率</div>
            <div className="value">
              {accuracy(state)}
              <span className="unit">%</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="label">獲得玉</div>
            <div className="value gold">
              +{state.earnedToday}
              <span className="unit">玉</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
