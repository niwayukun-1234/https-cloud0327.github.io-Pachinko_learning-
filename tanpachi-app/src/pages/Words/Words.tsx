import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../components/Header";
import { ChevronRight, Filter, RotateCcw, Search, SearchX, Star, X } from "../../components/Icons";
import { TabBar } from "../../components/TabBar";
import { LEARN_REVIEW_KEY } from "../../data/learn";
import { WORDS } from "../../data/words";
import { useApp } from "../../store/AppContext";
import type { CatalogStatus, PartOfSpeech } from "../../types";
import {
  POS_FILTERS,
  SORT_OPTIONS,
  STATUS_TABS,
  accuracyOf,
  catalogStatus,
  lastStudiedLabel,
  type SortOption,
  type StatusTab,
} from "./catalog";
import { StatusMark } from "./StatusMark";
import { WordDetail } from "./WordDetail";
import "./Words.css";

/** 復習優先の並び順で使う重み */
const STATUS_RANK: Record<CatalogStatus, number> = { review: 0, unlearned: 1, mastered: 2 };

export function Words() {
  const { state, toggleStar, setReview } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<StatusTab>("all");
  const [pos, setPos] = useState<PartOfSpeech | "all">("all");
  const [sort, setSort] = useState<SortOption>("id");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 表示中に日付が動かないよう、マウント時に一度だけ現在時刻を取得する
  const [now] = useState(() => Date.now());

  /* ---------- 単語ごとの状態（実データから導出） ---------- */
  const rows = WORDS.map((word) => {
    const stat = state.wordStats[word.id];
    const ws = state.wordStatus[word.id];
    return {
      word,
      stat,
      ws,
      status: catalogStatus(stat, ws),
      lastLabel: lastStudiedLabel(stat?.lastAt, now),
    };
  });

  const reviewIds = rows.filter((r) => r.status === "review").map((r) => r.word.id);

  /* ---------- 図鑑全体の状況（コレクションとしての達成度） ---------- */
  const total = state.catalogTotal;
  const mastered = state.catalogMastered;
  const reviewTotal = Math.max(0, total - mastered);
  const rate = total === 0 ? 0 : Math.round((mastered / total) * 100);

  /* ---------- 絞り込み ---------- */
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (pos !== "all" && r.word.partOfSpeech !== pos) return false;
    if (!q) return true;
    return (
      r.word.word.toLowerCase().includes(q) ||
      r.word.meaning.toLowerCase().includes(q) ||
      r.word.phonetic.toLowerCase().includes(q) ||
      (r.word.meaningDetail ?? "").toLowerCase().includes(q)
    );
  });

  const list = [...filtered].sort((a, b) => {
    if (sort === "alpha") return a.word.word.localeCompare(b.word.word);
    if (sort === "reviewFirst")
      return (
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        (a.word.indexNo ?? Number.MAX_SAFE_INTEGER) - (b.word.indexNo ?? Number.MAX_SAFE_INTEGER)
      );
    if (sort === "recent")
      return (
        (b.stat?.lastAt ?? "").localeCompare(a.stat?.lastAt ?? "") ||
        (a.word.indexNo ?? Number.MAX_SAFE_INTEGER) - (b.word.indexNo ?? Number.MAX_SAFE_INTEGER)
      );
    return (a.word.indexNo ?? Number.MAX_SAFE_INTEGER) - (b.word.indexNo ?? Number.MAX_SAFE_INTEGER);
  });

  const searching = q.length > 0;
  const narrowed = searching || tab !== "all" || pos !== "all";
  const selected = WORDS.find((w) => w.id === selectedId) ?? null;

  const resetFilters = () => {
    setTab("all");
    setPos("all");
    setQuery("");
  };

  /** 要復習の単語をまとめて学習セッションへ引き継ぐ（学習画面の既存導線を再利用） */
  const startReview = (ids: string[]) => {
    try {
      sessionStorage.setItem(LEARN_REVIEW_KEY, JSON.stringify(ids));
    } catch {
      /* ストレージが使えない場合は通常の学習として開始する */
    }
    navigate("/learn");
  };

  return (
    <>
      <Header title="単語図鑑" back="/home" />
      <div className={`screen-scroll with-tab words ${reviewIds.length > 0 ? "has-cta" : ""}`}>
        {/* ② 学習状況を一目で確認（数字を並べるだけのダッシュボードにはしない） */}
        <section className="wt-overview panel" aria-label="図鑑の学習状況">
          <div className="wt-overview-row">
            <div className="wt-ov">
              <span className="k">全単語</span>
              <span className="v">
                <b>{total}</b>
                <i>語</i>
              </span>
            </div>
            <div className="wt-ov">
              <span className="k">習得</span>
              <span className="v gold">
                <b>{mastered}</b>
                <i>語</i>
              </span>
            </div>
            <div className="wt-ov">
              <span className="k">要復習</span>
              <span className="v red">
                <b>{reviewTotal}</b>
                <i>語</i>
              </span>
            </div>
          </div>
          <div className="wt-rate">
            <span className="k">図鑑の達成度</span>
            <span className="p">
              <b>{rate}</b>%
            </span>
          </div>
          <div className="progress wt-bar">
            <span style={{ width: `${rate}%` }} />
          </div>
          <div className="wt-legend">
            <span className="lg-mastered">
              <i />
              習得済 {mastered}語
            </span>
            <span className="lg-review">
              <i />
              要復習 {reviewTotal}語
            </span>
          </div>
        </section>

        {/* ③ 検索（英単語・日本語訳の両方を対象にする） */}
        <div className="wt-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="単語を検索（英単語・日本語訳）"
            aria-label="単語を検索"
          />
          {query.length > 0 && (
            <button className="wt-search-x" onClick={() => setQuery("")} aria-label="検索語を消す">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ④ カテゴリ・フィルター（迷わず操作できる範囲に留める） */}
        <div className="wt-tabs" role="tablist" aria-label="学習状態で絞り込む">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              className={`wt-tab ${tab === t.value ? "on" : ""}`}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="wt-sub">
          <Filter size={13} />
          <div className="wt-chips">
            {POS_FILTERS.map((p) => (
              <button
                key={p}
                className={`wt-chip ${pos === p ? "on" : ""}`}
                onClick={() => setPos(p)}
                aria-pressed={pos === p}
              >
                {p === "all" ? "すべて" : p}
              </button>
            ))}
          </div>
          <div className="wt-sort">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              aria-label="並び順"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ⑤ 単語図鑑 */}
        <div className="wt-count">
          <span>
            表示中 <b>{list.length}</b> 語
          </span>
          {narrowed && (
            <button className="wt-reset" onClick={resetFilters}>
              条件をクリア
            </button>
          )}
        </div>

        {list.length > 0 ? (
          <ul className="wt-rows">
            {list.map((r) => {
              const acc = accuracyOf(r.stat);
              return (
                <li key={r.word.id} className="wt-row">
                  <button
                    className="wt-row-main"
                    onClick={() => setSelectedId(r.word.id)}
                    aria-label={`${r.word.word} の詳細を見る`}
                  >
                    <span className="wt-row-top">
                      <span className="wt-no">
                        {r.word.indexNo === undefined
                          ? "No.—"
                          : `No.${String(r.word.indexNo).padStart(3, "0")}`}
                      </span>
                      <span className="wt-pos">{r.word.partOfSpeech ?? "—"}</span>
                      <span className={`wt-badge st-${r.status}`}>
                        <StatusMark st={r.status} />
                        {r.status === "mastered" ? "習得済み" : r.status === "review" ? "要復習" : "未習得"}
                      </span>
                    </span>

                    <span className="wt-row-en">{r.word.word}</span>
                    <span className="wt-row-phon">{r.word.phonetic}</span>
                    <span className="wt-row-ja">{r.word.meaning}</span>

                    <span className="wt-row-bottom">
                      <span className="wt-meta">
                        {r.stat && r.stat.count > 0 ? (
                          <>
                            学習 <b>{r.stat.count}</b>回
                            {acc !== null && <em>正解 {acc}%</em>}
                            <em>{r.lastLabel}</em>
                          </>
                        ) : (
                          <em>まだ学習していません</em>
                        )}
                      </span>
                      <ChevronRight size={16} />
                    </span>
                  </button>

                  <button
                    className={`wt-row-star ${r.ws?.starred ? "on" : ""}`}
                    onClick={() => toggleStar(r.word.id)}
                    aria-pressed={r.ws?.starred ?? false}
                    aria-label={r.ws?.starred ? "お気に入りから外す" : "お気に入りに追加"}
                  >
                    <Star size={17} filled={r.ws?.starred ?? false} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="wt-empty">
            <span className="wt-empty-icon">
              <SearchX size={26} />
            </span>
            <p className="wt-empty-main">
              {searching ? "該当する単語が見つかりませんでした" : "この条件に合う単語はありません"}
            </p>
            <p className="wt-empty-sub">
              {searching ? "別のキーワードで検索してみてください。" : "絞り込み条件を変えてみてください。"}
            </p>
            <button className="wt-empty-btn" onClick={resetFilters}>
              条件をクリア
            </button>
          </div>
        )}

        {/* 図鑑としての手ざわり（収録数と操作方法を1行で添える） */}
        <p className="wt-note">
          全 {total}語 を収録、{mastered}語 を習得しました。単語をタップすると、意味・例文・学習履歴を確認できます。
        </p>
      </div>

      {/* ⑧ 復習導線（画面内のCTAはこの1か所だけ） */}
      {reviewIds.length > 0 ? (
        <div className="wt-cta">
          <div className="wt-cta-info">
            <span className="wt-cta-icon">
              <RotateCcw size={15} />
            </span>
            <span className="wt-cta-text">
              <b>復習が必要な単語があります</b>
              <i>まだ定着していない単語を出題します</i>
            </span>
          </div>
          <button className="wt-cta-btn" onClick={() => startReview(reviewIds)}>
            復習を始める
          </button>
        </div>
      ) : (
        <div className="wt-cta is-clear">
          <span className="wt-cta-icon">
            <RotateCcw size={15} />
          </span>
          <span className="wt-cta-text">
            <b>要復習の単語はありません</b>
            <i>この調子で定着しています</i>
          </span>
          <button className="wt-cta-link" onClick={() => startReview([])}>
            全単語から復習
          </button>
        </div>
      )}

      {selected && (
        <WordDetail
          word={selected}
          stat={state.wordStats[selected.id]}
          ws={state.wordStatus[selected.id]}
          status={catalogStatus(state.wordStats[selected.id], state.wordStatus[selected.id])}
          now={now}
          onClose={() => setSelectedId(null)}
          onToggleStar={() => toggleStar(selected.id)}
          onToggleReview={() =>
            setReview(
              selected.id,
              catalogStatus(state.wordStats[selected.id], state.wordStatus[selected.id]) !== "review",
            )
          }
          onJumpToRow={() => setSelectedId(null)}
        />
      )}

      <TabBar />
    </>
  );
}
