# 英文法・英語読解トレーナー（grammar-reader）

高校英文法と標準的な英語読解のための練習アプリです。
同じリポジトリにありますが、Accent Mirror（発音アプリ）とは独立して動きます。

- 文法ドリル：10ユニット × 6問（全60問）、選択肢ごとの解説つき
- 読解：200語前後の英文5本 × 設問4問（全20問）、語注・段落和訳・重要文の構文解説つき
- 復習：間違えた問題を自動でキューに入れ、日を置いて再出題

外部APIもAPIキーも使いません。問題はすべてリポジトリ内の問題バンクから配信されます。

## 起動

リポジトリのルートで一度だけ依存関係を入れます。

```powershell
npm install
```

そのあと、ルートから起動します。

```powershell
npm run start:grammar
```

Windows ではこのフォルダの `start-3004.cmd` をダブルクリックしても起動します。

ブラウザで開くアドレス:

```text
http://localhost:3004/
```

ポートは `GRAMMAR_PORT` で変更できます（既定 3004。Accent Mirror の 3003 と重ならないようにしています）。

## 画面

| 画面 | できること |
| --- | --- |
| ホーム | 解答数・正答率・復習待ち・習得済みの集計、各モードへの入口 |
| 文法ドリル | ユニットを選んで6問連続。解答するとすぐに正解・和訳・解説・選択肢ごとのコメントが出ます |
| 読解 | 本文を読む→読了時間と wpm を表示→設問4問→構文解説と全文和訳。語注と段落ごとの和訳はボタンで開閉できます |
| 復習 | 間違えた問題を文法・読解の区別なく集めて出題（1回20問まで） |

## 学習記録と復習の仕組み

学習記録はブラウザの `localStorage`（キー `grammarReader.state.v1`）にだけ保存されます。
サーバーにも外部にも送られないので、端末やブラウザを変えると引き継がれません。
ホーム画面の「記録をすべて消す」でいつでも初期化できます。

復習は問題ごとに box（0〜3）を持つ簡単な間隔反復です（`public/reviewPlanner.js`）。

| box | 次に出題されるまで |
| --- | --- |
| 0（直前に間違えた） | すぐ |
| 1 | 1日後 |
| 2 | 3日後 |
| 3 | 習得済み。キューから外れる |

不正解になると box は 0 に戻ります。復習キューは間違えた回数が多い問題から順に出ます。

## 構成

```text
grammar-reader/
  server.js                      Express サーバー（既定ポート 3004）
  data/grammarBank.js            文法60問
  data/readingBank.js            読解5本＋設問20問
  src/services/contentService.js 一覧・個別取得・復習用の逆引き
  public/index.html              画面
  public/app.js                  画面の処理
  public/reviewPlanner.js        復習キューのロジック（ブラウザと Node の両方から使う）
  public/styles.css              スタイル（ダークモード対応）
  scripts/validate-content.js    問題バンクの整合性チェック
  scripts/test-review-planner.js 復習ロジックのテスト
  scripts/smoke-api.js           サーバーを起動して API を確認
```

## API

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/api/health` | 稼働確認と収録問題数 |
| GET | `/api/content` | 文法ユニットと読解パッセージの一覧 |
| GET | `/api/grammar/units` | 文法ユニット一覧 |
| GET | `/api/grammar/units/:unitId` | ユニット1つ分の問題（解説つき） |
| GET | `/api/reading/passages` | 読解パッセージ一覧 |
| GET | `/api/reading/passages/:passageId` | 本文・設問・和訳・構文解説 |
| POST | `/api/review/questions` | `{items:[{kind,groupId,questionId}]}` を送ると問題本体を返す |

## 問題を追加するとき

`data/grammarBank.js` / `data/readingBank.js` に追記したら、必ず次を実行します。

```powershell
npm run test:grammar
```

チェックしている内容:

- id の重複、選択肢4つ、`answerIndex` の範囲、解説の有無
- 文法問題に空所 `____` があること、選択肢ごとのコメントが選択肢の数だけあること
- 読解の語数（180〜320語）、段落数と和訳数の一致、語注4語以上
- 重要文と設問の根拠（`evidence`）が本文に実在すること
- 復習ロジックのテストと API の疎通

構文チェックだけなら `npm run check:grammar` です。
