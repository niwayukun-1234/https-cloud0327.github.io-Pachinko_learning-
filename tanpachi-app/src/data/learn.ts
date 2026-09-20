/** 1セッションの問題数 */
export const LEARN_TOTAL = 10;

/** 1問正解あたりの獲得玉 */
export const LEARN_REWARD = 10;

/** 学習セッションの進行状況を保持するキー */
export const LEARN_SESSION_KEY = "tanpachi:session";

/** 直近に完了したセッションの結果を保持するキー（リザルト画面の再読込用） */
export const LEARN_RESULT_KEY = "tanpachi:lastResult";

/** 復習したい単語IDを引き継ぐキー（リザルト画面 → 次の学習セッション） */
export const LEARN_REVIEW_KEY = "tanpachi:review";
