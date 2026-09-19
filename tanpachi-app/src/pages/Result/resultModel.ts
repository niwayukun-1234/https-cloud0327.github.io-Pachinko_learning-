import { QUIZ_SPIN_CONFIG } from "../../hooks/usePachinkoSpin";
import type {
  LearnSessionResult,
  RankEnglish,
  ResultView,
  ScoreRank,
  SessionAnswer,
} from "../../types";
import { accuracy, type AppState } from "../../store/AppContext";

/**
 * スコア計算の係数。
 * 「正解数」だけでなく「解答の速さ」も反映させることで、
 * 結果画面のスコアが学習内容と結びついた意味のある指標になる。
 */
const BASE_PER_CORRECT = 900;
const PERFECT_BONUS = 3000;
/** 1問あたりの速度ボーナス上限（0秒で満点） */
const SPEED_BONUS_MAX = 480;
/** この秒数以上かかった問題は速度ボーナスなし */
const SPEED_BONUS_WINDOW = 8;

/** 1問の解答時間から速度ボーナスを求める */
export function speedBonus(seconds: number): number {
  const raw = (SPEED_BONUS_WINDOW - seconds) * 60;
  return Math.max(0, Math.min(SPEED_BONUS_MAX, Math.round(raw)));
}

/** その問題数で理論上とりうる最高スコア（ボーナスゲージの分母） */
export function maxScore(total: number): number {
  return total * BASE_PER_CORRECT + PERFECT_BONUS + total * SPEED_BONUS_MAX;
}

/** セッションのスコアを計算する */
export function calcScore(answers: SessionAnswer[]): number {
  const correct = answers.filter((a) => a.correct);
  const base = correct.length * BASE_PER_CORRECT;
  const perfect = answers.length > 0 && correct.length === answers.length ? PERFECT_BONUS : 0;
  const speed = correct.reduce((sum, a) => sum + speedBonus(a.seconds), 0);
  return base + perfect + speed;
}

type Grade = {
  scoreRank: ScoreRank;
  rankEnglish: RankEnglish;
  evalTitle: string;
  evalDescription: string;
  nextStep: string;
};

/** 正答率から評価ランクを決める */
export function grade(rate: number, total: number): Grade {
  if (total > 0 && rate >= 100) {
    return {
      scoreRank: "極",
      rankEnglish: "SSS",
      evalTitle: "全問正解・完璧な仕上がり",
      evalDescription: "ミスなしでセッションを駆け抜けました。",
      nextStep: "この調子で次の範囲へ進みましょう。",
    };
  }
  if (rate >= 90) {
    return {
      scoreRank: "秀",
      rankEnglish: "S",
      evalTitle: "高正答率・安定した手応え",
      evalDescription: "ほとんど迷わず答えられています。",
      nextStep: "間違えた1〜2語だけ見直せば完璧です。",
    };
  }
  if (rate >= 70) {
    return {
      scoreRank: "優",
      rankEnglish: "A",
      evalTitle: "合格ライン・あと一歩",
      evalDescription: "基本は身についています。",
      nextStep: "間違えた単語を単語帳で復習しましょう。",
    };
  }
  return {
    scoreRank: "良",
    rankEnglish: "B",
    evalTitle: "伸びしろ十分・まずは一巡",
    evalDescription: "初見の単語が多かったセッションです。",
    nextStep: "同じ範囲をもう一度解くと定着します。",
  };
}

/** 秒を「分:秒」表記にする（例 18:32） */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * セッション記録 + 既存の AppState から、リザルト画面の表示モデルを組み立てる。
 * `base` はセッション終了直後（＝記録を書き込む前）の state を渡す。
 */
export function buildResultView(session: LearnSessionResult, base: AppState): ResultView {
  const answers = session.answers;
  const totalCount = answers.length;
  const correctCount = answers.filter((a) => a.correct).length;
  const accuracyRate = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  const score = calcScore(answers);
  const g = grade(accuracyRate, totalCount);

  const sumSeconds = answers.reduce((sum, a) => sum + a.seconds, 0);
  const elapsed = (Date.parse(session.finishedAt) - session.startedAt) / 1000;
  // 実測の経過時間を学習時間とする。ただしタブを離れていた時間まで
  // 学習時間に含めてしまわないよう、1問あたり最大60秒の余裕を上限とする。
  const maxSeconds = sumSeconds + totalCount * 60;
  const studyTimeSeconds = Math.max(
    sumSeconds,
    Math.min(Number.isFinite(elapsed) ? elapsed : 0, maxSeconds),
  );
  const sessionMinutes = Math.floor(studyTimeSeconds / 60);

  return {
    accuracyRate,
    correctCount,
    totalCount,
    score,
    isNewRecord: base.bestScore > 0 && score > base.bestScore,
    scoreRank: g.scoreRank,
    rankEnglish: g.rankEnglish,
    evalTitle: g.evalTitle,
    evalDescription: g.evalDescription,
    nextStep: g.nextStep,
    heldBalls: base.balls,
    gainedBalls: session.earnedBalls,
    studyTimeSeconds,
    goalMinutes: base.goalMinutes,
    todayAccumulatedSeconds: (base.todayMinutes + sessionMinutes) * 60,
    streakDays: base.streakDays,
    masteredCount: base.learnedCount,
    level: base.level,
    expPercent: Math.min(100, Math.round((base.exp / base.expToNext) * 100)),
    spinCost: QUIZ_SPIN_CONFIG.spinCost,
    words: answers,
    averageSeconds: totalCount === 0 ? 0 : sumSeconds / totalCount,
    totalAccuracy: accuracy(base),
  };
}
