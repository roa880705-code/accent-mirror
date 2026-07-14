let contrastSets = [];
let selectedIndex = 0;
let lastRecording = null;
let sessionAttempts = [];
let validationLogs = [];
let latestAssessment = null;
let latestAttempt = null;
let activeRecorder = null;
let pendingValidationVerdict = "match";
let validationItemFeedback = {};
let friendCount = 248;
let mirrorProfile = {
  gender: "female",
  age: "20s",
  scene: "daily"
};

const $ = (id) => document.getElementById(id);
const FRIEND_COUNT_KEY = "accentMirrorFriendCount";

const VALIDATION_ITEMS = [
  { key: "meaning", label: "意味（参考）", targetId: "mirrorMeaning", hint: "自由発話や別英文として聞こえた時に重点確認。通常練習では参考項目です。" },
  { key: "phoneticMirror", label: "カタカナ聞こえ方", targetId: "mirrorPhonetic", hint: "録音した英語の音が、カタカナ聞こえ方として近く表現されているか。" },
  { key: "listenerExperience", label: "聞き手の受け取り方", targetId: "mirrorListener", hint: "聞き手にどう届くかの説明が実感と合っているか。" },
  { key: "analysisSignals", label: "分析された癖", targetId: "mirrorSpeechFeatures", hint: "速度、区切り、子音の弱さ、曖昧さ、音程、音素などの分析が実感と合っているか。" },
  { key: "reflectionSummary", label: "癖の反映まとめ", targetId: "mirrorReflectionSummary", hint: "どの癖を、どの日本語ミラー表現へ変換したかが納得できるか。" },
  { key: "mirrorVoiceOutput", label: "ミラー音声", targetId: "mirrorVoiceStatus", hint: "再生された日本語音声が、英語発音の癖を同じ種類の癖として反映しているか。" }
];

function currentSet() {
  return contrastSets[selectedIndex] || contrastSets[0];
}

function wordCountForText(text) {
  return String(text || "").match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)?.length || 0;
}

function loadFriendCount() {
  const stored = Number(localStorage.getItem(FRIEND_COUNT_KEY));
  friendCount = Number.isFinite(stored) && stored >= 248 ? stored : 248;
}

function saveFriendCount() {
  localStorage.setItem(FRIEND_COUNT_KEY, String(friendCount));
}

function friendPalette(seed) {
  const skins = ["#f3c39a", "#d89a67", "#8f5f3f", "#f0b884", "#c77b55", "#70462f"];
  const shirts = ["#f46d75", "#4f8fd9", "#66b36e", "#f1b84b", "#8b75d7", "#31a7a0", "#e97845"];
  const hair = ["#2d2118", "#6b4328", "#1f1c1a", "#875a37", "#d2a45a"];
  return {
    skin: skins[seed % skins.length],
    shirt: shirts[(seed * 3 + 2) % shirts.length],
    hair: hair[(seed * 5 + 1) % hair.length],
    hairStyle: `hair-${seed % 4}`,
    faceStyle: `face-${seed % 3}`,
    scale: 0.78 + ((seed * 17) % 28) / 100
  };
}

function createFriendElement(seed, className = "mini-friend") {
  const friend = document.createElement("div");
  const palette = friendPalette(seed);
  friend.className = className;
  friend.style.setProperty("--skin", palette.skin);
  friend.style.setProperty("--shirt", palette.shirt);
  friend.style.setProperty("--hair", palette.hair);
  friend.style.setProperty("--scale", palette.scale.toFixed(2));
  friend.classList.add(palette.hairStyle, palette.faceStyle);
  friend.innerHTML = '<span class="friend-body"></span><span class="friend-head"></span><span class="friend-hair"></span><span class="friend-eye left"></span><span class="friend-eye right"></span><span class="friend-mouth"></span><span class="friend-leg left"></span><span class="friend-leg right"></span>';
  return friend;
}

function renderFriendCount(value = friendCount) {
  if ($("homeFriendCount")) $("homeFriendCount").textContent = Math.round(value).toLocaleString();
}

function renderHomeCrowd() {
  const crowd = $("homeCrowd");
  if (!crowd) return;
  crowd.innerHTML = "";
  const visible = Math.min(friendCount, 72);
  for (let i = 0; i < visible; i += 1) {
    const friend = createFriendElement(i + 11);
    const row = Math.floor(i / 18);
    const column = i % 18;
    const offset = row % 2 ? 2 : 0;
    friend.style.left = `${5 + column * 5.2 + offset}%`;
    friend.style.bottom = `${row * 24}px`;
    friend.style.zIndex = String(10 - row);
    crowd.appendChild(friend);
  }
}

