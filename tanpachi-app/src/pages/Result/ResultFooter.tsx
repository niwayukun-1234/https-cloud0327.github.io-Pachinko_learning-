import { Home, Play, RotateCcw } from "../../components/Icons";

type Props = {
  onPlayPachinko: () => void;
  onLearnMore: () => void;
  onGoHome: () => void;
  hasMissed: boolean;
  onReviewMissed: () => void;
};

/** 結果画面のアクション。既存の画面遷移のみを行う。 */
export function ResultFooter({
  onPlayPachinko,
  onLearnMore,
  onGoHome,
  hasMissed,
  onReviewMissed,
}: Props) {
  return (
    <footer className="r-foot">
      <button type="button" className="r-play-btn" onClick={onPlayPachinko}>
        <span className="l">
          <span className="r-ball sm" aria-hidden />
          <span>
            <span className="title">
              <span>パチンコで遊ぶ</span>
              <span className="badge">出玉UP中!</span>
            </span>
            <span className="sub">獲得した玉で実機をプレイ！</span>
          </span>
        </span>
        <span className="go">
          <Play size={14} />
        </span>
      </button>

      <div className="r-foot-grid">
        <button type="button" className="r-foot-btn blue" onClick={onLearnMore}>
          <RotateCcw size={14} />
          <span>もう一度学ぶ</span>
        </button>
        <button type="button" className="r-foot-btn ghost" onClick={onGoHome}>
          <Home size={14} />
          <span>ホームへ戻る</span>
        </button>
      </div>

      {hasMissed && (
        <button type="button" className="r-foot-review" onClick={onReviewMissed}>
          間違えた単語を復習する &gt;
        </button>
      )}
    </footer>
  );
}
