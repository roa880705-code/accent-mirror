// Renderなどのホスティング環境ではアプリのディスクは一時的(再デプロイのたびに
// 消える)なため、実行中に生成した音声をランタイムでキャッシュしても永続しない。
// そこで「AIが生成した音声の中から、理想通りに発音できたテイクを人間が選んで
// 保存する」運用のために、gitリポジトリにコミットされた固定音声ファイルを
// public/audio-cache 配下に置き、それが存在する場合はライブ生成(OpenAI/Azure)を
// 一切呼ばずにそのまま返す仕組みを用意する(実機フィードバック: "AIで生成させた
// 音声の「理想通りに発音した音源」を記録保存し...永続的に設定するのは可能？")。
// public/配下はexpress.staticで既に配信されているため、コミットされたファイルは
// 再デプロイ後も常に同じ内容で残る。
const fs = require("fs");
const path = require("path");

const CACHE_ROOT = path.join(__dirname, "..", "..", "public", "audio-cache");

function sanitizeSegment(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

// kind: "model-english"(Model English) | "model-mirror"(模範日本語ミラー)
// contrastSetId: 練習文のID、emotionLevel: "natural" | "expressive"、gender: "male" | "female"
function cachedAudioPath({ kind, contrastSetId, emotionLevel, gender }) {
  const safeKind = sanitizeSegment(kind);
  const safeSetId = sanitizeSegment(contrastSetId);
  const safeLevel = sanitizeSegment(emotionLevel);
  const safeGender = sanitizeSegment(gender);
  if (!safeKind || !safeSetId || !safeLevel || !safeGender) return null;
  return path.join(CACHE_ROOT, safeKind, safeSetId, safeLevel, `${safeGender}.mp3`);
}

function findCachedAudio(params) {
  const filePath = cachedAudioPath(params);
  if (!filePath) return null;
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

module.exports = { cachedAudioPath, findCachedAudio };
