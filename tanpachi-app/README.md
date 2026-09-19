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

### 関連ファイル

| ファイル | 役割 |
| --- | --- |
| `src/data/toeicQuiz.json` / `.ts` | クイズデータとその型定義・ローダー |
| `src/hooks/useQuizModal.ts` | 出題ロジック(ランダム選出・重複回避) |
| `src/hooks/usePachinkoSpin.ts` | 1回転のライフサイクル管理(idle→spinning→quiz→judging→result) |
| `src/components/QuizModal.tsx` / `.css` | 4択クイズモーダル |
| `src/store/AppContext.tsx` | `SPIN_QUIZ` アクション(1回転分をまとめて確定) |
| `src/pages/PachinkoMode/PachinkoMode.tsx` | PUSH→クイズ→判定→演出の統合 |

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
