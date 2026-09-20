# Tanpachi App

英単語学習とパチンコのゲーム性を組み合わせた学習アプリです。

## チーム向け公開URL

GitHub Pagesを有効にしてデプロイすると、次のURLから利用できます。

https://cloud0327.github.io/Pachinko_learning/

## ローカル起動

```bash
npm ci
npm run dev
```

## 本番ビルド

```bash
npm run build
```

`main` ブランチへ変更を反映すると、GitHub Actionsが `tanpachi-app` をビルドしてGitHub Pagesへ公開します。

## 学習結果画面(リザルト)

学習セッション(10問)を終えると、結果画面へ遷移します。

```
/learn (10問目) → /learn/correct (最後の1問が正解のとき) → /result
/learn (10問目) → 「結果を見る」ボタン (最後の1問が不正解のとき) → /result
```

### 表示内容とデータの出どころ

ダミーデータは使わず、すべて実データから算出しています。

| 表示 | 算出元 |
| --- | --- |
| 正解率 / 正解数 / 問題数 | セッション中の解答記録(`SessionAnswer[]`) |
| スコア | 正解数 × 900 + パーフェクトボーナス 3,000 + 解答速度ボーナス |
| 出題順の結果(10×2ブロック) | セッション中の各問の正誤 |
| 所持玉 | `AppState.balls`(学習で増えた玉を含む) |
| 今回獲得 | 正解数 × `LEARN_REWARD`(10玉) |
| 学習時間 | セッションの実測経過時間(解答時間の合計〜+1問60秒を上限) |
| 本日の累計 / 目標 | `AppState.todayMinutes` + 今回 / `AppState.goalMinutes` |
| Lv / EXP / 連続学習日数 | `AppState.level` / `exp` / `streakDays` |
| 評価ランク(極/秀/優/良) | 正解率から決定 |

* スコアは「正解数」だけでなく「解答の速さ」も加味するため、意味のある指標になります。
* 結果画面を開いた時点で、自己ベスト(`AppState.bestScore`)と本日の学習時間を
  `recordSession()` で1回だけ記録します(同じセッションは二重加算しません)。
* 単語の内訳から「間違えた単語をもう一度解く」を選ぶと、その単語だけで次の
  セッションを組み立てます(`tanpachi:review` 経由)。
* 玉の履歴は既存の `/history` 画面を再利用します。

関連ファイル:

- `src/pages/Result/Result.tsx` … 画面本体・ルーティング・遷移
- `src/pages/Result/resultModel.ts` … 実データ → 表示モデルの変換(スコア計算・ランク判定)
- `src/pages/Result/ResultHero.tsx` / `ResultBalls.tsx` / `ResultTime.tsx` / `ResultWords.tsx` / `ResultUser.tsx` / `ResultFooter.tsx`
- `src/pages/Result/Result.css`
- `src/hooks/useCountUp.ts` … スコア等のカウントアップ
- `src/lib/random.ts` / `src/lib/speech.ts` … 画面間で共有する小道具
- `src/data/learn.ts` … セッション定数と storage キー


## 単語帳図鑑・復習(図鑑)

学習した英単語を「図鑑」として眺め、苦手な単語を復習する画面です。
タブバーの「図鑑」(`/words`)から開きます。

### 画面構成

上から「探す → 復習すべき単語を把握する → 確認する → 詳細を見る → 復習を開始する」の順に並べています。

| # | セクション | 内容 |
| --- | --- | --- |
| ① | ヘッダー | 「単語図鑑」のタイトル |
| ② | 学習状況 | 全単語 248語 / 習得 182語 / 要復習 66語 と図鑑の達成度バー |
| ③ | 検索 | プレースホルダー「単語を検索（英単語・日本語訳）」。英単語・日本語訳・発音・語義の補足を対象に絞り込み |
| ④ | フィルター | すべて / 要復習 / 習得済み / 未習得 の 4 タブ + 品詞チップ + 並び順 |
| ⑤ | 単語図鑑 | 図鑑No・品詞・学習状態・英単語・発音・日本語訳・学習回数・正解率・直近学習 |
| ⑥ | 学習状態 | 「習得済み / 要復習 / 未習得」を **文字 + アイコン + 色** の 3 点で表現 |
| ⑦ | 単語詳細 | 行をタップするとボトムシートで 英単語 → 意味 → 品詞 → 例文 → よく使う表現 → 学習履歴 を表示 |
| ⑧ | 復習導線 | 画面下部に 1 か所だけ CTA を配置 |

### 表示内容とデータの出どころ

ダミー表示ではなく、既存の実データから算出しています。

| 表示 | 算出元 |
| --- | --- |
| 全単語 / 習得語数 | `AppState.catalogTotal` / `AppState.catalogMastered` |
| 要復習語数 | `catalogTotal - catalogMastered` |
| 学習状態(習得済み/要復習/未習得) | `AppState.wordStats` (出題回数・正解数) と `AppState.wordStatus` (weak) から判定 |
| 学習回数・正解率・直近学習 | `AppState.wordStats[wordId]` |
| 図鑑No・品詞・例文・コロケーション | `src/data/words.ts` |

学習状態の判定は `catalogStatus()` に集約しています(出題回数0=未習得 / `weak`=要復習 / 正答率75%未満=要復習 / それ以外=習得済み)。
学習・パチンコのクイズに正解/不正解するたびに `wordStats` が更新されるため、図鑑の表示も実際の学習に追随します。

### 復習導線

