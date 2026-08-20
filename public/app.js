let contrastSets = [];
let storyStages = [];
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
// ホーム画面で「ストーリーモード」「練習セット」の入り口を分けたので、練習画面側の
// 一覧もどちらから入ったかで絞り込む(実機フィードバック: "練習セットと、
// ストーリーモードへの入り口をホーム画面の時点で分離させて")。練習画面内の
// タブでいつでも切り替えられる。
let practiceViewMode = "story";
let mirrorProfile = {
  gender: "female",
  age: "20s",
  scene: "daily"
};
const $ = (id) => document.getElementById(id);
const FRIEND_COUNT_KEY = "accentMirrorFriendCount";

// 英単語・フレーズと、日本語ミラー文の対応部分を同じ色で結びつけるための配色。
// 対応ペアの数がこれを超える場合は先頭から繰り返し使う。
const CORRESPONDENCE_PALETTE = ["#c0272d", "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#15803d", "#0369a1"];

// 検証項目一覧。単語・音ごとの細かい項目は分析まとめ(mirrorAnalysisSummary)に
// 1つの文章としてまとめているため、個別のフィードバック項目は持たない。
const VALIDATION_ITEMS = [
  { key: "voiceReadAloud", label: "音声読み上げ文", targetId: "mirrorVoiceText", hint: "実際に読み上げられる音（癖の反映を含む文）が、聞こえ方として自然か。" },
  { key: "mirrorVoiceOutput", label: "ミラー音声", targetId: "mirrorVoiceStatus", hint: "再生された日本語音声が、英語発音の癖を同じ種類の癖として反映しているか。" },
  { key: "mirrorAnalysisSummary", label: "分析まとめ", targetId: "mirrorAnalysisSummary", hint: "単語・音ごとの弱さの説明と、日本語ミラーへの反映のまとめが実感と合っているか。" }
];

function allValidationItems() {
  return VALIDATION_ITEMS;
}

function currentSet() {
  return contrastSets[selectedIndex] || contrastSets[0];
}

// ストーリーモードのステージは友達数のしきい値で解放される。しきい値以下でも
// 一覧には表示し、鍵アイコン付きで「あと何人で解放」が分かるようにする。
function currentStageInfo() {
  if (!storyStages.length) return null;
  const unlocked = storyStages.filter((stage) => friendCount >= stage.threshold);
  return unlocked.length ? unlocked[unlocked.length - 1] : storyStages[0];
}

function isStageUnlocked(stageNumber) {
  const info = storyStages.find((stage) => stage.stage === stageNumber);
  return info ? friendCount >= info.threshold : true;
}

function renderHomeStage() {
  const stage = currentStageInfo();
  if (!stage) return;
  if ($("homeStageLabel")) {
    $("homeStageLabel").querySelector(".stage-number").textContent = `Stage ${stage.stage}`;
    $("homeStageName").textContent = stage.name;
  }
  $("japanPin")?.classList.toggle("pin-inactive", stage.location !== "japan");
  $("canadaPin")?.classList.toggle("pin-inactive", stage.location !== "canada");
}

// ホーム画面に「すごろく」風のステージボードを描画する。各マスがステージに対応し、
// 現在地にコマ(絵文字)を乗せ、未解放マスは鍵アイコン付きでグレーアウトする。
function renderSugorokuBoard() {
  const board = $("sugorokuBoard");
  if (!board || !storyStages.length) return;
  const current = currentStageInfo();
  const track = document.createElement("div");
  track.className = "sugoroku-track";

  storyStages.forEach((stage) => {
    const unlocked = friendCount >= stage.threshold;
    const isCurrent = current && stage.stage === current.stage;
    const cell = document.createElement("div");
    cell.className = `sugoroku-cell${unlocked ? " unlocked" : " locked"}${isCurrent ? " current" : ""}`;
    cell.innerHTML = `${isCurrent ? '<span class="sugoroku-token">🚩</span>' : ""}<span class="cell-number">${unlocked ? stage.stage : "🔒"}</span><span class="cell-name">${stage.name}</span>`;
    if (unlocked) {
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.title = `Stage ${stage.stage}: ${stage.name} を練習する`;
      cell.onclick = () => goToStagePractice(stage.stage);
      cell.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToStagePractice(stage.stage);
        }
      };
    } else {
      cell.title = `友達${stage.threshold}人で解放`;
    }
    track.appendChild(cell);
  });

  const goalCell = document.createElement("div");
  goalCell.className = "sugoroku-cell goal";
  goalCell.innerHTML = '<span class="cell-number">🏁</span><span class="cell-name">ゴール</span>';
  track.appendChild(goalCell);

  board.innerHTML = "";
  board.appendChild(track);

  const currentCell = track.querySelector(".sugoroku-cell.current");
  if (currentCell) currentCell.scrollIntoView({ inline: "center", block: "nearest" });
}