function showPracticeScreen() {
  $("homeScreen")?.classList.add("hidden");
  $("practiceScreen")?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAnalyzingOverlay(gain) {
  const overlay = $("analyzingOverlay");
  const holder = $("fallingFriends");
  if (!overlay || !holder) return Promise.resolve();
  $("analysisFriendGain").textContent = `Friends +${gain}`;
  holder.innerHTML = "";
  const visibleGain = Math.min(gain, 14);
  for (let i = 0; i < visibleGain; i += 1) {
    const friend = createFriendElement(friendCount + i + 101, "falling-friend");
    friend.style.left = `${12 + ((i * 17) % 76)}%`;
    friend.style.animationDelay = `${0.16 * i}s`;
    friend.style.animationDuration = `${2.1 + (i % 4) * 0.18}s`;
    holder.appendChild(friend);
  }
  overlay.classList.remove("hidden");
  return new Promise((resolve) => setTimeout(resolve, 2100 + visibleGain * 120));
}

function hideAnalyzingOverlay() {
  $("analyzingOverlay")?.classList.add("hidden");
  if ($("fallingFriends")) $("fallingFriends").innerHTML = "";
}

function animateFriendIncrease(gain) {
  if (gain <= 0) return Promise.resolve();
  const start = friendCount;
  const end = friendCount + gain;
  const startedAt = performance.now();
  const duration = 850;
  return new Promise((resolve) => {
    function step(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      renderFriendCount(start + (end - start) * eased);
      if (progress < 1) {
        requestAnimationFrame(step);
        return;
      }
      friendCount = end;
      saveFriendCount();
      renderFriendCount();
      renderHomeCrowd();
      $("homeFriendCount")?.classList.add("count-pop");
      setTimeout(() => $("homeFriendCount")?.classList.remove("count-pop"), 450);
      resolve();
    }
    requestAnimationFrame(step);
  });
}

function scoreClass(score) {
  if (score < 70) return "score-low";
  if (score < 88) return "score-mid";
  return "score-high";
}

function clearResult({ keepRecording = false } = {}) {
  ["accuracy", "fluency", "completeness", "prosody", "consonantAvg", "consonantMin", "rmsValue", "muffledProxy"].forEach((id) => {
    $(id).textContent = "--";
  });
  $("recognized").textContent = "まだありません";
  $("scoreInterpretation").textContent = "まだありません";
  $("badges").innerHTML = "";
  $("blindSpotJudgment").textContent = "まだ診断されていません。";
  $("conclusion").textContent = "まだありません。";
  $("nextDecision").textContent = "まだありません。";
  $("mirrorPhonetic").textContent = "まだありません";
  $("mirrorSeverity").textContent = "深刻度: --";
  $("mirrorSeverity").className = "badge";
  $("mirrorConfidence").textContent = "確信度: --";
  $("mirrorConfidence").className = "badge";
  $("mirrorMeaning").textContent = "まだありません。";
  $("mirrorListener").textContent = "まだありません。";
  $("mirrorVoiceText").textContent = "まだありません。";
  $("mirrorSpeechFeatures").textContent = "まだありません。";
  $("mirrorTimeline").textContent = "まだありません。";
  $("mirrorPronunciationEvents").textContent = "まだありません。";
  $("mirrorReflectionSummary").textContent = "まだありません。";
  $("mirrorVoicePlan").textContent = "まだありません。";
  $("mirrorEvidence").textContent = "まだありません。";
  $("mirrorWarning").textContent = "まだありません。";
  $("mirrorVoiceStatus").textContent = "ミラー音声はまだありません。";
  $("mirrorVoicePlayback").className = "audio hidden";
  $("mirrorVoicePlayback").removeAttribute("src");
  $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーはまだありません。";
  $("modelMirrorVoicePlayback").className = "audio hidden";
  $("modelMirrorVoicePlayback").removeAttribute("src");
  $("mirrorReasons").textContent = "まだありません。";
  $("mirrorTargetActions").textContent = "まだありません。";
  $("mirrorTarget").textContent = "まだありません。";
  $("wordTable").querySelector("tbody").innerHTML = "";
  $("phonemeCards").innerHTML = "";
  $("audioFeatureMemo").textContent = "まだありません。";
  $("rawJson").textContent = "まだありません";
  $("azureStatus").textContent = "未診断です。";
  $("validationStatus").textContent = "まだ保存していません。";
  $("validationNote").value = "";
  resetValidationFeedback();
  latestAssessment = null;
  latestAttempt = null;

  if (!keepRecording) {
    lastRecording = null;
    $("audioPlayback").className = "audio hidden";
    $("audioPlayback").removeAttribute("src");
    $("localStatus").textContent = "未録音です。";
  }
}

function clearModelVoice() {
  $("modelVoiceStatus").textContent = "モデル音声はまだありません。";
  $("modelVoicePlayback").className = "audio hidden";
  $("modelVoicePlayback").removeAttribute("src");
}

function loadSessionAttempts() {
  try {
    sessionAttempts = JSON.parse(localStorage.getItem("accentMirrorSessionAttempts") || "[]");
  } catch (_error) {
    sessionAttempts = [];
  }
  renderSessionAttempts();
  updateContrastSession();
}

function loadValidationLogs() {
  try {
    validationLogs = JSON.parse(localStorage.getItem("accentMirrorValidationLogs") || "[]");
  } catch (_error) {
    validationLogs = [];
  }
  renderValidationLogs();
  loadServerValidationLogs().catch((error) => {
    console.warn("Server validation logs unavailable", error);
  });
}

function saveSessionAttempts() {
  localStorage.setItem("accentMirrorSessionAttempts", JSON.stringify(sessionAttempts));
}

function saveValidationLogs() {
  localStorage.setItem("accentMirrorValidationLogs", JSON.stringify(validationLogs));
}

function mergeValidationLogs(serverLogs) {
  const merged = new Map();
  [...validationLogs, ...(serverLogs || [])].forEach((log) => {
    if (!log?.id) return;
    merged.set(log.id, { ...merged.get(log.id), ...log });
  });
  validationLogs = [...merged.values()]
    .sort((a, b) => String(b.createdAt || b.serverReceivedAt || "").localeCompare(String(a.createdAt || a.serverReceivedAt || "")))
    .slice(0, 100);
  saveValidationLogs();
  renderValidationLogs();
}

async function loadServerValidationLogs() {
  const response = await fetch("/api/validation-logs?limit=100");
  if (!response.ok) return;
  const body = await response.json();
  mergeValidationLogs(body.logs || []);
}

async function saveValidationLogToServer(log) {
  const response = await fetch("/api/validation-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || body.error || "server log save failed");
  return body;
}

function loadMirrorProfile() {
  try {
    mirrorProfile = { ...mirrorProfile, ...JSON.parse(localStorage.getItem("accentMirrorProfile") || "{}") };
  } catch (_error) {
    mirrorProfile = { gender: "female", age: "20s", scene: "daily" };
  }
  ["profileGender", "profileAge", "profileScene"].forEach((id) => {
    if ($(id)) $(id).value = mirrorProfile[id.replace("profile", "").toLowerCase()] || $(id).value;
  });
}

function saveMirrorProfile() {
  mirrorProfile = {
    gender: $("profileGender")?.value || "female",
    age: $("profileAge")?.value || "20s",
    scene: $("profileScene")?.value || "daily"
  };
  localStorage.setItem("accentMirrorProfile", JSON.stringify(mirrorProfile));
  $("profileStatus").textContent = `ミラー声: ${mirrorProfile.gender === "male" ? "男性" : "女性"} / 年代: ${mirrorProfile.age} / 場面: ${$("profileScene")?.selectedOptions?.[0]?.textContent || mirrorProfile.scene}`;
}

function mirrorVoiceForProfile() {
  return mirrorProfile.gender === "male" ? "ja-JP-KeitaNeural" : "ja-JP-NanamiNeural";
}

function browserVoiceLangForAzureVoice(voice) {
  return String(voice || "").startsWith("en-") ? "en-US" : "ja-JP";
}

function speakWithBrowserVoice({ text, lang = "ja-JP", rate = 1, pitch = 1, statusId }) {
  const value = String(text || "").trim();
  if (!value) throw new Error("読み上げるテキストがありません。");
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    throw new Error("このブラウザでは代替音声再生を利用できません。");
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = lang;
  utterance.rate = Math.max(0.55, Math.min(1.45, Number(rate) || 1));
  utterance.pitch = Math.max(0.5, Math.min(1.6, Number(pitch) || 1));
  utterance.onend = () => {
    if (statusId && $(statusId)) $(statusId).textContent = "Azure TTSが使えないため、ブラウザ内蔵音声で再生しました。";
  };
  utterance.onerror = (event) => {
    if (statusId && $(statusId)) $(statusId).textContent = `代替音声エラー: ${event.error || "unknown"}`;
  };
  window.speechSynthesis.speak(utterance);
}

function ratePercentToBrowserRate(rate) {
  const match = String(rate || "").match(/([+-]?\d+(?:\.\d+)?)%/);
  if (!match) return 1;
  return 1 + Number(match[1]) / 100;
}

function renderContrastButtons() {
  $("contrastButtons").innerHTML = "";
  contrastSets.forEach((set, index) => {
    const button = document.createElement("button");
    button.className = `contrast-button${index === selectedIndex ? " active" : ""}`;
    button.innerHTML = `<strong>${set.label}</strong><br>${set.text}<br><span class="minor">${set.focus}</span>`;
    button.onclick = () => {
      selectedIndex = index;
      renderContrastButtons();
      renderReference();
      clearModelVoice();
      clearResult();
    };
    $("contrastButtons").appendChild(button);
  });
}

async function playModelVoice() {
  const set = currentSet();
  const button = $("modelVoiceButton");
  button.disabled = true;
  $("modelVoiceStatus").textContent = "Model Englishを生成中です。";

  try {
    const response = await fetch("/api/model-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contrastSetId: set.id,
        referenceText: set.text
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || body.error || "Model voice failed");
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    $("modelVoicePlayback").src = url;
    $("modelVoicePlayback").className = "audio";
    await $("modelVoicePlayback").play().catch(() => {});
    $("modelVoiceStatus").textContent = "Model Englishを再生できます。";
  } catch (error) {
    try {
      speakWithBrowserVoice({
        text: set.text,
        lang: "en-US",
        rate: 0.96,
        pitch: 1,
        statusId: "modelVoiceStatus"
      });
      $("modelVoiceStatus").textContent = `Azure TTSエラーのため、ブラウザ内蔵音声で再生中です: ${error.message}`;
    } catch (fallbackError) {
      $("modelVoiceStatus").textContent = `Model Englishエラー: ${error.message} / 代替再生も失敗: ${fallbackError.message}`;
    }
  } finally {
    button.disabled = false;
  }
}

function renderReference() {
  $("referenceText").textContent = currentSet()?.text || "";
}

async function loadContrastSets() {
  const response = await fetch("/api/contrast-sets");
  if (!response.ok) throw new Error("Contrast set を読み込めませんでした。");
  const body = await response.json();
  contrastSets = body.contrastSets || [];
  renderContrastButtons();
  renderReference();
}

async function startPcmRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("このブラウザではマイク録音を利用できません。Chrome または Edge で http://localhost:3003/ を開いてください。");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  const startedAt = performance.now();
  let stopped = false;

  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  processor.connect(audioCtx.destination);

  return {
    startedAt,
    async stop() {
      if (stopped) return null;
      stopped = true;
      try {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());

        const samples = mergeFloat32(chunks);
        if (samples.length < audioCtx.sampleRate * 0.25) {
          await audioCtx.close();
          throw new Error("録音が短すぎます。開始後、英文を読み終えてから停止してください。");
        }
        const wavBlob = encodeWav(samples, audioCtx.sampleRate);
        const features = analyzePcm(samples, audioCtx.sampleRate);
        const durationMs = Math.round((samples.length / audioCtx.sampleRate) * 1000);
        await audioCtx.close();
        return { wavBlob, features, durationMs };
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        if (audioCtx.state !== "closed") await audioCtx.close().catch(() => {});
        throw error;
      }
    }
  };
}

