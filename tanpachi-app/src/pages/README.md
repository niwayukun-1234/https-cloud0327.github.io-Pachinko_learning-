# 画面別ディレクトリ

各画面は、画面コンポーネントと専用スタイルを同じフォルダにまとめています。画面担当者は原則として担当フォルダ内を編集してください。

| フォルダ | ルート | 画面 |
| --- | --- | --- |
| `Welcome/` | `/` | ウェルカム |
| `Home/` | `/home` | ホーム |
| `Learn/` | `/learn` | 学習 |
| `Correct/` | `/learn/correct` | 正解結果 |
| `PachinkoMode/` | `/pachinko` | パチンコモード |
| `Rewards/` | `/rewards` | 報酬 |
| `Words/` | `/words` | 単語図鑑・復習 |
| `Records/` | `/records` | 学習記録 |
| `MyPage/` | `/mypage` | マイページ |
| `MenuPage/` | `/menu` | メニュー |
| `BallHistory/` | `/history` | 玉履歴 |

複数画面で利用するUIは `src/components/`、共有データは `src/data/`、共有状態は `src/store/` に置きます。