// すごろくの解放済みマスをクリックしたときに、そのステージの最初の練習文を
// 選んだ状態で練習画面へ移動し、練習セット一覧のそのステージまでスクロールする。
function goToStagePractice(stageNumber) {
  const target = contrastSets.find((set) => set.stage === stageNumber);
  if (!target) return;
  setPracticeViewMode("story");
  selectContrastSet(contrastSets.indexOf(target));
  showPracticeScreen();
  requestAnimationFrame(() => {
    const heading = [...document.querySelectorAll(".contrast-stage-heading")]
      .find((element) => element.textContent.includes(`Stage ${stageNumber}:`));
    heading?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
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

function showHomeScreen() {
  $("practiceScreen")?.classList.add("hidden");
  $("homeScreen")?.classList.remove("hidden");
  // 練習中に友達の人数(friendCount)が増えている可能性があるので、ホーム画面の
  // 表示(カウンター・すごろく・群衆)を戻る時に最新の状態に更新する。
  renderHomeStage();
  renderSugorokuBoard();
  renderFriendCount();
  renderHomeCrowd();
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
      renderHomeStage();
      renderSugorokuBoard();
      renderContrastButtons();
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
  $("mirrorVoiceText").textContent = "まだありません。";
  $("pitchContourChart").textContent = "まだありません。";
  $("mirrorAnalysisSummary").textContent = "まだありません。";
  $("mirrorVoiceStatus").textContent = "ミラー音声はまだありません。";
  $("mirrorVoicePlayback").className = "audio hidden";
  $("mirrorVoicePlayback").removeAttribute("src");
  $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーはまだありません。";
  $("modelMirrorVoicePlayback").className = "audio hidden";
  $("modelMirrorVoicePlayback").removeAttribute("src");
  $("mirrorPitchContourStatus").textContent = "まだ分析していません。";
  $("mirrorPitchContourChart").textContent = "まだありません。";
  $("mirrorPitchContourAnalysis").textContent = "まだありません。";
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

function selectContrastSet(index) {
  selectedIndex = index;
  renderContrastButtons();
  renderReference();
  clearModelVoice();
  clearResult();
}

function scrollToRecordSection() {
  $("stepRecordSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function appendContrastButton(container, set, index) {
  const unlocked = !set.stage || isStageUnlocked(set.stage);
  const button = document.createElement("button");
  button.className = `contrast-button${index === selectedIndex ? " active" : ""}${unlocked ? "" : " locked"}`;
  button.disabled = !unlocked;
  const gain = wordCountForText(set.text);
  const badge = unlocked ? `<span class="friend-gain-badge" title="この文の練習で増える友達の人数">+${gain}</span>` : "";
  button.innerHTML = unlocked
    ? `${badge}<strong>${set.label}</strong><br>${set.text}<br><span class="minor">${set.focus}</span>`
    : `<strong>🔒 ${set.label}</strong>`;
  if (unlocked) {
    button.onclick = () => {
      selectContrastSet(index);
      scrollToRecordSection();
    };
  }
  container.appendChild(button);
}

function renderPracticeModeTabs() {
  $("practiceModeTabs")?.querySelectorAll(".practice-mode-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === practiceViewMode);
  });
}

function setPracticeViewMode(mode) {
  practiceViewMode = mode === "drill" ? "drill" : "story";
  renderPracticeModeTabs();
  renderContrastButtons();
}

function renderContrastButtons() {
  const container = $("contrastButtons");
  container.innerHTML = "";
  renderPracticeModeTabs();

  if (practiceViewMode === "story") {
    const storySets = contrastSets.filter((set) => set.stage);
    const stageNumbers = [...new Set(storySets.map((set) => set.stage))].sort((a, b) => a - b);
    stageNumbers.forEach((stageNumber) => {
      const info = storyStages.find((stage) => stage.stage === stageNumber);
      const unlocked = isStageUnlocked(stageNumber);
      const stageHeading = document.createElement("div");
      stageHeading.className = `contrast-stage-heading${unlocked ? "" : " locked"}`;
      stageHeading.textContent = info
        ? `${unlocked ? "" : "🔒 "}Stage ${stageNumber}: ${info.name}${unlocked ? "" : `（友達${info.threshold}人で解放）`}`
        : `Stage ${stageNumber}`;
      container.appendChild(stageHeading);

      storySets
        .filter((set) => set.stage === stageNumber)
        .forEach((set) => appendContrastButton(container, set, contrastSets.indexOf(set)));
    });
  } else {
    const drillSets = contrastSets.filter((set) => !set.stage);
    drillSets.forEach((set) => appendContrastButton(container, set, contrastSets.indexOf(set)));
  }
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
        referenceText: set.text,
        gender: mirrorProfile.gender,
        age: mirrorProfile.age,
        scene: mirrorProfile.scene
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
  storyStages = body.storyStages || [];
  renderContrastButtons();
  renderReference();
  renderHomeStage();
  renderSugorokuBoard();
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
    gender: mirrorProfile.gender || "",
    age: mirrorProfile.age || "",
    scene: mirrorProfile.scene || "",
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
  allValidationItems().forEach((item) => {
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
  $("validationStatus").textContent = `${allValidationItems().find((item) => item.key === key)?.label || "項目"}: ${verdictLabel(verdict)}。下の保存ボタンで記録できます。`;
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
  allValidationItems().forEach((item) => {
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
  return allValidationItems().reduce((items, item) => {
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
  const stats = allValidationItems().map((item) => ({
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


// mirrorTimeline.phonemeTimeline を軸に、英単語ごとのグループを作る。
// mirrorLocalEvents.events は word フィールドで単語に紐づいている(word:null は
// 単語連結・カタカナ・文末音程のような「文全体・フレーズ」レベルの反映)ため、
// それを使って「単語/フレーズ → 分析 → ミラーへの反映」の形にまとめ直す。
// Could+you のように連結して発音された単語は、mirrorTimeline.japaneseMirrorTimeline
// 側で spanWordIndices（例: [0,1]）としてまとめて記録されている。これを使って、
// 単語カードもフレーズ単位（1つのフィードバック欄）にまとめる。
function findSpanForWordIndex(kanaItems, wordIndex) {
  return kanaItems.find((entry) => (entry.spanWordIndices || [entry.wordIndex]).includes(wordIndex)) || null;
}

function buildWordGroups(mirror) {
  const phonemeItems = mirror?.mirrorTimeline?.phonemeTimeline || [];
  const kanaItems = mirror?.mirrorTimeline?.japaneseMirrorTimeline || [];
  const localEvents = mirror?.mirrorLocalEvents?.events || mirror?.voiceScript?.transferPlan?.localEvents?.events || [];
  const segments = mirror?.voiceScript?.segments || [];

  const wordGroups = [];
  const consumedIndices = new Set();
  const claimedPhraseEvents = new Set();

  phonemeItems.forEach((item) => {
    if (consumedIndices.has(item.wordIndex)) return;
    const span = findSpanForWordIndex(kanaItems, item.wordIndex);
    const spanIndices = span?.spanWordIndices?.length ? span.spanWordIndices : [item.wordIndex];
    const members = spanIndices
      .map((wordIndex) => phonemeItems.find((entry) => entry.wordIndex === wordIndex))
      .filter(Boolean);
    members.forEach((member) => consumedIndices.add(member.wordIndex));

    const memberWordKeys = members.map((member) => String(member.word || "").toLowerCase());
    const events = localEvents.filter((event) => memberWordKeys.includes(String(event.word || "").toLowerCase()) && event.word);

    if (memberWordKeys.length > 1) {
      const spanPrefix = memberWordKeys.join("-");
      localEvents.forEach((event) => {
        if (event.word) return;
        if (String(event.key || "").toLowerCase().startsWith(`${spanPrefix}:`)) {
          events.push(event);
          claimedPhraseEvents.add(event);
        }
      });
    }

    // events だけだと、発音の癖が検出されなかった単語(例: "you" が問題なく発音された
    // 場合)は対応する日本語セグメントが一切見つからず、意訳(和訳が単語ごとに1対1で
    // ないため、"I"/"will"/"you" のような単語がどこにも反映されていないように見える)
    // で誤解を招いていた(実機フィードバック: "I will youが和訳されていないことが
    // わかります")。mirrorTimeline.phonemeTimeline[].roles (バックエンドの静的な
    // 英単語→役割の対応表、癖の有無に関係なく常に付与される)もあわせて使うことで、
    // 癖が無い単語でも意訳先の日本語部分との対応を示せるようにする。
    // "predicate" は i/she/will/could/you などにも保険として付与されているが
    // (意訳で主語や助動詞が動詞句へ畳み込まれるケース向け)、その語に本来の
    // 専用セグメント(subject/time/objectなど)が既にある文では、そちらを優先し
    // predicateには重ねない("私はここに住んでいます" の "i" が "私は" だけでなく
    // "住んでいます"(本来はliveの領域)にも誤って対応付くのを防ぐため)。
    const matchSegments = (roleSet) => segments.filter((segment) => {
      const role = String(segment.role || "");
      return [...roleSet].some((target) => role === target || role.startsWith(`${target}-pitch-`));
    });
    const specificRoles = new Set([
      ...events.flatMap((event) => event.targetRoles || []),
      ...members.flatMap((member) => member.roles || [])
    ].filter((role) => role !== "predicate"));
    let wordSegments = matchSegments(specificRoles);
    if (!wordSegments.length) {
      wordSegments = matchSegments(new Set([...specificRoles, "predicate"]));
    }

    wordGroups.push({
      key: `word-${spanIndices.join("-")}`,
      kind: "word",
      label: members.map((member) => member.word).join(" "),
      members,
      kana: span,
      events,
      segments: wordSegments
    });
  });

  // 意訳(例: "I will see you tomorrow." → "明日会いましょう。")では、複数の英単語
  // (I/will/see/you)が同じ1つの日本語セグメント(会いましょう)に対応することがある。
  // 単語ごとに別グループのままだと、それぞれ違う色が割り当てられてしまい、実際に
  // 表示される日本語側は最後に処理されたグループの色しか残らず、見た目上「他の単語の
  // 色に対応する日本語がどこにも無い」ように見えてしまう。同じセグメント集合を指す
  // 単語グループは1つにまとめ、同じ色・1つのまとまった説明文になるようにする。
  const mergedWordGroups = [];
  const groupBySegmentSignature = new Map();
  wordGroups.forEach((group) => {
    if (!group.segments.length) {
      mergedWordGroups.push(group);
      return;
    }
    const signature = group.segments.map((segment) => segment.role).sort().join("|");
    const existing = groupBySegmentSignature.get(signature);
    if (existing) {
      existing.label = `${existing.label} ${group.label}`;
      existing.members = [...existing.members, ...group.members];
      existing.events = [...existing.events, ...group.events];
      existing.key = `${existing.key}-${group.key}`;
      return;
    }
    const merged = { ...group };
    groupBySegmentSignature.set(signature, merged);
    mergedWordGroups.push(merged);
  });

  const phraseEvents = localEvents.filter((event) => !event.word && !claimedPhraseEvents.has(event));
  const usedSegmentRoles = new Set(mergedWordGroups.flatMap((group) => group.segments.map((segment) => segment.role)));
  const phraseSegments = segments.filter((segment) => !usedSegmentRoles.has(segment.role));

  const groups = [...mergedWordGroups];
  if (phraseEvents.length || phraseSegments.length) {
    groups.push({
      key: "phrase-sentence",
      kind: "phrase",
      label: "文全体・単語のつながり",
      events: phraseEvents,
      segments: phraseSegments
    });
  }
  return groups;
}

// buildWordGroups() が作る「英単語(members) → 日本語ミラー(segments)」の対応を使い、
// 対応が取れているグループごとに色を1つ割り当てる。phrase-sentence グループ（文全体の
// カタカナ・連結・文末音程など特定の英単語に紐づかない反映）は対応語が無いため対象外。
function buildCorrespondenceColorMaps(mirror) {
  const wordIndexToColorClass = new Map();
  const segmentToColorClass = new Map();
  const groups = buildWordGroups(mirror).filter((group) => group.kind === "word" && group.segments.length && (group.members || []).length);
  groups.forEach((group, index) => {
    const colorClass = `corr-${index % CORRESPONDENCE_PALETTE.length}`;
    group.members.forEach((member) => wordIndexToColorClass.set(member.wordIndex, colorClass));
    group.segments.forEach((segment) => segmentToColorClass.set(segment, colorClass));
  });
  return { wordIndexToColorClass, segmentToColorClass };
}

function referenceTrailingPunctuation(referenceText) {
  const match = String(referenceText || "").match(/([.?!]+)\s*$/);
  return match ? match[1] : "";
}

// 参照英文そのものではなく、実際にそう聞こえた(扱われた)単語を表示する。
// 例: leave を live 寄りに発音して意味が言い換わった場合、色対応も「leave」では
// なく実際に聞こえた「live」を基準にしないと、色の対応関係が実態と合わなくなる。
function buildColoredReferenceHtml(mirror, wordIndexToColorClass) {
  const items = mirror?.mirrorTimeline?.phonemeTimeline || [];
  if (!items.length) return "";
  const overrides = new Map((mirror?.wordHearingOverrides || [])
    .map((item) => [String(item.from || "").toLowerCase(), item.to])
    .filter(([, to]) => to));
  const spans = items.map((item) => {
    const colorClass = wordIndexToColorClass.get(item.wordIndex);
    const key = String(item.word || "").toLowerCase();
    const heardAs = overrides.get(key);
    const text = heardAs
      ? `<span class="corr-swap-from">${escapeHtml(item.word || "")}</span><span class="corr-swap-arrow">→</span>${escapeHtml(heardAs)}`
      : escapeHtml(item.word || "");
    return colorClass ? `<span class="corr ${colorClass}">${text}</span>` : `<span>${text}</span>`;
  });
  const trailing = escapeHtml(referenceTrailingPunctuation(currentSet()?.text || mirror?.referenceText || ""));
  return spans.join(" ") + trailing;
}

function buildColoredSpokenHtml(mirror, segmentToColorClass) {
  const segments = mirror?.voiceScript?.segments || [];
  if (!segments.length) return escapeHtml(spokenMirrorTextForDisplay(mirror));
  return segments.map((segment, index) => {
    const text = escapeHtml(segment.text || "");
    const colorClass = segmentToColorClass.get(segment);
    const spanHtml = colorClass ? `<span class="corr ${colorClass}">${text}</span>` : `<span>${text}</span>`;
    if (index === segments.length - 1) return spanHtml;
    const breakMs = Number(segment.breakAfterMs || 0);
    const spaceCount = breakMs > 0 ? Math.max(1, Math.min(9, Math.round(breakMs / 100))) : 0;
    return spanHtml + " ".repeat(spaceCount);
  }).join("");
}

// 単語・フレーズごとのカード、発話特徴、ズレのモデル、根拠、そう聞こえる理由、
// 次に直すところ、目標との対比…と項目が多岐に渡ると、チェックする側の負担が
// 大きくなり確認の質が落ちる、という実機フィードバックを受けて、それらを
// 1箇所の文章にまとめる。データはbuildWordGroups()が単語ごとにまとめている
// ローカルイベント(englishEvidence = どう聞こえたか、mirrorAction = どう反映したか)
// をそのまま文章に組み込み、同じ内容を複数箇所に重複表示しないようにする。
function buildMirrorAnalysisSummary(mirror) {
  if (!mirror) return "まだありません。";

  const groups = buildWordGroups(mirror);
  const sentences = [];
  groups.forEach((group) => {
    // 同じセグメントに畳み込まれた複数の単語(意訳や、Azureが同じ語を挿入と実語で
    // 二重に検出した場合など)が、たまたま全く同じ根拠文を持つことがある。
    // そのまま並べると同じ文が2〜3回繰り返されて読みにくくなるため、文面が
    // 完全に一致するものは1つにまとめる(実機フィードバック: seeの挿入検出が
    // 同じ文言で複数回繰り返されて表示された)。
    const events = (group.events || []).filter((event) => event.englishEvidence);
    const seenEvidence = new Set();
    const uniqueEvents = events.filter((event) => {
      if (seenEvidence.has(event.englishEvidence)) return false;
      seenEvidence.add(event.englishEvidence);
      return true;
    });
    if (!uniqueEvents.length) return;
    const mirrorText = (group.segments || []).map((segment) => segment.text).join("");
    const evidenceText = uniqueEvents.map((event) => event.englishEvidence).join("");
    const subject = group.kind === "phrase" ? "文全体では、" : `「${escapeHtml(group.label)}」は、`;
    const reflection = mirrorText ? `日本語ミラーでは「${escapeHtml(mirrorText)}」のように反映しています。` : "";
    sentences.push(`${subject}${escapeHtml(evidenceText)}${reflection}`);
  });

  if (!sentences.length) return "単語・音ごとに大きな弱さの候補はまだ見つかっていません。";
  return sentences.join(" ");
}

function spokenMirrorText(mirror) {
  const segments = mirror?.voiceScript?.segments || [];
  if (!segments.length) return mirror?.voiceText || mirror?.meaningJapanese || "";
  return segments.map((segment) => segment.text || "").join("");
}

// 表示専用: セグメント間の間(breakAfterMs)を半角スペースの個数で視覚的に表す。
// spokenMirrorText() 自体は TTSフォールバックや検証ログの保存にも使われるため、
// そちらは元の(スペースを挟まない)文字列のままにしておく。
function spokenMirrorTextForDisplay(mirror) {
  const segments = mirror?.voiceScript?.segments || [];
  if (!segments.length) return spokenMirrorText(mirror);
  return segments.map((segment, index) => {
    const text = segment.text || "";
    if (index === segments.length - 1) return text;
    const breakMs = Number(segment.breakAfterMs || 0);
    const spaceCount = breakMs > 0 ? Math.max(1, Math.min(9, Math.round(breakMs / 100))) : 0;
    return text + " ".repeat(spaceCount);
  }).join("");
}

function renderVoiceTextSummary(mirror) {
  const baseText = mirror?.voiceText || mirror?.meaningJapanese || "まだありません。";
  const spokenText = spokenMirrorTextForDisplay(mirror);
  const { wordIndexToColorClass, segmentToColorClass } = buildCorrespondenceColorMaps(mirror);
  const referenceHtml = buildColoredReferenceHtml(mirror, wordIndexToColorClass);
  const referenceBlock = referenceHtml
    ? `<div class="corr-line"><b>参照英文</b><br><span class="corr-text">${referenceHtml}</span></div>`
    : "";
  if (!spokenText || spokenText.trim() === baseText) {
    return referenceBlock ? `${referenceBlock}<div>${escapeHtml(baseText)}</div>` : escapeHtml(baseText);
  }
  const spokenHtml = buildColoredSpokenHtml(mirror, segmentToColorClass);
  return `${referenceBlock}
    <div><b>実際に読み上げる音</b><br><span class="spoken-text-preview corr-text">${spokenHtml}</span></div>
    <div class="minor">基本の和訳: ${escapeHtml(baseText)}</div>`;
}

// モデル音声とユーザー音声のピッチ輪郭(半音・単語ごとに開始/中間/終了の3点)を
// 折れ線グラフとして描画する。五線譜(離散的な音程)ではなく、連続的に動く
// 発話ピッチにより近い「線」で表現する。model-relative(モデル比較)データが
// ある場合のみ描画できる(自己相対フォールバック時は比較対象がないため不可)。
function buildPitchContourSvg(intonationFeatures, legend = { model: "モデル音声", user: "自分の声" }) {
  const words = intonationFeatures?.words || [];
  if (!intonationFeatures?.available) {
    return `<div class="minor">ピッチデータを取得できませんでした。</div>`;
  }
  if (intonationFeatures?.basis !== "model-relative" || !words.length) {
    return `<div class="minor">${escapeHtml(legend.model)}との比較データがないため、グラフを表示できません（自己相対フォールバックのため）。</div>`;
  }

  const points = [];
  words.forEach((word, index) => {
    [
      { frac: 0.15, model: word.modelSemitone?.start, user: word.userSemitone?.start },
      { frac: 0.5, model: word.modelSemitone?.mid, user: word.userSemitone?.mid },
      { frac: 0.85, model: word.modelSemitone?.end, user: word.userSemitone?.end }
    ].forEach((slot) => {
      if (!Number.isFinite(slot.model) || !Number.isFinite(slot.user)) return;
      points.push({ x: index + slot.frac, model: slot.model, user: slot.user });
    });
  });
  if (points.length < 2) {
    return `<div class="minor">有声区間が少なく、グラフを描画できませんでした。</div>`;
  }

  const allValues = points.flatMap((point) => [point.model, point.user]);
  const minVal = Math.min(...allValues, -1);
  const maxVal = Math.max(...allValues, 1);
  const pad = Math.max(1, (maxVal - minVal) * 0.15);
  const yMin = minVal - pad;
  const yMax = maxVal + pad;

  const width = 640;
  const height = 220;
  const marginLeft = 34;
  const marginRight = 14;
  const marginTop = 16;
  const marginBottom = 32;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const xMax = words.length;

  const xToPx = (x) => marginLeft + (xMax > 0 ? (x / xMax) * plotWidth : 0);
  const yToPx = (y) => marginTop + (1 - (y - yMin) / (yMax - yMin)) * plotHeight;

  const modelPath = points.map((point) => `${xToPx(point.x).toFixed(1)},${yToPx(point.model).toFixed(1)}`).join(" ");
  const userPath = points.map((point) => `${xToPx(point.x).toFixed(1)},${yToPx(point.user).toFixed(1)}`).join(" ");
  const zeroY = yToPx(0).toFixed(1);

  const wordLabels = words.map((word, index) => {
    const cx = xToPx(index + 0.5).toFixed(1);
    return `<text x="${cx}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#666">${escapeHtml(word.word || "")}</text>`;
  }).join("");

  return `<svg viewBox="0 0 ${width} ${height}" class="pitch-chart" preserveAspectRatio="xMidYMid meet">
    <line x1="${marginLeft}" y1="${zeroY}" x2="${width - marginRight}" y2="${zeroY}" stroke="#c9d0dc" stroke-width="1" stroke-dasharray="4 3" />
    <polyline points="${modelPath}" fill="none" stroke="#8a93a6" stroke-width="2.5" stroke-dasharray="6 4" />
    <polyline points="${userPath}" fill="none" stroke="#c0272d" stroke-width="2.5" />
    ${wordLabels}
  </svg>
  <div class="pitch-chart-legend"><span class="pitch-legend-model">●</span> ${escapeHtml(legend.model)}　<span class="pitch-legend-user">●</span> ${escapeHtml(legend.user)}</div>`;
}

function renderMirror(mirror) {
  if (!mirror) {
    $("mirrorVoiceText").textContent = "まだありません。";
    $("pitchContourChart").textContent = "まだありません。";
    $("mirrorAnalysisSummary").textContent = "まだありません。";
    $("mirrorVoiceStatus").textContent = "ミラー音声はまだありません。";
    $("mirrorVoicePlayback").className = "audio hidden";
    $("mirrorVoicePlayback").removeAttribute("src");
    $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーはまだありません。";
    $("modelMirrorVoicePlayback").className = "audio hidden";
    $("modelMirrorVoicePlayback").removeAttribute("src");
    $("mirrorPitchContourStatus").textContent = "まだ分析していません。";
    $("mirrorPitchContourChart").textContent = "まだありません。";
    $("mirrorPitchContourAnalysis").textContent = "まだありません。";
    return;
  }

  $("mirrorVoiceText").innerHTML = renderVoiceTextSummary(mirror);
  const features = mirror.speechFeatures;
  const pitch = features?.intonationFeatures;
  $("pitchContourChart").innerHTML = buildPitchContourSvg(pitch);
  const freeRecognitionNote = mirror.meaningSource === "freeRecognition" && latestAssessment?.utteranceCheck?.status !== "match"
    ? `<div class="notice"><strong>自由認識を優先中</strong>: 選択文と違う英文として聞こえたため、ミラー音声は自由認識された意味を優先します。下の分析は診断参考で、ミラー音声の直接材料ではありません。</div>`
    : "";
  $("mirrorAnalysisSummary").innerHTML = (freeRecognitionNote || "") + buildMirrorAnalysisSummary(mirror);
  $("mirrorVoiceStatus").textContent = mirror.confidence?.level === "high"
    ? "ミラー音声を生成できます。"
    : "ミラー音声を仮説として生成できます。確信度が低い場合は、聞こえ方の候補として確認してください。";
  $("mirrorVoicePlayback").className = "audio hidden";
  $("mirrorVoicePlayback").removeAttribute("src");
  $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーを生成できます。発音の癖を入れない比較用です。";
  $("modelMirrorVoicePlayback").className = "audio hidden";
  $("modelMirrorVoicePlayback").removeAttribute("src");
  $("mirrorPitchContourStatus").textContent = "まだ分析していません。";
  $("mirrorPitchContourChart").textContent = "まだありません。";
  $("mirrorPitchContourAnalysis").textContent = "まだありません。";
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
        styleDegree: mirror.expressiveness?.styleDegree,
        expressivenessLevel: mirror.expressiveness?.level,
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
  const set = currentSet();
  const button = $("modelMirrorVoiceButton");
  button.disabled = true;
  $("modelMirrorVoiceStatus").textContent = "模範日本語ミラーを生成中です。";

  // 録音・診断済みならその訳文をそのまま使う(latestAssessment.mirror)。まだ録音
  // していない場合は、参照英文から模範訳をその場で取得する。model englishと
  // 模範ミラーをまず一致させたい、という要望のため、録音なしでも模範ミラーだけ
  // 単独で聞けるようにする(実機フィードバック: "録音をしなくても、模範ミラー
  // 音声を聞けるようにしてほしい")。
  let text = latestAssessment?.mirror?.meaningJapanese || latestAssessment?.mirror?.voiceText;

  try {
    if (!text) {
      const textResponse = await fetch("/api/model-mirror-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrastSetId: set?.id,
          referenceText: set?.text,
          profile: mirrorProfile
        })
      });
      if (!textResponse.ok) {
        const body = await textResponse.json().catch(() => ({}));
        throw new Error(body.detail || body.error || "Model mirror text failed");
      }
      text = (await textResponse.json()).meaningJapanese;
    }
    if (!text) {
      $("modelMirrorVoiceStatus").textContent = "再生できる日本語がまだありません。";
      return;
    }

    const response = await fetch("/api/mirror-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "model-japanese-mirror",
        contrastSetId: set?.id,
        voiceText: text,
        meaningJapanese: text,
        confidence: "high",
        voice: mirrorVoiceForProfile(),
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

async function analyzeMirrorPitchContour() {
  if (!latestAssessment?.mirror) {
    $("mirrorPitchContourStatus").textContent = "先に診断してください。";
    return;
  }

  const mirror = latestAssessment.mirror;
  const voiceScript = mirror.voiceScript;
  if (!voiceScript?.segments?.length) {
    $("mirrorPitchContourStatus").textContent = "音声読み上げ文のセグメントがまだありません。";
    return;
  }

  const button = $("mirrorPitchContourButton");
  button.disabled = true;
  $("mirrorPitchContourStatus").textContent = "模範日本語ミラーとミラー音声を合成して、ピッチを分析中です（数秒かかります）。";

  try {
    const response = await fetch("/api/mirror-pitch-contour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voiceScript,
        voice: mirrorVoiceForProfile()
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || body.error || "Mirror pitch contour failed");
    }

    const result = await response.json();
    $("mirrorPitchContourChart").innerHTML = buildPitchContourSvg(result.intonationFeatures, { model: "模範日本語ミラー", user: "ミラー音声" });
    $("mirrorPitchContourAnalysis").textContent = result.analysis?.summary || "まだありません。";
    $("mirrorPitchContourStatus").textContent = result.intonationFeatures?.available
      ? "分析できました。"
      : "分析データが不足しているため、参考表示のみです。";
  } catch (error) {
    $("mirrorPitchContourStatus").textContent = `ピッチ分析エラー: ${error.message}`;
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

$("startStoryModeButton").onclick = () => {
  setPracticeViewMode("story");
  showPracticeScreen();
};
$("startDrillSetButton").onclick = () => {
  setPracticeViewMode("drill");
  showPracticeScreen();
};
$("practiceModeTabs")?.querySelectorAll(".practice-mode-tab").forEach((tab) => {
  tab.onclick = () => setPracticeViewMode(tab.dataset.mode);
});
$("backToHomeButton").onclick = showHomeScreen;
$("recordLocalButton").onclick = localRecord;
$("modelVoiceButton").onclick = playModelVoice;
$("azureButton").onclick = azureDiagnose;
$("mirrorVoiceButton").onclick = playMirrorVoice;
$("modelMirrorVoiceButton").onclick = playModelMirrorVoice;
$("mirrorPitchContourButton").onclick = analyzeMirrorPitchContour;
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
loadFriendCount();
renderFriendCount();
renderHomeCrowd();
loadContrastSets().catch((error) => {
  console.error(error);
  $("contrastButtons").textContent = error.message;
});
loadMirrorProfile();
saveMirrorProfile();
loadSessionAttempts();
loadValidationLogs();
resetValidationFeedback("unsure");