function mergeFloat32(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function analyzePcm(samples, sampleRate = 44100) {
  let sumSq = 0;
  let zeroCrossings = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sumSq += samples[i] * samples[i];
    if (i > 0 && ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0))) zeroCrossings += 1;
  }
  const rms = Math.sqrt(sumSq / Math.max(samples.length, 1));
  const zcr = zeroCrossings / Math.max(samples.length, 1);
  const frameSize = Math.max(256, Math.round(sampleRate * 0.025));
  const hopSize = Math.max(128, Math.round(sampleRate * 0.01));
  const frameRms = [];
  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    let frameSum = 0;
    for (let i = start; i < start + frameSize; i += 1) frameSum += samples[i] * samples[i];
    frameRms.push({ ms: Math.round((start / sampleRate) * 1000), rms: Math.sqrt(frameSum / frameSize) });
  }
  const maxFrameRms = frameRms.reduce((max, frame) => Math.max(max, frame.rms), 0);
  const threshold = Math.max(0.012, maxFrameRms * 0.22);
  const voiced = frameRms.map((frame) => ({ ...frame, voiced: frame.rms >= threshold }));
  const segments = [];
  let current = null;
  voiced.forEach((frame) => {
    if (frame.voiced && !current) current = { startMs: frame.ms, endMs: frame.ms };
    if (frame.voiced && current) current.endMs = frame.ms + Math.round((frameSize / sampleRate) * 1000);
    if (!frame.voiced && current) {
      if (current.endMs - current.startMs >= 70) segments.push(current);
      current = null;
    }
  });
  if (current && current.endMs - current.startMs >= 70) segments.push(current);
  const gaps = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const gapMs = Math.max(0, segments[i + 1].startMs - segments[i].endMs);
    if (gapMs >= 70) gaps.push(gapMs);
  }
  const voicedMs = segments.reduce((sum, segment) => sum + Math.max(0, segment.endMs - segment.startMs), 0);

  return {
    rmsScore: Math.round(Math.min(100, rms * 450)),
    muffledProxy: Math.round(Math.max(0, Math.min(100, 100 - zcr * 9000))),
    voicedSegmentCount: segments.length,
    localVoicedMs: Math.round(voicedMs),
    localPauseCount: gaps.length,
    localMaxPauseMs: gaps.length ? Math.max(...gaps) : 0,
    localAvgPauseMs: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0
  };
}

