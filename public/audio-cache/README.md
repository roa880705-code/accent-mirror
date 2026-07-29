# audio-cache

理想通りに発音できたAI生成音声を、Model English / 模範日本語ミラーの固定リファレンスとして
恒久的に使うためのキャッシュです。ここに置かれたファイルは `express.static` でそのまま
配信され、`git` にコミットされるため再デプロイでも消えません。

`/api/model-voice` と `/api/mirror-voice`（模範日本語ミラー）は、リクエストに対応する
ファイルがこの下に存在する場合、Azureでのライブ生成を行わずそのファイルをそのまま
返します。存在しない組み合わせは、これまで通りライブ生成されます。

## ファイル配置

```
public/audio-cache/<kind>/<contrastSetId>/<gender>.mp3
```

- `kind`: `model-english`（Model English）または `model-mirror`（模範日本語ミラー）
- `contrastSetId`: 練習文のID（例: `could-only`）
- `gender`: `male` または `female`

例: `public/audio-cache/model-english/could-only/female.mp3`

## 運用の流れ

1. 本番アプリでModel English / 模範日本語ミラーを再生し、良いテイクが出たら
   「この音声を保存」ボタンでダウンロードする。
2. ダウンロードしたファイルを、対象の練習文・性別を添えて開発者に送る。
3. 開発者が上記の命名規則に沿ってこのフォルダにコミット・pushする。
4. 以後、その組み合わせは常に同じ音声が返る（ライブ生成は行われない）。