画面下部の CTA「復習を始める」を押すと、要復習の単語IDを `sessionStorage` の `tanpachi:review` に引き継ぎ、既存の学習画面(`/learn`)へ遷移します。
学習画面側の `takeReviewIds()` がそのIDを読み取って出題するため、復習フローは既存実装を再利用しており、別実装は持っていません。

### 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `src/pages/Words/Words.tsx` | 画面本体(一覧・検索・フィルター・CTA) |
| `src/pages/Words/Words.css` | この画面のスタイル |
| `src/pages/Words/WordDetail.tsx` | 単語詳細のボトムシート |
| `src/pages/Words/StatusMark.tsx` | 学習状態のアイコン(色だけに頼らない表現) |
| `src/pages/Words/catalog.ts` | 状態判定・並び順・フィルター定義などの表示ロジック |
| `src/data/words.ts` | 図鑑に収録する単語データ |

## パチンコ英単語クイズ(1回転 = 1問)

パチンコモードの「PUSH」ボタンを押すたびに、通常の抽選演出の代わりに
英単語の4択クイズが中央にオーバーレイ表示されます。確率による間引きは行わず、
**毎回転で必ず1問出題**されます。クイズの正誤がその回転の抽選結果そのものを決定します。

### 1回転の流れ

1. 「PUSH」を押すとリール(reel-ring)が短く回転する
2. 回転演出が終わると、通常の当たり/外れ演出の代わりにクイズモーダルが表示される
   (背景のパチンコ台は薄暗くぼかして見える)
3. 4択の日本語訳ボタンから1つ選ぶ(各選択肢はパチンコの「入賞口」に対応)
4. 正解 → 「正解! +〇玉」を表示 → 所持玉に加算 → モーダルを閉じて「大当たり」演出
   不正解 → 「不正解…」を表示 → モーダルを閉じて「ハズレ」演出
5. 回転数(`totalSpins`)と所持玉を更新し、次の「PUSH」が押せる状態に戻る

### ルール設定(1箇所で切替可能)

`src/hooks/usePachinkoSpin.ts` の `QUIZ_SPIN_CONFIG` に集約しています。

```ts
export const QUIZ_SPIN_CONFIG: QuizSpinConfig = {
  spinCost: 10,                                                          // 1回転の消費玉
  penalty: 0,                                                            // 不正解時の減算(0=増えないだけ)
  rewardFor: (streak) => (streak >= 5 ? 40 : streak >= 3 ? 25 : 15),     // 連続正解ボーナス
  feverEvery: 5,                                                         // 5連ごとに
  feverBonus: 50,                                                        // +50玉のFEVERボーナス
  timings: { spinMs: 900, judgingMs: 1200, resultMs: 1000 },             // 演出テンポ(A: テンポ重視)
};
```

| 項目 | 現在の設定 | 切替例 |
| --- | --- | --- |
| 正解報酬 | 1〜2連=+15 / 3〜4連=+25 / 5連以上=+40、5連ごとに+50 | `rewardFor: () => 30` で固定報酬 |
| 不正解 | 増えないだけ(コスト10玉のみ消費) | `penalty: 10` で減算に変更 |
| テンポ | 約3.1秒 + 回答時間(テンポ重視) | `timings` を大きくすると演出寄り |

### クイズデータ

`src/data/toeicQuiz.json`(TOEIC 500-600 / 100問)をそのまま使用しています。
出題はランダムで、**全100問を出題し終えるまで重複しません**(1周すると自動でプールをリセット)。

### 途中結果(プレイ中の進捗確認)

パチンコモードの「途中結果」バーをタップすると、**ゲームを中断せずに**現在の成績を
モーダルで確認できます。閉じる(「ゲームに戻る」/背景タップ)とそのままプレイを継続します。

* 途中結果は「今のセッションで何を答えたか」を見るだけで、最終結果画面(`/result`)とは別物です。
* 表示する値は既存の単一情報源から導出し、独自の状態は持ちません(同じ状態を二重に持たない)。

| 表示 | 算出元 |
| --- | --- |
| 正解率 / 正解数 / 不正解数 / スコア | フックが保持するセッションの解答記録(`SpinSessionAnswer[]`) |
| 第n問 / 全問・進捗% | `usePachinkoSpin` の `drawn` / `total` |
| 所持玉 / 連続正解 | `AppState.balls` / `AppState.streak` |
| 通算正答率 | `AppState` から `accuracy()` で算出 |
| 学習時間 | フックが保持する `startedAt` からの経過時間(開閉してもリセット・停止しない) |

正解率・スコア・評価チップ・学習時間の表示は最終結果画面と同じ既存ロジック
(`resultModel.ts` の `calcScore` / `grade` / `accuracyChip` / `formatDuration`)を再利用しています。

### 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `src/data/toeicQuiz.json` / `.ts` | クイズデータとその型定義・ローダー |
| `src/hooks/useQuizModal.ts` | 出題ロジック(ランダム選出・重複回避) |
| `src/hooks/usePachinkoSpin.ts` | 1回転のライフサイクル管理(idle→spinning→quiz→judging→result)とセッションの解答記録・開始時刻 |
| `src/components/QuizModal.tsx` / `.css` | 4択クイズモーダル |
| `src/store/AppContext.tsx` | `SPIN_QUIZ` アクション(1回転分をまとめて確定) |
| `src/pages/PachinkoMode/PachinkoMode.tsx` | PUSH→クイズ→判定→演出の統合 |
| `src/pages/PachinkoMode/ProgressModal.tsx` / `.css` | 途中結果モーダル(ゲームを止めずに進捗確認) |
| `src/pages/Result/resultModel.ts` | スコア計算・ランク判定・評価チップ(結果画面と途中結果で共用) |

## 技術構成

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