function encodeWav(samples, sampleRate) {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function describeRecordingError(error) {
  const name = String(error?.name || "");
  const message = String(error?.message || error || "");

  if (name === "NotAllowedError" || name === "SecurityError" || /permission denied/i.test(message)) {
    return [
      "録音エラー：マイク権限が拒否されています。",
      "ブラウザのアドレスバー左側のサイト設定から、localhost:3003 のマイクを「許可」にしてください。",
      "許可後にページを再読み込みして、もう一度録音してください。"
    ].join(" ");
  }
  if (name === "NotFoundError" || /requested device not found/i.test(message)) {
    return "録音エラー：マイクが見つかりません。Windows の入力デバイス設定を確認してください。";
  }
  if (name === "NotReadableError") {
    return "録音エラー：別のアプリがマイクを使用中の可能性があります。通話アプリや録音アプリを閉じてから試してください。";
  }
  return `録音エラー：${message}`;
}

async function localRecord() {
  const button = $("recordLocalButton");
  if (activeRecorder) {
    const recorder = activeRecorder;
    activeRecorder = null;
    button.disabled = true;
    button.classList.remove("recording");
    button.textContent = "録音を処理中...";
    $("localStatus").textContent = "録音を停止しました。音声を処理しています。";
    try {
      const recording = await recorder.stop();
      if (!recording) return;
      lastRecording = recording;
      const url = URL.createObjectURL(recording.wavBlob);
      $("audioPlayback").src = url;
      $("audioPlayback").className = "audio";
      $("rmsValue").textContent = recording.features.rmsScore ?? "--";
      $("muffledProxy").textContent = recording.features.muffledProxy ?? "--";
      $("audioFeatureMemo").textContent = `録音できました。録音時間: ${recording.durationMs}ms / 波形上の発話区間: ${recording.features.voicedSegmentCount ?? "--"} / 発声合計: ${recording.features.localVoicedMs ?? 0}ms / 無音ギャップ: ${recording.features.localPauseCount ?? "--"} / 最大ギャップ: ${recording.features.localMaxPauseMs ?? 0}ms`;
      $("localStatus").textContent = "録音完了。再生して確認できます。次にAzure診断を押してください。";
      clearResult({ keepRecording: true });
      $("rmsValue").textContent = recording.features.rmsScore ?? "--";
      $("muffledProxy").textContent = recording.features.muffledProxy ?? "--";
      $("audioFeatureMemo").textContent = `録音できました。録音時間: ${recording.durationMs}ms / 波形上の発話区間: ${recording.features.voicedSegmentCount ?? "--"} / 発声合計: ${recording.features.localVoicedMs ?? 0}ms / 無音ギャップ: ${recording.features.localPauseCount ?? "--"} / 最大ギャップ: ${recording.features.localMaxPauseMs ?? 0}ms`;
    } catch (error) {
      console.error(error);
      $("localStatus").textContent = describeRecordingError(error);
    } finally {
      button.disabled = false;
      button.textContent = "① 録音を開始する";
    }
    return;
  }

  button.disabled = true;
  $("localStatus").textContent = "マイクを準備しています。";
  try {
    activeRecorder = await startPcmRecording();
    button.textContent = "■ 録音を停止する";
    button.classList.add("recording");
    $("localStatus").textContent = "録音中です。英文を読み終えたら、もう一度このボタンを押して停止してください。";
  } catch (error) {
    console.error(error);
    $("localStatus").textContent = describeRecordingError(error);
    activeRecorder = null;
    button.textContent = "① 録音を開始する";
  } finally {
    button.disabled = false;
  }
}

async function postAssessment() {
  if (!lastRecording) throw new Error("先に録音してください。");

  const set = currentSet();
  const params = new URLSearchParams({
    contrastSetId: set.id,
    referenceText: set.text,
    durationMs: String(lastRecording.durationMs || 0),
    rhythmHints: JSON.stringify({
      voicedSegmentCount: lastRecording.features?.voicedSegmentCount || 0,
      localVoicedMs: lastRecording.features?.localVoicedMs || 0,
      localPauseCount: lastRecording.features?.localPauseCount || 0,
      localMaxPauseMs: lastRecording.features?.localMaxPauseMs || 0,
      localAvgPauseMs: lastRecording.features?.localAvgPauseMs || 0
    })
  });
  const response = await fetch(`/api/assess?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "audio/wav" },
    body: lastRecording.wavBlob
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail || body.error || "Assessment failed");
  return body;
}

function makeAttempt(result) {
  return {
    id: `attempt-${Date.now()}`,
    label: `${sessionAttempts.length + 1}. ${result.contrastSet?.label || result.referenceText}`,
    createdAt: new Date().toISOString(),
    referenceText: result.referenceText,
    contrastSet: result.contrastSet,
    recognizedText: result.recognizedText,
    freeRecognizedText: result.freeRecognizedText,
    utteranceCheck: result.utteranceCheck,
    scores: result.scores,
    wordDiagnostics: result.wordDiagnostics,
    consonantAvg: result.consonantAvg,
    consonantMin: result.consonantMin,
    criticalConcerns: result.criticalConcerns,
    blindSpotJudgment: result.blindSpotJudgment,
    conclusion: result.conclusion,
    nextDecision: result.nextDecision,
    mirrorPreview: result.mirrorPreview,
    mirror: result.mirror,
    flags: result.flags,
    recordingDurationMs: result.recordingDurationMs,
    recordingFeatures: lastRecording?.features || null
  };
}

function addAttempt(result) {
  const attempt = makeAttempt(result);
  sessionAttempts.unshift(attempt);
  sessionAttempts = sessionAttempts.slice(0, 12);
  saveSessionAttempts();
  renderSessionAttempts();
  updateContrastSession();
  latestAttempt = attempt;
  return attempt;
}

function renderSessionAttempts() {
  const tbody = $("attemptTable").querySelector("tbody");
  tbody.innerHTML = "";

  sessionAttempts.forEach((attempt, index) => {
    const row = document.createElement("tr");
    const accuracy = Math.round(Number(attempt.scores?.accuracy) || 0);
    const prosody = attempt.scores?.prosody ? Math.round(Number(attempt.scores.prosody)) : "--";
    const consonantMin = attempt.consonantMin === null || attempt.consonantMin === undefined ? "--" : Math.round(attempt.consonantMin);
    const confidence = attempt.mirror?.confidence?.label ? `確信度:${attempt.mirror.confidence.label}` : "";
    const mirrorText = attempt.mirror?.listenerExperience || attempt.mirror?.phoneticText || attempt.mirrorPreview || "";
    row.innerHTML = `<td>${sessionAttempts.length - index}</td><td><strong>${attempt.contrastSet?.label || attempt.referenceText}</strong><br><span class="minor">${attempt.recognizedText || ""}</span></td><td class="${scoreClass(accuracy)}">${accuracy}</td><td>${prosody}</td><td>${consonantMin}</td><td>${attempt.flags?.couldBlindSpot ? "あり" : "なし"}</td><td><strong>${confidence}</strong><br>${mirrorText}</td>`;
    tbody.appendChild(row);
  });
}

function verdictLabel(verdict) {
  return { match: "合っている", miss: "違う", unsure: "保留" }[verdict] || "未設定";
}

function resetValidationFeedback(defaultVerdict = "unsure") {
  validationItemFeedback = {};
  VALIDATION_ITEMS.forEach((item) => {
    validationItemFeedback[item.key] = { verdict: defaultVerdict, note: "" };
  });
  pendingValidationVerdict = defaultVerdict;
  renderValidationItemFeedback();
}

function setValidationItemVerdict(key, verdict) {
  validationItemFeedback[key] = {
    ...(validationItemFeedback[key] || {}),
    verdict
  };
  renderValidationItemFeedback();
  $("validationStatus").textContent = `${VALIDATION_ITEMS.find((item) => item.key === key)?.label || "項目"}: ${verdictLabel(verdict)}。下の保存ボタンで記録できます。`;
}

function updateValidationItemNote(key, note) {
  validationItemFeedback[key] = {
    ...(validationItemFeedback[key] || { verdict: "unsure" }),
    note
  };
}

function renderValidationItemFeedback() {
  const root = $("validationItemFeedback");
  if (!root) return;
  document.querySelectorAll(".inline-validation-item").forEach((node) => node.remove());
  root.innerHTML = '<div class="panel">各項目のフィードバックは、6. 聞こえ方ミラーの該当欄のすぐ下に表示されます。入力後、この下の保存ボタンでまとめて保存します。</div>';

  const lastInsertedByTarget = {};
  VALIDATION_ITEMS.forEach((item) => {
    const value = validationItemFeedback[item.key] || { verdict: "unsure", note: "" };
    const buttons = ["match", "miss", "unsure"].map((verdict) => {
      const active = value.verdict === verdict ? " active-lite" : "";
      return `<button type="button" class="secondary-button validation-choice${active}" data-validation-key="${item.key}" data-validation-verdict="${verdict}">${verdictLabel(verdict)}</button>`;
    }).join("");

    const feedbackNode = document.createElement("div");
    feedbackNode.className = "validation-item inline-validation-item";
    feedbackNode.innerHTML = `
      <div class="validation-item-head">
        <strong>${item.label}</strong>
        <span class="minor">${item.hint}</span>
      </div>
      <div class="validation-buttons">${buttons}</div>
      <textarea class="note-box validation-item-note" data-validation-note="${item.key}" placeholder="${item.label}のメモ">${value.note || ""}</textarea>
    `;

    const target = $(item.targetId);
    const anchor = lastInsertedByTarget[item.targetId] || target?.closest(".panel") || target || root;
    anchor.parentNode.insertBefore(feedbackNode, anchor.nextSibling);
    lastInsertedByTarget[item.targetId] = feedbackNode;
  });

  document.querySelectorAll("[data-validation-key]").forEach((button) => {
    button.onclick = () => setValidationItemVerdict(button.dataset.validationKey, button.dataset.validationVerdict);
  });
  document.querySelectorAll("[data-validation-note]").forEach((textarea) => {
    textarea.oninput = () => updateValidationItemNote(textarea.dataset.validationNote, textarea.value);
  });
}

function collectValidationItems() {
  return VALIDATION_ITEMS.reduce((items, item) => {
    const feedback = validationItemFeedback[item.key] || { verdict: "unsure", note: "" };
    items[item.key] = {
      label: item.label,
      verdict: feedback.verdict || "unsure",
      note: (feedback.note || "").trim()
    };
    return items;
  }, {});
}

function aggregateValidationVerdict(items = collectValidationItems()) {
  const verdicts = Object.values(items).map((item) => item.verdict);
  if (verdicts.includes("miss")) return "miss";
  if (verdicts.includes("unsure")) return "unsure";
  return "match";
}

function validationItemSummary(items) {
  const list = Object.values(items || {});
  if (!list.length) return "";
  return list
    .filter((item) => item.verdict !== "unsure" || item.note)
    .map((item) => `${item.label}: ${verdictLabel(item.verdict)}${item.note ? `（${item.note}）` : ""}`)
    .join(" / ");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildValidationInsights() {
  const stats = VALIDATION_ITEMS.map((item) => ({
    key: item.key,
    label: item.label,
    targetId: item.targetId,
    match: 0,
    miss: 0,
    unsure: 0,
    notes: [],
    examples: [],
    latestAt: ""
  }));
  const byKey = Object.fromEntries(stats.map((item) => [item.key, item]));

  validationLogs.forEach((log) => {
    Object.entries(log.itemFeedback || {}).forEach(([key, feedback]) => {
      const stat = byKey[key];
      if (!stat) return;
      const verdict = feedback.verdict || "unsure";
      stat[verdict] = (stat[verdict] || 0) + 1;
      if (feedback.note) stat.notes.push(feedback.note);
      if (log.note) stat.notes.push(log.note);
      if (stat.examples.length < 3) {
        stat.examples.push({
          verdict,
          text: log.referenceText || log.recognizedText || "",
          mirror: log.mirror?.phoneticText || log.mirror?.spokenMirrorText || "",
          note: feedback.note || log.note || "",
          createdAt: log.createdAt
        });
      }
      if (String(log.createdAt || "") > stat.latestAt) stat.latestAt = log.createdAt || "";
    });
  });

  return stats
    .map((stat) => {
      const total = stat.match + stat.miss + stat.unsure;
      const missRate = total ? stat.miss / total : 0;
      const unsureRate = total ? stat.unsure / total : 0;
      return {
        ...stat,
        total,
        missRate,
        unsureRate,
        priority: stat.miss * 3 + stat.unsure,
        recommendation: validationRecommendation(stat, missRate, unsureRate)
      };
    })
    .filter((stat) => stat.total > 0)
    .sort((a, b) => b.priority - a.priority || b.total - a.total);
}

function validationRecommendation(stat, missRate, unsureRate) {
  if (stat.miss === 0 && stat.unsure === 0) return "現状は大きな修正不要です。ログが増えるまで維持します。";
  const base = {
    meaning: "聞こえた英文と日本語訳の対応を優先して確認します。別英文に聞こえた場合は、選択文ではなく聞こえた意味へ寄せる候補です。",
    phoneticMirror: "カタカナ聞こえ方の変換候補を増やします。英単語ではなく音として近い表記を優先する候補です。",
    listenerExperience: "聞き手の受け取り説明が過剰・不足していないか調整候補です。",
    analysisSignals: "速度、区切り、子音、曖昧さ、音程のどの信号が誤判定かを分離して調整候補にします。",
    reflectionSummary: "検出した癖とミラー表現が別種類の癖に置き換わっていないか確認します。",
    mirrorVoiceOutput: "日本語ミラー音声の崩し方、速度、間、滑舌の反映を調整する候補です。"
  }[stat.key] || "この項目の反映ルールを見直す候補です。";
  if (missRate >= 0.4) return `優先度高: ${base}`;
  if (unsureRate >= 0.4) return `保留が多い: 判定しやすい表示や根拠を増やす候補です。${base}`;
  return `軽微調整: ${base}`;
}

function renderValidationInsights() {
  const summary = $("validationInsightSummary");
  const cards = $("validationInsightCards");
  if (!summary || !cards) return;
  const insights = buildValidationInsights();
  const total = validationLogs.length;
  const missCount = validationLogs.filter((log) => log.verdict === "miss").length;
  const unsureCount = validationLogs.filter((log) => log.verdict === "unsure").length;

  if (!total) {
    summary.textContent = "まだログがありません。項目別に保存すると、ここに反映候補が出ます。";
    cards.innerHTML = "";
    return;
  }

  summary.textContent = `${total}件のログを読み込みました。違う: ${missCount}件 / 保留: ${unsureCount}件。上位の項目からルール候補として育てます。`;
  cards.innerHTML = insights.map((stat) => {
    const examples = stat.examples.map((example) => `
      <li>
        <strong>${escapeHtml(verdictLabel(example.verdict))}</strong>
        ${escapeHtml(example.text)}
        <span class="minor">${escapeHtml(example.mirror)}</span>
        ${example.note ? `<div class="minor">${escapeHtml(example.note)}</div>` : ""}
      </li>
    `).join("");
    return `
      <div class="insight-card ${stat.miss ? "needs-work" : ""}">
        <div class="insight-title">${escapeHtml(stat.label)}</div>
        <div class="insight-metrics">
          <span>合っている ${stat.match}</span>
          <span>違う ${stat.miss}</span>
          <span>保留 ${stat.unsure}</span>
        </div>
        <div class="minor">${escapeHtml(stat.recommendation)}</div>
        <ul>${examples}</ul>
      </div>
    `;
  }).join("");
}

function makeValidationLog() {
  const attempt = latestAttempt || (latestAssessment ? makeAttempt(latestAssessment) : null);
  if (!attempt) throw new Error("先に診断してください。");
  const mirror = attempt.mirror || {};
  const itemFeedback = collectValidationItems();
  const verdict = aggregateValidationVerdict(itemFeedback);
  return {
    id: `validation-${Date.now()}`,
    createdAt: new Date().toISOString(),
    verdict,
    itemFeedback,
    note: $("validationNote").value.trim(),
    attemptId: attempt.id,
    referenceText: attempt.referenceText,
    contrastSet: attempt.contrastSet,
    recognizedText: attempt.recognizedText,
    freeRecognizedText: attempt.freeRecognizedText,
    utteranceCheck: attempt.utteranceCheck,
    scores: attempt.scores,
    consonantAvg: attempt.consonantAvg,
    consonantMin: attempt.consonantMin,
    mirror: {
      phoneticText: mirror.phoneticText,
      meaningJapanese: mirror.meaningJapanese,
      listenerExperience: mirror.listenerExperience,
      confidence: mirror.confidence,
      voiceText: mirror.voiceText,
      spokenMirrorText: spokenMirrorText(mirror),
      voicePlan: mirror.voicePlan,
      voiceScript: mirror.voiceScript,
      mirrorLocalEvents: mirror.mirrorLocalEvents,
      speechFeatures: mirror.speechFeatures ? {
        wpm: mirror.speechFeatures.wpm,
        articulationWpm: mirror.speechFeatures.articulationWpm,
        speedLevel: mirror.speechFeatures.speedLevel,
        voiceSpeedLevel: mirror.speechFeatures.voiceSpeedLevel,
        boundaryPauseLevel: mirror.speechFeatures.boundaryPauseLevel,
        consonantWeaknessLevel: mirror.speechFeatures.consonantWeaknessLevel,
        articulationMirrorLevel: mirror.speechFeatures.articulationMirrorLevel,
        voiceMirrorLevel: mirror.speechFeatures.voiceMirrorLevel,
        intonationStatus: mirror.speechFeatures.intonationStatus,
        intonationLabel: mirror.speechFeatures.intonationLabel,
        intonationFeatures: mirror.speechFeatures.intonationFeatures,
        pitchContour: mirror.speechFeatures.pitchContour,
        rhythmHints: mirror.speechFeatures.rhythmHints
      } : null,
      deviationModel: mirror.deviationModel,
      mirrorTimeline: mirror.mirrorTimeline,
      pronunciationEvents: mirror.speechFeatures?.pronunciationEvents || [],
      targetActions: mirror.targetActions || [],
      targetContrast: mirror.targetContrast
    },
    flags: attempt.flags,
    recordingDurationMs: attempt.recordingDurationMs,
    recordingFeatures: attempt.recordingFeatures,
    profile: mirrorProfile
  };
}

async function saveCurrentValidationLog() {
  try {
    const log = makeValidationLog();
    validationLogs.unshift(log);
    validationLogs = validationLogs.slice(0, 50);
    saveValidationLogs();
    renderValidationLogs();
    $("validationStatus").textContent = "ブラウザに保存しました。サーバーへ保存中です。";
    const serverResult = await saveValidationLogToServer(log);
    $("validationStatus").textContent = `保存しました: ${verdictLabel(log.verdict)} / サーバー: ${serverResult.file}`;
    $("validationNote").value = "";
    resetValidationFeedback("unsure");
  } catch (error) {
    $("validationStatus").textContent = `保存に注意: ${error.message}`;
  }
}

function renderValidationLogs() {
  const tbody = $("validationTable").querySelector("tbody");
  tbody.innerHTML = "";

  validationLogs.forEach((log, index) => {
    const row = document.createElement("tr");
    const actions = (log.mirror?.targetActions || []).slice(0, 2).join(" ");
    const itemSummary = validationItemSummary(log.itemFeedback);
    const note = [itemSummary, log.note].filter(Boolean).map(escapeHtml).join("<br>");
    row.innerHTML = `<td>${validationLogs.length - index}</td><td><strong>${escapeHtml(verdictLabel(log.verdict))}</strong><br><span class="minor">${new Date(log.createdAt).toLocaleString()}</span></td><td>${escapeHtml(log.mirror?.phoneticText || "")}<br><span class="minor">${escapeHtml(log.recognizedText || "")}</span></td><td>${escapeHtml(actions)}</td><td>${note}</td>`;
    tbody.appendChild(row);
  });
  renderValidationInsights();
}

function exportValidationLogs() {
  const payload = JSON.stringify({
    exportedAt: new Date().toISOString(),
    app: "Accent Mirror",
    version: "0.12.0-timeline-voice-script",
    logs: validationLogs
  }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `accent-mirror-validation-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  $("validationStatus").textContent = "検証ログJSONを出力しました。";
}

function clearValidationLogs() {
  validationLogs = [];
  saveValidationLogs();
  renderValidationLogs();
  $("validationStatus").textContent = "検証ログをクリアしました。";
}

async function updateContrastSession() {
  if (!sessionAttempts.length) {
    $("sessionJudgment").textContent = "まだattemptがありません。";
    $("sessionRecommendation").textContent = "録音して診断すると、attempt間の差分がここに出ます。";
    return;
  }

  try {
    const response = await fetch("/api/contrast-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attempts: sessionAttempts })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.detail || body.error || "Contrast session failed");

    const best = body.bestAttempt ? ` Best: ${body.bestAttempt.label}` : "";
    const risky = body.riskiestAttempt ? ` / Watch: ${body.riskiestAttempt.label}` : "";
    $("sessionJudgment").textContent = `${body.sessionJudgment}.${best}${risky}`;
    $("sessionRecommendation").textContent = body.recommendation;
  } catch (error) {
    $("sessionJudgment").textContent = `Session比較エラー: ${error.message}`;
  }
}

function renderWordTable(result) {
  const tbody = $("wordTable").querySelector("tbody");
  tbody.innerHTML = "";
  result.wordDiagnostics.forEach((word) => {
    const score = Math.round(word.score);
    const row = document.createElement("tr");
    row.innerHTML = `<td><strong>${word.original}</strong></td><td class="${scoreClass(score)}">${score}</td><td>${word.errorType}</td><td>${word.isCritical ? "Yes" : "No"}</td><td>${word.judgment}</td>`;
    tbody.appendChild(row);
  });
}

function renderPhones(result) {
  $("phonemeCards").innerHTML = "";
  result.wordDiagnostics.forEach((word) => {
    const card = document.createElement("div");
    card.className = "phoneme-card";
    const rows = word.phones.length
      ? word.phones.map((phone) => {
          const score = Math.round(phone.score);
          return `<div class="phone-row"><div><strong>${phone.phone}</strong></div><div class="bar"><div style="width:${Math.max(0, Math.min(100, score))}%"></div></div><div class="${scoreClass(score)}">${score}</div></div>`;
        }).join("")
      : `<div class="minor">音素データが返っていません。</div>`;
    card.innerHTML = `<div class="phoneme-title">${word.original} ${word.isCritical ? '<span class="badge warn">重要語</span>' : ""}</div><div class="minor">単語の正確さ: ${Math.round(word.score)} / エラー種別: ${word.errorType}</div>${rows}`;
    $("phonemeCards").appendChild(card);
  });
}

function renderAssessment(result) {
  latestAssessment = result;
  $("accuracy").textContent = result.scores.accuracy;
  $("fluency").textContent = result.scores.fluency;
  $("completeness").textContent = result.scores.completeness;
  $("prosody").textContent = result.scores.prosody || "--";
  $("recognized").textContent = result.freeRecognizedText
    ? `${result.recognizedText || "認識結果なし"} / 自由認識: ${result.freeRecognizedText}`
    : result.recognizedText || "認識結果なし";
  $("scoreInterpretation").textContent = result.scoreInterpretation || result.utteranceCheck?.warning || "選択英文に対する発音評価です。";
  $("consonantAvg").textContent = result.consonantAvg === null ? "--" : Math.round(result.consonantAvg);
  $("consonantMin").textContent = result.consonantMin === null ? "--" : Math.round(result.consonantMin);
  $("badges").innerHTML = `<span class="badge ${result.criticalConcerns.length ? "alert" : "ok"}">重要語: ${result.criticalConcerns.length ? "懸念あり" : "OK"}</span><span class="badge ${result.flags.muffled ? "alert" : "ok"}">こもり: ${result.flags.muffled ? "懸念あり" : "OK"}</span><span class="badge ${result.flags.couldBlindSpot ? "warn" : "ok"}">Could見落とし候補: ${result.flags.couldBlindSpot ? "あり" : "なし"}</span>`;
  $("blindSpotJudgment").textContent = result.blindSpotJudgment;
  $("conclusion").textContent = result.conclusion;
  $("nextDecision").textContent = result.nextDecision;
  renderMirror(result.mirror);
  renderWordTable(result);
  renderPhones(result);
  $("rawJson").textContent = JSON.stringify(result.raw, null, 2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function effectLabel(effect) {
  const type = effect?.type || "";
  return {
    semantic_collapse: "意味の輪郭を少し崩す",
    phoneme_sound_deformation: "音素由来の音変形",
    pause: "間の再現",
    segmented_delivery: "単語・かたまりの区切り",
    length_drag: "母音・語尾の長さ",
    soften_consonants: "子音の弱さ・滑舌の曖昧さ",
    linking_compression: "単語連結",
    intonation: "音程・文尾/文中の上げ下げ",
    trace_accent: "微細な非ネイティブ感"
  }[type] || type || "反映";
}

function eventTargetText(event) {
  if (Array.isArray(event?.words) && event.words.length) return event.words.join(" + ");
  return event?.word || event?.label || "文全体";
}

function mirrorMethodForEffect(effect, segments) {
  const type = effect?.type || "";
  const segmentText = segments.length
    ? segments.map((segment) => `${segment.text}（速度:${segment.rate || "--"} / 音程:${segment.pitch || "--"} / 明瞭さ:${segment.articulation || "--"}${segment.breakAfterMs ? ` / 後ろに${segment.breakAfterMs}ms` : ""}）`).join(" / ")
    : "音声セグメントなし";
  if (type === "phoneme_sound_deformation") {
    const sig = effect.soundSignature;
    const weak = (sig?.weakPhones || []).map((item) => `${item.original}:${item.phone} score ${item.score}`).join(", ");
    const long = (sig?.longPhones || []).map((item) => `${item.original}:${item.phone} ${item.durationMs}ms`).join(", ");
    return `音素スコア/長さを、日本語側の母音残し・子音弱化へ変換。弱い音: ${weak || "なし"} / 長い音: ${long || "なし"}。出力: ${segmentText}`;
  }
  if (type === "soften_consonants") {
    return `子音の閉じ・舌先・唇の弱さを、日本語側では輪郭の弱い発音に変換。例: 「ます/か」が「まふ/ふうか」寄りになる場合があります。出力: ${segmentText}`;
  }
  if (type === "semantic_collapse") {
    return `発音の弱さで意味が取りにくくなる可能性を、日本語文の明瞭さを少し落とす方向で表現。出力: ${segmentText}`;
  }
  if (type === "length_drag") {
    return `英語側の母音や語尾が長い候補を、日本語側の母音の残り・伸びとして表現。出力: ${segmentText}`;
  }
  if (type === "linking_compression") {
    return `単語同士がつながって聞こえる候補を、日本語側でも一部を滑らかにつなげる方向で表現。出力: ${segmentText}`;
  }
  if (type === "segmented_delivery" || type === "pause") {
    return `英語側の区切りや無音ギャップを、日本語セグメント間の間として表現。出力: ${segmentText}`;
  }
  if (type === "intonation") {
    return `検出した音程傾向を、日本語側の文末/文中ピッチへ反映。現在の状態: ${effect.status || "--"}。出力: ${segmentText}`;
  }
  if (type === "trace_accent") {
    return `大きな誤りではないが、モデルとの差を軽いクセとして残す候補。出力: ${segmentText}`;
  }
  return `出力: ${segmentText}`;
}

function renderReflectionSummary(mirror) {
  const transfer = mirror?.voiceScript?.transferPlan;
  const segments = mirror?.voiceScript?.segments || [];
  const effects = transfer?.effects || [];
  const events = transfer?.events || [];
  const localEvents = mirror?.mirrorLocalEvents?.events || transfer?.localEvents?.events || [];
  if (!effects.length && !events.length && !localEvents.length) return "大きな反映ルールはまだありません。";

  const localSummary = localEvents.length
    ? `<div class="reflection-card"><div class="reflection-title">局所ミラー反映</div>
      <ul>${localEvents.map((event) => `<li><strong>${escapeHtml(event.word || event.issueType)}</strong> / ${escapeHtml(event.issueType || "")} / ${escapeHtml(event.severity || "")}<br>
      ${escapeHtml(event.englishEvidence || "")}<br>
      <span class="minor">反映先: ${escapeHtml((event.targetRoles || []).join(", ") || "未指定")} / 方法: ${escapeHtml(event.mirrorAction || "")}</span></li>`).join("")}</ul>
    </div>`
    : "";

  const eventByType = events.reduce((map, event) => {
    const key = event.type === "final-consonant" || event.type === "liquid" || event.type === "alignment" ? "soften_consonants"
      : event.type === "length" ? "length_drag"
      : event.type === "linking" ? "linking_compression"
      : event.type === "intonation" ? "intonation"
      : event.type === "phonics_trace" ? "trace_accent"
      : event.type;
    map[key] = map[key] || [];
    map[key].push(event);
    return map;
  }, {});

  const rows = effects.map((effect, index) => {
    const relatedEvents = effect.type === "phoneme_sound_deformation"
      ? events.filter((event) => ["final-consonant", "liquid", "alignment", "length", "phonics_trace"].includes(event.type))
      : eventByType[effect.type] || [];
    const detected = relatedEvents.length
      ? relatedEvents.map((event) => `<li><strong>${escapeHtml(eventTargetText(event))}</strong>: ${escapeHtml(event.label || "")}<br>${escapeHtml(event.detail || "")}</li>`).join("")
      : `<li>${escapeHtml(effect.status ? `状態: ${effect.status}` : effect.strength ? `強さ: ${effect.strength}` : "イベントなし")}</li>`;
    return `<div class="reflection-card">
      <div class="reflection-title">${index + 1}. ${escapeHtml(effectLabel(effect))}</div>
      <div><b>検出した癖</b><ul>${detected}</ul></div>
      <div><b>ミラーへの反映</b><br>${escapeHtml(mirrorMethodForEffect(effect, segments))}</div>
    </div>`;
  });

  const unusedEvents = events.filter((event) => !Object.values(eventByType).flat().includes(event));
  const extras = unusedEvents.length
    ? `<div class="reflection-card"><div class="reflection-title">その他の検出候補</div><ul>${unusedEvents.map((event) => `<li>${escapeHtml(event.label || event.type)}<br>${escapeHtml(event.detail || "")}</li>`).join("")}</ul></div>`
    : "";
  return `${localSummary}${rows.join("")}${extras}`;
}

function spokenMirrorText(mirror) {
  const segments = mirror?.voiceScript?.segments || [];
  if (!segments.length) return mirror?.voiceText || mirror?.meaningJapanese || "";
  return segments.map((segment) => segment.text || "").join("");
}

function renderVoiceTextSummary(mirror) {
  const baseText = mirror?.voiceText || mirror?.meaningJapanese || "まだありません。";
  const spokenText = spokenMirrorText(mirror);
  if (!spokenText || spokenText === baseText) return escapeHtml(baseText);
  return `<div><b>実際に読み上げる音</b><br>${escapeHtml(spokenText)}</div>
    <div class="minor">基本の和訳: ${escapeHtml(baseText)}</div>`;
}

function timelineHasDetectedIssue(item) {
  return Boolean(item?.reason) || !["ok", "none"].includes(String(item?.severity || "ok"));
}

function phoneHasDetectedIssue(phone) {
  const score = Number(phone?.score ?? 100);
  const durationMs = Number(phone?.durationMs || 0);
  return score < 90 || durationMs >= 240;
}

function renderMirror(mirror) {
  if (!mirror) {
    $("mirrorPhonetic").textContent = "まだありません";
    $("mirrorSeverity").textContent = "深刻度: --";
    $("mirrorSeverity").className = "badge";
    $("mirrorConfidence").textContent = "確信度: --";
    $("mirrorConfidence").className = "badge";
    $("mirrorMeaning").textContent = "まだありません。";
    $("mirrorListener").textContent = "まだありません。";
    $("mirrorVoiceText").textContent = "まだありません。";
    $("mirrorSpeechFeatures").textContent = "まだありません。";
    $("mirrorTimeline").textContent = "まだありません。";
    $("mirrorDeviationModel").textContent = "まだありません。";
    $("mirrorPronunciationEvents").textContent = "まだありません。";
    $("mirrorReflectionSummary").textContent = "まだありません。";
    $("mirrorVoicePlan").textContent = "まだありません。";
    $("mirrorEvidence").textContent = "まだありません。";
    $("mirrorWarning").textContent = "まだありません。";
    $("mirrorVoiceStatus").textContent = "ミラー音声はまだありません。";
    $("mirrorVoicePlayback").className = "audio hidden";
    $("mirrorVoicePlayback").removeAttribute("src");
    $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーはまだありません。";
    $("modelMirrorVoicePlayback").className = "audio hidden";
    $("modelMirrorVoicePlayback").removeAttribute("src");
    $("mirrorReasons").textContent = "まだありません。";
    $("mirrorTargetActions").textContent = "まだありません。";
    $("mirrorTarget").textContent = "まだありません。";
    return;
  }

  $("mirrorPhonetic").textContent = mirror.phoneticText || mirror.heardAsJapanese || "まだありません";
  $("mirrorSeverity").textContent = `深刻度: ${mirror.severity || "--"}`;
  $("mirrorSeverity").className = `badge ${mirror.severity === "high" || mirror.severity === "medium" ? "alert" : mirror.severity === "low" ? "warn" : "ok"}`;
  $("mirrorConfidence").textContent = `確信度: ${mirror.confidence?.label || mirror.confidence?.level || "--"}`;
  $("mirrorConfidence").className = `badge ${mirror.confidence?.level === "high" ? "alert" : mirror.confidence?.level === "medium" ? "warn" : "ok"}`;
  $("mirrorMeaning").textContent = mirror.meaningSource === "freeRecognition"
    ? `${mirror.meaningJapanese || "まだありません。"}（自由認識: ${mirror.meaningSourceText || mirror.freeRecognizedText || ""}）`
    : mirror.meaningSource === "referenceFallback"
      ? `${mirror.meaningJapanese || "まだありません。"}（参照文ベースの仮説 / 自由認識: ${mirror.freeRecognizedText || ""}）`
    : mirror.meaningJapanese || "まだありません。";
  $("mirrorListener").textContent = mirror.listenerExperience || "まだありません。";
  $("mirrorVoiceText").innerHTML = renderVoiceTextSummary(mirror);
  const features = mirror.speechFeatures;
  const pitch = features?.intonationFeatures;
  const pitchText = pitch?.available
    ? `${features.intonationStatus || "--"} / ${features.intonationLabel || "--"} / ${pitch.earlyHz || "--"}Hz→${pitch.finalHz || "--"}Hz`
    : `pitch: ${pitch?.reason || "unavailable"}`;
  $("mirrorSpeechFeatures").textContent = features
    ? `全体WPM: ${features.wpm ?? "--"} / 発音中WPM: ${features.articulationWpm ?? "--"} / 全体速度: ${features.speedLabel || "--"} / ミラー速度: ${features.voiceSpeedLabel || features.speedLabel || "--"} / 区切り: ${features.boundaryPauseLabel || "--"} / 波形区切り: ${features.rhythmHints?.localPauseCount ?? 0}箇所・最大${features.rhythmHints?.localMaxPauseMs ?? 0}ms / 子音弱さ: ${features.consonantWeaknessLabel || "--"} / 曖昧さ: ${features.ambiguityLevel || "--"} / 音声反映: ${features.voiceMirrorLevel || "--"} / 長短: ${features.lengthSignal || "--"} / 音調: ${pitchText}`
    : "まだありません。";
  const timeline = mirror.mirrorTimeline;
  const freeRecognitionNote = mirror.meaningSource === "freeRecognition" && latestAssessment?.utteranceCheck?.status !== "match"
    ? `<div class="notice"><strong>自由認識を優先中</strong>: 選択文と違う英文として聞こえたため、ミラー音声は自由認識された意味を優先します。下の参照文ベース詳細は診断参考で、ミラー音声の直接材料ではありません。</div>`
    : "";
  const detectedKanaItems = (timeline?.japaneseMirrorTimeline || []).filter(timelineHasDetectedIssue);
  const detectedPhonemeItems = (timeline?.phonemeTimeline || [])
    .map((item) => ({ ...item, phones: (item.phones || []).filter(phoneHasDetectedIssue) }))
    .filter((item) => item.phones.length || Number(item.score || 100) < 90 || String(item.errorType || "None") !== "None");
  $("mirrorTimeline").innerHTML = timeline
    ? `${freeRecognitionNote}<div><strong>音の高低</strong>: ${timeline.pitchOverlay?.status || "--"} / ${timeline.pitchOverlay?.riseSemitones ?? "--"}st</div>
       <div><strong>カタカナタイムライン</strong>: ${detectedKanaItems.length ? "検出箇所のみ表示" : "反映対象なし"}</div>
       ${detectedKanaItems.length ? `<ul>${detectedKanaItems.map((item) => `<li>${escapeHtml(item.sourceWord)}: <strong>${escapeHtml(item.kana)}</strong> / ${item.durationMs ?? "--"}ms / pause ${item.pauseAfterMs || 0}ms<br>${escapeHtml(item.reason || "")}</li>`).join("")}</ul>` : ""}
       <div><strong>音素タイムライン</strong>: ${detectedPhonemeItems.length ? "弱い/長い音のみ表示" : "反映対象なし"}</div>
       ${detectedPhonemeItems.length ? `<ul>${detectedPhonemeItems.map((item) => `<li>${escapeHtml(item.word)}: ${(item.phones || []).map((phone) => `${escapeHtml(phone.phone)}:${phone.score}/${phone.durationMs ?? "--"}ms`).join(", ") || escapeHtml(item.errorType || "no phoneme")}</li>`).join("")}</ul>` : ""}`
    : "まだありません。";
  const deviationModel = mirror.deviationModel;
  const detectedDeviations = (deviationModel?.deviations || []).filter((item) => item.evidence && !["none", "unknown"].includes(String(item.severity || "")));
  $("mirrorDeviationModel").innerHTML = detectedDeviations.length
    ? `<div>${escapeHtml(deviationModel.summary)}</div><ul>${detectedDeviations.map((item) => `<li><strong>${escapeHtml(item.type)}</strong> / ${escapeHtml(item.status)} / ${escapeHtml(item.severity)}<br>${escapeHtml(item.evidence || "")}</li>`).join("")}</ul>`
    : deviationModel?.summary || "大きな聞こえ方のズレ候補はまだありません。";
  const detectedPronunciationEvents = (features?.pronunciationEvents || []).filter((event) => event.detail && event.label);
  $("mirrorPronunciationEvents").innerHTML = detectedPronunciationEvents.length
    ? `<ul>${detectedPronunciationEvents.map((event) => `<li><strong>${escapeHtml(event.label)}</strong><br>${escapeHtml(event.detail)}</li>`).join("")}</ul>`
    : "検出された発音イベントはありません。";
  $("mirrorReflectionSummary").innerHTML = renderReflectionSummary(mirror);
  const plan = mirror.voicePlan;
  const transfer = mirror.voiceScript?.transferPlan;
  const localEventCount = mirror.mirrorLocalEvents?.events?.length || transfer?.localEvents?.events?.length || 0;
  const transferText = transfer
    ? ` / 転写 ${transfer.effects?.map((effect) => effect.status ? `${effect.type}:${effect.status}` : `${effect.type}:${effect.strength || "--"}`).join(", ") || "なし"} / 局所イベント ${localEventCount}${transfer.segmentedTargets?.length ? ` / 区切り反映: ${transfer.segmentedTargets.join(", ")}` : ""}`
    : "";
  $("mirrorVoicePlan").textContent = plan
    ? `速度 ${plan.rate || "--"} / 音量 ${plan.volume || "--"} / 明瞭さ ${plan.articulation || "--"} / 区切り ${plan.pausePattern || "--"} / 音声スクリプト ${mirror.voiceScript?.version || "なし"} / 発話速度 ${mirror.voiceScript?.speedLevel || "--"} / 連結 ${mirror.voiceScript?.linking ? "あり" : "なし"}${transferText} / セグメント ${(mirror.voiceScript?.segments || []).map((segment) => `${segment.text}:${segment.rate || "--"}:${segment.pitch || "--"}:${segment.volume || "--"}:${segment.breakAfterMs || 0}ms`).join(" | ")} / 信号 ${(plan.appliedSignals || []).join(", ")}`
    : "まだありません。";
  $("mirrorEvidence").innerHTML = (mirror.confidence?.evidence || []).length
    ? `<ul>${mirror.confidence.evidence.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "まだありません。";
  $("mirrorWarning").textContent = mirror.confidence?.warning || "特別な注意はありません。";
  $("mirrorVoiceStatus").textContent = mirror.confidence?.level === "high"
    ? "ミラー音声を生成できます。"
    : "ミラー音声を仮説として生成できます。確信度が低い場合は、聞こえ方の候補として確認してください。";
  $("mirrorVoicePlayback").className = "audio hidden";
  $("mirrorVoicePlayback").removeAttribute("src");
  $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーを生成できます。発音の癖を入れない比較用です。";
  $("modelMirrorVoicePlayback").className = "audio hidden";
  $("modelMirrorVoicePlayback").removeAttribute("src");
  $("mirrorReasons").innerHTML = (mirror.reasons || []).length
    ? `<ul>${mirror.reasons.map((reason) => `<li>${reason}</li>`).join("")}</ul>`
    : "大きな理由はまだ検出されていません。";
  $("mirrorTargetActions").innerHTML = (mirror.targetActions || []).length
    ? `<ol>${mirror.targetActions.map((action) => `<li>${action}</li>`).join("")}</ol>`
    : "まだありません。";
  $("mirrorTarget").textContent = mirror.targetContrast || "まだありません。";
}

async function playMirrorVoice() {
  if (!latestAssessment?.mirror) {
    $("mirrorVoiceStatus").textContent = "先に診断してください。";
    return;
  }

  const mirror = latestAssessment.mirror;
  const button = $("mirrorVoiceButton");
  button.disabled = true;
  $("mirrorVoiceStatus").textContent = "ミラー音声を生成中です。";

  try {
    const response = await fetch("/api/mirror-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "voice",
        voiceText: mirror.voiceText,
        meaningJapanese: mirror.meaningJapanese,
        confidence: mirror.confidence?.level,
        voice: mirrorVoiceForProfile(),
        rate: mirror.voicePlan?.rate,
        pitch: mirror.voicePlan?.pitch,
        pausePattern: mirror.voicePlan?.pausePattern,
        profile: mirrorProfile,
        voiceScript: mirror.voiceScript
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || body.error || "Mirror voice failed");
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    $("mirrorVoicePlayback").src = url;
    $("mirrorVoicePlayback").className = "audio";
    await $("mirrorVoicePlayback").play().catch(() => {});
    $("mirrorVoiceStatus").textContent = "ミラー音声を再生できます。";
  } catch (error) {
    try {
      speakWithBrowserVoice({
        text: spokenMirrorText(mirror),
        lang: "ja-JP",
        rate: ratePercentToBrowserRate(mirror.voicePlan?.rate),
        pitch: 1,
        statusId: "mirrorVoiceStatus"
      });
      $("mirrorVoiceStatus").textContent = `Azure TTSエラーのため、ブラウザ内蔵音声で再生中です: ${error.message}`;
    } catch (fallbackError) {
      $("mirrorVoiceStatus").textContent = `ミラー音声エラー: ${error.message} / 代替再生も失敗: ${fallbackError.message}`;
    }
  } finally {
    button.disabled = false;
  }
}

async function playModelMirrorVoice() {
  if (!latestAssessment?.mirror) {
    $("modelMirrorVoiceStatus").textContent = "先に診断してください。";
    return;
  }

  const mirror = latestAssessment.mirror;
  const text = mirror.meaningJapanese || mirror.voiceText;
  if (!text) {
    $("modelMirrorVoiceStatus").textContent = "再生できる日本語がまだありません。";
    return;
  }

  const button = $("modelMirrorVoiceButton");
  button.disabled = true;
  $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーを生成中です。";

  try {
    const response = await fetch("/api/mirror-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "model-japanese-mirror",
        voiceText: text,
        meaningJapanese: text,
        confidence: "high",
        voice: mirrorVoiceForProfile(),
        rate: "+0%",
        pitch: "+0Hz",
        pausePattern: "plain",
        profile: mirrorProfile,
        voiceScript: null
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || body.error || "Model mirror voice failed");
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    $("modelMirrorVoicePlayback").src = url;
    $("modelMirrorVoicePlayback").className = "audio";
    await $("modelMirrorVoicePlayback").play().catch(() => {});
    $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーを再生できます。";
  } catch (error) {
    try {
      speakWithBrowserVoice({
        text,
        lang: "ja-JP",
        rate: 1,
        pitch: 1,
        statusId: "modelMirrorVoiceStatus"
      });
      $("modelMirrorVoiceStatus").textContent = `Azure TTSエラーのため、ブラウザ内蔵音声で再生中です: ${error.message}`;
    } catch (fallbackError) {
      $("modelMirrorVoiceStatus").textContent = `模範日本語ミラーエラー: ${error.message} / 代替再生も失敗: ${fallbackError.message}`;
    }
  } finally {
    button.disabled = false;
  }
}

async function azureDiagnose() {
  const button = $("azureButton");
  const gain = wordCountForText(currentSet()?.text);
  button.disabled = true;
  $("azureStatus").textContent = "サーバー経由でAzure診断中です。";

  try {
    const animationReady = showAnalyzingOverlay(gain);
    const result = await postAssessment();
    await animationReady;
    await animateFriendIncrease(gain);
    await new Promise((resolve) => setTimeout(resolve, 300));
    hideAnalyzingOverlay();
    renderAssessment(result);
    latestAttempt = addAttempt(result);
    resetValidationFeedback("unsure");
    $("azureStatus").textContent = "Azure診断完了。結果を確認してください。";
  } catch (error) {
    console.error(error);
    hideAnalyzingOverlay();
    $("azureStatus").textContent = `Azure診断エラー：${error.message}`;
  } finally {
    button.disabled = false;
  }
}

$("startPracticeButton").onclick = showPracticeScreen;
$("recordLocalButton").onclick = localRecord;
$("modelVoiceButton").onclick = playModelVoice;
$("azureButton").onclick = azureDiagnose;
$("mirrorVoiceButton").onclick = playMirrorVoice;
$("modelMirrorVoiceButton").onclick = playModelMirrorVoice;
$("saveValidationButton").onclick = saveCurrentValidationLog;
$("exportValidationButton").onclick = exportValidationLogs;
$("clearValidationButton").onclick = clearValidationLogs;
$("clearSessionButton").onclick = () => {
  sessionAttempts = [];
  saveSessionAttempts();
  renderSessionAttempts();
  updateContrastSession();
};
["profileGender", "profileAge", "profileScene"].forEach((id) => {
  if ($(id)) $(id).onchange = saveMirrorProfile;
});
loadContrastSets().catch((error) => {
  console.error(error);
  $("contrastButtons").textContent = error.message;
});
loadFriendCount();
renderFriendCount();
renderHomeCrowd();
loadMirrorProfile();
saveMirrorProfile();
loadSessionAttempts();
loadValidationLogs();
resetValidationFeedback("unsure");
