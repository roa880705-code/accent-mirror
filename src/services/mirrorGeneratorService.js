const pitchThresholds = require("../config/pitchThresholds");
const { weakenJapaneseMoraText, elongateJapaneseMoraText, muddleJapaneseMoraText, segmentPauseJapaneseMoraText } = require("./japaneseMoraTransform");

const WORD_MIRRORS = {
  could: {
    target: "クドゥ",
    weak: "クッ",
    finalD: "クドゥ",
    longVowel: "クウド",
    distorted: "クルド",
    reason: "Could の母音が長く、さらに d が強く残ると、日本語の「クルド」に近く聞こえる候補です。d だけが残る場合は「クドゥ」寄りの候補として扱います。"
  },
  you: {
    target: "ユー",
    weak: "ユ",
    distorted: "ジュー",
    reason: "Could you の連結が強すぎると、「クッジュー」のように聞こえることがあります。"
  },
  help: {
    target: "ヘルプ",
    weak: "ヘウプ",
    distorted: "エウプ",
    reason: "help の l や p が弱いと、「ヘウプ」や「エウプ」に近く聞こえます。"
  },
  me: {
    target: "ミー",
    weak: "ミ",
    distorted: "ミー",
    reason: "me は大きな崩れがなければ「ミー」として聞こえます。"
  },
  consider: {
    target: "コンシダー",
    weak: "コンシダ",
    distorted: "コンサイダー",
    reason: "consider の第2音節が /sai/ のように強くなると、「コンサイダー」寄りに聞こえる候補です。"
  },
  she: {
    target: "シー",
    weak: "シ",
    distorted: "スィー",
    reason: "she の /ʃ/ が弱く、see/sea の /s/ に寄ると、別単語として聞こえる候補です。"
  },
  live: {
    target: "リヴ",
    weak: "リブ",
    distorted: "リーヴ",
    reason: "live の短い母音が伸びると、leave に近く聞こえる候補です。"
  },
  leave: {
    target: "リーヴ",
    weak: "リーブ",
    distorted: "リヴ",
    reason: "leave の長い母音が短くなると、live に近く聞こえる候補です。"
  }
};

const INSERTION_MIRRORS = {
  you: "ユ",
  could: "クッ",
  help: "ヘ",
  me: "ミ"
};

const FREE_RECOGNITION_KANA = {
  could: "クドゥ",
  can: "キャン",
  i: "アイ",
  have: "ハヴ",
  you: "ユー",
  your: "ユア",
  a: "ア",
  please: "プリーズ",
  help: "ヘルプ",
  teach: "ティーチ",
  pass: "パス",
  and: "アンド",
  will: "ウィル",
  see: "シー",
  sea: "シー",
  she: "シー",
  is: "イズ",
  consider: "コンシダー",
  con: "コン",
  cider: "サイダー",
  it: "イット",
  live: "リヴ",
  leave: "リーヴ",
  here: "ヒア",
  me: "ミー",
  him: "ヒム",
  her: "ハー",
  us: "アス",
  them: "ゼム",
  the: "ザ",
  phone: "フォン",
  number: "ナンバー",
  pen: "ペン",
  salt: "ソルト",
  to: "トゥ",
  work: "ワーク",
  today: "トゥデイ",
  tomorrow: "トゥモロー"
};

const MEANING_MIRRORS = {
  "could you help me?": {
    japanese: "手伝ってもらえますか？",
    listenerBase: "「手伝ってもらえますか？」と言いたいことは推測できます。"
  },
  "can i have your phone number": {
    japanese: "電話番号を教えてもらえますか？",
    listenerBase: "「電話番号を教えてもらえますか？」と言いたいことは推測できます。"
  },
  "can i have your phone number?": {
    japanese: "電話番号を教えてもらえますか？",
    listenerBase: "「電話番号を教えてもらえますか？」と言いたいことは推測できます。"
  },
  "can you teach me": {
    japanese: "教えてもらえますか？",
    listenerBase: "「教えてもらえますか？」と言いたいことは推測できます。"
  },
  "can you teach me?": {
    japanese: "教えてもらえますか？",
    listenerBase: "「教えてもらえますか？」と言いたいことは推測できます。"
  },
  "could you pass me the salt": {
    japanese: "塩を取ってもらえますか？",
    listenerBase: "「塩を取ってもらえますか？」と言いたいことは推測できます。"
  },
  "could you pass me the salt?": {
    japanese: "塩を取ってもらえますか？",
    listenerBase: "「塩を取ってもらえますか？」と言いたいことは推測できます。"
  },
  "could you": {
    japanese: "してもらえますか？",
    listenerBase: "依頼の出だしとしては推測できますが、後続の内容を待つ必要があります。"
  },
  "could": {
    japanese: "できた / してもらえた",
    listenerBase: "単語だけでは意図が取りにくく、文脈が必要です。"
  },
  "help": {
    japanese: "助ける / 手伝う",
    listenerBase: "help として聞こえれば、助けを求めていることは伝わります。"
  },
  "help me": {
    japanese: "手伝って？",
    listenerBase: "「手伝って？」と言いたいことは推測できます。"
  },
  "help me?": {
    japanese: "手伝って？",
    listenerBase: "「手伝って？」と言いたいことは推測できます。"
  },
  "please help me": {
    japanese: "手伝ってください。",
    listenerBase: "「手伝ってください。」と言いたいことは推測できます。"
  },
  "please help me.": {
    japanese: "手伝ってください。",
    listenerBase: "「手伝ってください。」と言いたいことは推測できます。"
  },
  "i love you so much": {
    japanese: "あなたのことが本当に大好きです。",
    listenerBase: "「あなたのことが本当に大好きです。」と言いたいことは推測できます。"
  },
  "i will consider it": {
    japanese: "それを検討します。",
    listenerBase: "「それを検討します。」と言いたいことは推測できます。"
  },
  "i will con cider it": {
    japanese: "私はサイダーをだまします。",
    listenerBase: "consider ではなく con cider のような別表現として聞こえる可能性があります。"
  },
  "she is here": {
    japanese: "彼女はここにいます。",
    listenerBase: "「彼女はここにいます。」と言いたいことは推測できます。"
  },
  "see is here": {
    japanese: "see がここにあります。",
    listenerBase: "she ではなく see のような別単語として聞こえる可能性があります。"
  },
  "sea is here": {
    japanese: "海がここにあります。",
    listenerBase: "she ではなく sea のような別単語として聞こえる可能性があります。"
  },
  "i live here": {
    japanese: "私はここに住んでいます。",
    listenerBase: "「私はここに住んでいます。」と言いたいことは推測できます。"
  },
  "i leave here": {
    japanese: "私はここを去ります。",
    listenerBase: "live ではなく leave のように聞こえる可能性があります。"
  },
  "i have a pen": {
    japanese: "私はペンを持っています。",
    listenerBase: "「私はペンを持っています。」と言いたいことは推測できます。"
  },
  "i have a pen.": {
    japanese: "私はペンを持っています。",
    listenerBase: "「私はペンを持っています。」と言いたいことは推測できます。"
  },
  "i will see you tomorrow": {
    japanese: "明日会いましょう。",
    listenerBase: "「明日会いましょう。」と言いたいことは推測できます。"
  },
  "i will see you tomorrow.": {
    japanese: "明日会いましょう。",
    listenerBase: "「明日会いましょう。」と言いたいことは推測できます。"
  },
  "i have to work today": {
    japanese: "今日は働かなければなりません。",
    listenerBase: "「今日は働かなければなりません。」と言いたいことは推測できます。"
  },
  "i have to work today.": {
    japanese: "今日は働かなければなりません。",
    listenerBase: "「今日は働かなければなりません。」と言いたいことは推測できます。"
  }
};

function wordSeverity(word) {
  const score = Number(word.score ?? 100);
  const consonantMin = word.consonantMin === null || word.consonantMin === undefined ? 100 : Number(word.consonantMin);

  if (score < 60 || consonantMin < 45) return "high";
  if (score < 78 || consonantMin < 68) return "medium";
  if (score < 88 || consonantMin < 80) return "low";
  return "ok";
}

function isHighAzureWord(word) {
  return Number(word.score ?? 0) >= 94 && String(word.errorType || "None").toLowerCase() === "none";
}

function phoneScoreValue(phone) {
  return Number(phone?.score ?? 100);
}

function weakestPhoneScore(word) {
  const phones = word.phones || [];
  if (!phones.length) return null;
  return Math.min(...phones.map((phone) => phoneScoreValue(phone)));
}

function markUncertain(text) {
  const value = String(text || "");
  if (value.includes("(?)")) return value;
  if (value.includes("?")) return value.replace("?", "(?)");
  return `${value}(?)`;
}

function acousticMirrorWord(word, context) {
  const phones = word.phones || [];
  const score = Number(word.score ?? 100);
  const weakScore = weakestPhoneScore(word);
  const severity = wordSeverity(word);

  if (word.word === "could") {
    const template = WORD_MIRRORS.could;
    const kPhone = findPhone(word, (phone) => phone.includes("k"));
    const dPhone = findPhone(word, (phone) => phone.includes("d"));
    const vowels = phones.filter((phone) => isVowelPhone(phone.phone));
    const longestVowel = vowels
      .map((phone) => ({ score: phoneScoreValue(phone), ms: phoneMs(phone) || 0 }))
      .sort((a, b) => b.ms - a.ms)[0];
    const kWeak = kPhone && phoneScoreValue(kPhone) < 68;
    const dScore = phoneScoreValue(dPhone);
    const dMs = phoneMs(dPhone);
    const vowelLong = longestVowel && longestVowel.ms >= 145;
    const vowelVeryLong = longestVowel && longestVowel.ms >= 175;
    const finalDNotice = dPhone && (dScore < 78 || (dMs !== null && dMs >= 95));
    const finalDHeavy = dPhone && (dScore < 62 || (dMs !== null && dMs >= 155));

    if (vowelVeryLong && finalDHeavy) {
      return {
        text: `${template.distorted}?`,
        severity: "medium",
        reason: "Could の母音がかなり長く、d も強く残るため「クルド」寄りに聞こえる候補です。"
      };
    }
    if (vowelLong && finalDNotice) {
      return {
        text: "クウドゥ?",
        severity: "medium",
        reason: "Could の母音が長めで、語尾 d も残る候補です。「クルド」断定ではなく「クウドゥ」寄りとして表示します。"
      };
    }
    if (finalDNotice) {
      return {
        text: `${template.finalD || template.target}${isHighAzureWord(word) ? "(?)" : "?"}`,
        severity: isHighAzureWord(word) ? "low" : "medium",
        reason: "Could の語尾 d が残る候補です。母音長の根拠が弱いため「クルド」ではなく「クドゥ」寄りとして表示します。",
        conservative: isHighAzureWord(word)
      };
    }
    if (vowelLong) {
      return {
        text: `${template.longVowel || "クウド"}?`,
        severity: "low",
        reason: "Could の母音が長めに聞こえる候補です。"
      };
    }
    if (kWeak || score < 78 || (weakScore !== null && weakScore < 68)) {
      return {
        text: template.weak,
        severity: severity === "ok" ? "low" : severity,
        reason: "Could の子音または単語の輪郭が弱く、短く欠けて聞こえる候補です。"
      };
    }
    return {
      text: template.target,
      severity: "ok",
      reason: ""
    };
  }

  if (word.word === "help") {
    const hPhone = findPhone(word, (phone) => phone.includes("h"));
    const lPhone = findPhone(word, (phone) => phone.includes("l"));
    const pPhone = findPhone(word, (phone) => phone.includes("p"));
    const lMs = phoneMs(lPhone);
    const pMs = phoneMs(pPhone);
    const hWeak = hPhone && phoneScoreValue(hPhone) < 72;
    const lWeak = lPhone && (phoneScoreValue(lPhone) < 72 || (lMs !== null && lMs <= 60));
    const pWeak = pPhone && phoneScoreValue(pPhone) < 72;
    const pStillAudible = pPhone && (phoneScoreValue(pPhone) >= 45 || (pMs !== null && pMs >= 90));

    if (hWeak && lWeak && pWeak) {
      return pStillAudible
        ? { text: "エプ", severity: "medium", reason: "help の h/l が弱く、p だけは短く残るため「エプ」寄りに聞こえる候補です。" }
        : { text: "エウ", severity: "high", reason: "help の h/l/p が弱く、単語の輪郭がかなり落ちる候補です。" };
    }
    if (hWeak && lWeak) {
      return { text: "エウプ", severity: "medium", reason: "help の h と l が弱く、「エウプ」寄りに聞こえる候補です。" };
    }
    if (lWeak && pWeak) {
      return pStillAudible
        ? { text: "ヘプ", severity: "medium", reason: "help の l が短く、p は閉じとして残るため「ヘプ」寄りに聞こえる候補です。" }
        : { text: "ヘウ", severity: "medium", reason: "help の l と p が弱く、「ヘウ」寄りに聞こえる候補です。" };
    }
    if (lWeak) {
      return {
        text: hWeak ? "エプ" : "ヘプ",
        severity: "low",
        reason: lMs !== null && lMs <= 60
          ? "help の l が非常に短く、聞き手には「ヘプ」寄りに届く候補です。"
          : "help の l が弱く、「ヘプ」寄りに聞こえる候補です。"
      };
    }
    if (pWeak) {
      return { text: "ヘル", severity: "low", reason: "help の p が弱く、語尾が閉じきらない候補です。" };
    }
    if (hWeak) {
      return { text: "エルプ", severity: "low", reason: "help の h が弱く、出だしが抜ける候補です。" };
    }
    return { text: WORD_MIRRORS.help.target, severity: "ok", reason: "" };
  }

  if (word.word === "you") {
    const yPhone = findPhone(word, (phone) => phone.includes("j") || phone.includes("y"));
    const yWeak = yPhone && phoneScoreValue(yPhone) < 72;
    if (context?.linkedFromCould) return { text: WORD_MIRRORS.you.distorted, severity: "medium", reason: WORD_MIRRORS.you.reason, linking: true };
    if (yWeak || score < 78) return { text: WORD_MIRRORS.you.weak, severity: "low", reason: "you の出だしが弱く、短い「ユ」寄りに聞こえる候補です。" };
    return { text: WORD_MIRRORS.you.target, severity: "ok", reason: "" };
  }

  if (word.word === "me") {
    const vowel = (word.phones || []).filter((phone) => isVowelPhone(phone.phone)).sort((a, b) => (phoneMs(b) || 0) - (phoneMs(a) || 0))[0];
    if (score < 78 || (vowel && phoneMs(vowel) !== null && phoneMs(vowel) < 85)) {
      return { text: WORD_MIRRORS.me.weak, severity: "low", reason: "me が短く、十分に伸びずに聞こえる候補です。" };
    }
    return { text: WORD_MIRRORS.me.target, severity: "ok", reason: "" };
  }

  if (word.word === "she") {
    const shPhone = findPhone(word, (phone) => phone.includes("ʃ") || phone.includes("sh"));
    const sPhone = findPhone(word, (phone) => phone === "s" || phone.includes("s"));
    const shWeak = shPhone && phoneScoreValue(shPhone) < 84;
    const sLike = sPhone && !shPhone;
    if (sLike || shWeak || score < 88 || (weakScore !== null && weakScore < 82)) {
      return {
        text: WORD_MIRRORS.she.distorted,
        severity: score < 76 || (weakScore !== null && weakScore < 72) ? "medium" : "low",
        reason: WORD_MIRRORS.she.reason,
        alternateWordCandidate: "sea/see"
      };
    }
    return { text: WORD_MIRRORS.she.target, severity: "ok", reason: "" };
  }

  if (word.word === "live") {
    const vowels = phones.filter((phone) => isVowelPhone(phone.phone));
    const longestVowelMs = Math.max(0, ...vowels.map((phone) => phoneMs(phone) || 0));
    if (longestVowelMs >= 150 || score < 86 || (weakScore !== null && weakScore < 78)) {
      return {
        text: WORD_MIRRORS.live.distorted,
        severity: longestVowelMs >= 180 || score < 76 ? "medium" : "low",
        reason: WORD_MIRRORS.live.reason,
        alternateWordCandidate: "leave"
      };
    }
    return { text: WORD_MIRRORS.live.target, severity: "ok", reason: "" };
  }

  if (word.word === "leave") {
    const vowels = phones.filter((phone) => isVowelPhone(phone.phone));
    const longestVowelMs = Math.max(0, ...vowels.map((phone) => phoneMs(phone) || 0));
    if ((longestVowelMs > 0 && longestVowelMs < 105) || score < 86 || (weakScore !== null && weakScore < 78)) {
      return {
        text: WORD_MIRRORS.leave.distorted,
        severity: score < 76 || (weakScore !== null && weakScore < 70) ? "medium" : "low",
        reason: WORD_MIRRORS.leave.reason,
        alternateWordCandidate: "live"
      };
    }
    return { text: WORD_MIRRORS.leave.target, severity: "ok", reason: "" };
  }

  if (word.word === "consider") {
    const vowels = phones.filter((phone) => isVowelPhone(phone.phone));
    const hasLongMiddleVowel = vowels.some((phone) => (phoneMs(phone) || 0) >= 170);
    if (hasLongMiddleVowel || score < 84 || (weakScore !== null && weakScore < 76)) {
      return {
        text: WORD_MIRRORS.consider.distorted,
        severity: hasLongMiddleVowel || score < 74 ? "medium" : "low",
        reason: WORD_MIRRORS.consider.reason,
        alternateWordCandidate: "con cider"
      };
    }
    return { text: WORD_MIRRORS.consider.target, severity: "ok", reason: "" };
  }

  return null;
}

function couldMirrorFromSignals(template, couldSignals, events) {
  const hasLongVowel = couldSignals.includes("could-vowel-long") || events.some((event) => event.key === "could:vowel-long");
  const hasFinalD = couldSignals.some((signal) => signal.startsWith("could-final-d"))
    || events.some((event) => String(event.key || "").startsWith("could:final-d"));
  const hasStrongFinalD = couldSignals.includes("could-final-d-heavy-strong")
    || events.some((event) => event.key === "could:final-d-heavy" && event.strength !== "weak");

  if (hasLongVowel && hasStrongFinalD) {
    return {
      text: `${template.distorted}?`,
      severity: "medium",
      reason: "Could の母音が長く、d も強く残るため「クルド」寄りに聞こえる候補です。"
    };
  }
  if (hasFinalD) {
    return {
      text: `${template.finalD || template.target}?`,
      severity: hasStrongFinalD ? "medium" : "low",
      reason: "Could の語尾 d が残る候補です。ただし母音長の根拠が弱いので、「クルド」ではなく「クドゥ」寄りとして表示します。"
    };
  }
  if (hasLongVowel) {
    return {
      text: `${template.longVowel || template.target}?`,
      severity: "low",
      reason: "Could の母音が長めに聞こえる候補です。ただし d が強く残る根拠は弱いため、「クルド」とは断定しません。"
    };
  }
  return null;
}

function mirrorWord(word, context) {
  if (String(word.errorType || "").toLowerCase() === "insertion") {
    return {
      text: INSERTION_MIRRORS[word.word] || word.original || word.word,
      severity: "medium",
      reason: `${word.original || word.word} が余分に入って聞こえる候補です。`
    };
  }

  const template = WORD_MIRRORS[word.word] || {
    target: word.original || word.word,
    weak: word.original || word.word,
    distorted: word.original || word.word,
    reason: `${word.original || word.word} に弱く聞こえる箇所があります。`
  };
  const severity = wordSeverity(word);
  const couldSignals = context.lengthSignals?.filter((signal) => signal.startsWith("could-")) || [];
  const events = context.pronunciationEvents || [];
  const acoustic = acousticMirrorWord(word, context);

  if (word.word === "could" && context.couldBlindSpot) {
    if (isHighAzureWord(word) && !couldSignals.some((signal) => signal.includes("strong"))) {
      return { ...(acoustic || { text: `${template.target}(?)`, severity: "low", reason: "" }), hypothesisOnly: true, conservative: true };
    }
    return { ...(acoustic || couldMirrorFromSignals(template, couldSignals, events) || { text: `${template.target}?`, severity: "low", reason: "Could の聞こえ方を確認する候補です。" }), hypothesisOnly: true };
  }
  if (word.word === "could" && couldSignals.length) {
    if (isHighAzureWord(word) && !couldSignals.some((signal) => signal.includes("strong"))) {
      const candidate = acoustic || couldMirrorFromSignals(template, couldSignals, events);
      return candidate
        ? { ...candidate, text: markUncertain(candidate.text), conservative: true }
        : { text: `${template.target}(?)`, severity: "low", reason: "", conservative: true };
    }
    return acoustic || couldMirrorFromSignals(template, couldSignals, events) || { text: `${template.target}?`, severity: "low", reason: "Could の聞こえ方を確認する候補です。" };
  }
  if (acoustic) return acoustic;
  if (word.word === "help" && context.lengthSignals?.some((signal) => signal.startsWith("help-"))) {
    return { text: template.weak, severity: "medium", reason: template.reason };
  }
  if (severity === "high") return { text: template.distorted, severity, reason: template.reason };
  if (severity === "medium" || severity === "low") return { text: template.weak, severity, reason: template.reason };
  return { text: template.target, severity, reason: "" };
}

function severityRank(severity) {
  return { ok: 0, low: 1, medium: 2, high: 3 }[severity] || 0;
}

function eventIsStrong(event) {
  return event?.strength === "strong" || event?.level === "high";
}

function eventCanAffectMirrorVoice(event) {
  if (!event) return false;
  if (event.voiceEligible === false) return false;
  if (event.issueType === "subtle_phonics_trace") return false;
  if (event.severity === "trace" || event.level === "trace") return false;
  if (event.issueType === "linking") return eventIsStrong(event) || severityRank(event.severity || event.level) >= 2;
  return eventIsStrong(event) || severityRank(event.severity || event.level) >= 2;
}

function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function sentenceMeaningKey(text) {
  return normalizeText(text).replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function freeRecognitionPhoneticText(text) {
  const words = sentenceMeaningKey(text).split(/\s+/).filter(Boolean);
  const kana = words.map((word) => FREE_RECOGNITION_KANA[word] || word);
  return kana.length ? kana.join(" ") : "";
}

function expectedWordCount(text) {
  return sentenceMeaningKey(text).split(/\s+/).filter(Boolean).length;
}

function objectJapanese(words) {
  const dictionary = {
    me: "私",
    him: "彼",
    her: "彼女",
    us: "私たち",
    them: "彼ら",
    you: "あなた",
    your: "あなたの",
    phone: "電話",
    number: "番号",
    pen: "ペン",
    salt: "塩"
  };
  const values = words
    .filter((word) => word && word !== "the" && word !== "a" && word !== "an")
    .map((word) => word === "and" ? "と" : dictionary[word] || word);
  return values.join("").replace(/と$/, "");
}

function inferMeaningFromFreeRecognition(text) {
  const words = sentenceMeaningKey(text).split(/\s+/).filter(Boolean);
  if (words.join(" ") === "help me") {
    const japanese = "手伝って？";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words.join(" ") === "i love you so much") {
    const japanese = "あなたのことが本当に大好きです。";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words.join(" ") === "i will consider it") {
    const japanese = "それを検討します。";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words.join(" ") === "i will con cider it" || words.join(" ") === "i will cider it") {
    const japanese = "私はサイダーをだまします。";
    return {
      japanese,
      listenerBase: "consider ではなく con cider のような別表現として聞こえる可能性があります。",
      inferred: true,
      alternateWordHearing: true
    };
  }

  if (words.join(" ") === "she is here" || words.join(" ") === "she's here") {
    const japanese = "彼女はここにいます。";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words.join(" ") === "see is here") {
    const japanese = "see がここにあります。";
    return {
      japanese,
      listenerBase: "she ではなく see のような別単語として聞こえる可能性があります。",
      inferred: true,
      alternateWordHearing: true
    };
  }

  if (words.join(" ") === "sea is here") {
    const japanese = "海がここにあります。";
    return {
      japanese,
      listenerBase: "she ではなく sea のような別単語として聞こえる可能性があります。",
      inferred: true,
      alternateWordHearing: true
    };
  }

  if (words.join(" ") === "i live here") {
    const japanese = "私はここに住んでいます。";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words.join(" ") === "i leave here") {
    const japanese = "私はここを去ります。";
    return {
      japanese,
      listenerBase: "live ではなく leave のように聞こえる可能性があります。",
      inferred: true,
      alternateWordHearing: true
    };
  }

  if (words.length < 3) return null;

  if (words.join(" ") === "i will see you tomorrow") {
    const japanese = "明日会いましょう。";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words.join(" ") === "i have to work today") {
    const japanese = "今日は働かなければなりません。";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words[0] === "could" && words[1] === "you" && words[2] === "help") {
    const target = objectJapanese(words.slice(3));
    const japanese = target ? `${target}を手伝ってもらえますか？` : "手伝ってもらえますか？";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words[0] === "could" && words[1] === "you" && words[2] === "pass") {
    const objectStart = words[3] === "me" ? 4 : 3;
    const target = objectJapanese(words.slice(objectStart));
    if (target) {
      const japanese = `${target}を取ってもらえますか？`;
      return {
        japanese,
        listenerBase: `「${japanese}」と言いたいことは推測できます。`,
        inferred: true
      };
    }
  }

  if ((words[0] === "can" || words[0] === "could") && words[1] === "you" && words[2] === "teach") {
    const target = objectJapanese(words.slice(3));
    const japanese = target ? `${target}に教えてもらえますか？` : "教えてもらえますか？";
    return {
      japanese,
      listenerBase: `「${japanese}」と言いたいことは推測できます。`,
      inferred: true
    };
  }

  if (words[0] === "i" && words[1] === "have") {
    const target = objectJapanese(words.slice(2));
    if (target) {
      const japanese = `私は${target}を持っています。`;
      return {
        japanese,
        listenerBase: `「${japanese}」と言いたいことは推測できます。`,
        inferred: true
      };
    }
  }

  if ((words[0] === "can" || words[0] === "could") && words[1] === "i" && words[2] === "have") {
    const objectWords = words.slice(3).filter((word) => word !== "your");
    if (objectWords.join(" ") === "phone number") {
      const japanese = "電話番号を教えてもらえますか？";
      return {
        japanese,
        listenerBase: `「${japanese}」と言いたいことは推測できます。`,
        inferred: true
      };
    }
    const target = objectJapanese(objectWords);
    if (target) {
      const japanese = `${target}をもらえますか？`;
      return {
        japanese,
        listenerBase: `「${japanese}」と言いたいことは推測できます。`,
        inferred: true
      };
    }
  }

  return null;
}

function findMeaning(text) {
  const key = normalizeText(text);
  return MEANING_MIRRORS[key] || MEANING_MIRRORS[sentenceMeaningKey(text)] || inferMeaningFromFreeRecognition(text);
}

function findWordByName(words, name) {
  const target = String(name || "").toLowerCase();
  return (words || []).find((word) => String(word.word || "").toLowerCase() === target);
}

function findMirroredWord(mirroredWords, name) {
  const target = String(name || "").toLowerCase();
  return (mirroredWords || []).find((word) => String(word.word || "").toLowerCase() === target);
}

function hasAlternateWordCandidate(mirroredWords, name, candidate) {
  const mirrored = findMirroredWord(mirroredWords, name);
  return String(mirrored?.alternateWordCandidate || "").toLowerCase().includes(String(candidate || "").toLowerCase())
    || String(mirrored?.text || "").includes(WORD_MIRRORS[name]?.distorted || "\u0000");
}

function alternateWordMeaningFromPronunciation({ contrastSet, words, mirroredWords, freeRecognizedText }) {
  const referenceKey = sentenceMeaningKey(contrastSet?.text);
  const freeKey = sentenceMeaningKey(freeRecognizedText);

  // 自由認識(自然発話向けの制約なし認識)は、Azureの言語モデルが「よくある単語」に
  // 引っ張られる傾向があり、参照文にきちんと沿った発音をしていても、別の紛らわしい
  // 単語として誤認識されることがある(実機フィードバック: leaveをscore97で発音した
  // のに、自由認識だけで「live」判定になり、文全体の意味が入れ替わってしまった)。
  // 自由認識の一致だけを唯一の根拠にせず、対象語のscoreがそこそこ甘い(=本当に
  // 曖昧だった可能性がある)ことも合わせて要求することで、綺麗に発音できている時は
  // 自由認識の誤認識に振り回されないようにする。scoreベースの判定(過去に検証済み、
  // より厳しい閾値)は従来通り単独でも成立させる。
  const freeRecognitionCorroborated = (score, weakest, softScoreBar, softWeakestBar) =>
    score < softScoreBar || (weakest !== null && weakest < softWeakestBar);

  if (referenceKey === "she is here") {
    const she = findWordByName(words, "she");
    const sheScore = Number(she?.score ?? 100);
    const sheWeakest = weakestPhoneScore(she || {});
    const heardSea = (
      (["sea is here", "see is here"].includes(freeKey) || hasAlternateWordCandidate(mirroredWords, "she", "sea"))
      && freeRecognitionCorroborated(sheScore, sheWeakest, 92, 86)
    )
      || sheScore < 86
      || (sheWeakest !== null && sheWeakest < 80);
    if (heardSea) {
      return {
        japanese: "海がここにあります。",
        listenerBase: "she ではなく sea/see のような別単語として聞こえる可能性があります。",
        source: "pronunciationAlternate",
        sourceText: freeRecognizedText || "sea/see is here",
        referenceText: contrastSet.text,
        freeRecognizedText: freeRecognizedText || "",
        alternateWordHearing: true,
        alternateWordSwap: { from: "she", to: "sea" }
      };
    }
  }

  if (referenceKey === "i live here") {
    const live = findWordByName(words, "live");
    const liveScore = Number(live?.score ?? 100);
    const liveWeakest = weakestPhoneScore(live || {});
    const heardLeave = (
      (freeKey === "i leave here" || hasAlternateWordCandidate(mirroredWords, "live", "leave"))
      && freeRecognitionCorroborated(liveScore, liveWeakest, 92, 84)
    )
      || liveScore < 86
      || (liveWeakest !== null && liveWeakest < 78);
    if (heardLeave) {
      return {
        japanese: "私はここを去ります。",
        listenerBase: "live ではなく leave のような別単語として聞こえる可能性があります。",
        source: "pronunciationAlternate",
        sourceText: freeRecognizedText || "I leave here",
        referenceText: contrastSet.text,
        freeRecognizedText: freeRecognizedText || "",
        alternateWordHearing: true,
        alternateWordSwap: { from: "live", to: "leave" }
      };
    }
  }

  if (referenceKey === "i leave here") {
    const leave = findWordByName(words, "leave");
    const leaveScore = Number(leave?.score ?? 100);
    const leaveWeakest = weakestPhoneScore(leave || {});
    const heardLive = (
      (freeKey === "i live here" || hasAlternateWordCandidate(mirroredWords, "leave", "live"))
      && freeRecognitionCorroborated(leaveScore, leaveWeakest, 92, 84)
    )
      || leaveScore < 86
      || (leaveWeakest !== null && leaveWeakest < 78);
    if (heardLive) {
      return {
        japanese: "私はここに住んでいます。",
        listenerBase: "leave ではなく live のような別単語として聞こえる可能性があります。",
        source: "pronunciationAlternate",
        sourceText: freeRecognizedText || "I live here",
        referenceText: contrastSet.text,
        freeRecognizedText: freeRecognizedText || "",
        alternateWordHearing: true,
        alternateWordSwap: { from: "leave", to: "live" }
      };
    }
  }

  if (referenceKey === "i will consider it") {
    const consider = findWordByName(words, "consider");
    const considerScore = Number(consider?.score ?? 100);
    const considerWeakest = weakestPhoneScore(consider || {});
    const heardCider = (
      (["i will con cider it", "i will cider it"].includes(freeKey) || hasAlternateWordCandidate(mirroredWords, "consider", "con cider"))
      && freeRecognitionCorroborated(considerScore, considerWeakest, 90, 82)
    )
      || considerScore < 84
      || (considerWeakest !== null && considerWeakest < 76);
    if (heardCider) {
      return {
        japanese: "サイダーと言っているように聞こえます。",
        listenerBase: "consider ではなく con cider / cider のような別語として聞こえる可能性があります。",
        source: "pronunciationAlternate",
        sourceText: freeRecognizedText || "con cider",
        referenceText: contrastSet.text,
        freeRecognizedText: freeRecognizedText || "",
        alternateWordHearing: true,
        alternateWordSwap: { from: "consider", to: "con cider" }
      };
    }
  }

  return null;
}

// alternateWordMeaningFromPronunciationと同じ紛らわしい単語ペアについて、
// 対象語の発音スコア自体が高いかどうかを判定する。alternateWordMeaningFromPronunciation
// が「対象語のscoreが甘くない限り自由認識だけでは言い換えない」よう既に直っているのに、
// getMeaning側の自由認識フォールバックがこれを無視して言い換えてしまうと意味が無いため、
// 同じ基準をgetMeaning呼び出し側でも使う。
const MINIMAL_PAIR_SCORE_BARS = {
  "she is here": { word: "she", scoreBar: 92, weakestBar: 86 },
  "i live here": { word: "live", scoreBar: 92, weakestBar: 84 },
  "i leave here": { word: "leave", scoreBar: 92, weakestBar: 84 },
  "i will consider it": { word: "consider", scoreBar: 90, weakestBar: 82 }
};

function minimalPairCriticalWordIsClean(contrastSet, words) {
  const config = MINIMAL_PAIR_SCORE_BARS[sentenceMeaningKey(contrastSet?.text)];
  if (!config) return false;
  const target = findWordByName(words, config.word);
  if (!target) return false;
  const score = Number(target.score ?? 100);
  const weakest = weakestPhoneScore(target);
  return score >= config.scoreBar && (weakest === null || weakest >= config.weakestBar);
}

function getMeaning(contrastSet, freeRecognizedText, utteranceCheck, options = {}) {
  const referenceMeaning = findMeaning(contrastSet.text);
  const freeMeaning = findMeaning(freeRecognizedText);
  const mismatch = utteranceCheck?.status === "possible_mismatch";
  // utteranceCheck は自由認識テキストと参照文の単純な文字列一致だけで判定しており、
  // 発音の質は一切見ていない。leave/live, she/sea のような紛らわしい単語ペアでは、
  // Azureの自由認識(言語モデル)が「よくある方の単語」に寄ってしまい、scripted
  // モードでの発音スコアが高くても mismatch 扱いになることがある(実機フィードバック:
  // leaveをscore97で発音しても、自由認識だけで「live」判定され文全体の意味が
  // 入れ替わってしまった)。preferReference は、そのような「対象語の発音自体は
  // 綺麗だった」ケースで、自由認識の言い換えより参照文の意味を優先するためのフラグ。
  const preferReference = Boolean(options.preferReference) && Boolean(referenceMeaning);
  const useFreeMeaning = mismatch && freeMeaning && !preferReference;
  const useReferenceFallback = mismatch && !freeMeaning && referenceMeaning && options.allowReferenceFallback;
  const meaning = useFreeMeaning
    ? freeMeaning
    : preferReference || useReferenceFallback
      ? referenceMeaning
      : mismatch ? null : referenceMeaning;

  if (meaning) {
    return {
      ...meaning,
      listenerBase: preferReference
        ? `${meaning.listenerBase} 参照文なし認識では「${freeRecognizedText || "別の英文"}」寄りに聞こえていますが、対象語の発音スコア自体は高いため、選択英文の意味を優先しています。`
        : useReferenceFallback
          ? `${meaning.listenerBase} ただし、自由認識では「${freeRecognizedText || "別の英文"}」寄りに聞こえているため、日本語訳は参照文ベースの確認用ミラーです。`
          : meaning.listenerBase,
      source: useFreeMeaning ? "freeRecognition" : preferReference ? "reference" : useReferenceFallback ? "referenceFallback" : "reference",
      sourceText: useFreeMeaning ? freeRecognizedText : contrastSet.text,
      referenceText: contrastSet.text,
      freeRecognizedText: freeRecognizedText || ""
    };
  }

  return {
    japanese: freeRecognizedText
      ? `「${freeRecognizedText}」の日本語ミラーはまだ未対応です。`
      : "自由発話の意味をまだ特定できません。",
    listenerBase: freeRecognizedText
      ? `参照文なし認識では「${freeRecognizedText}」として聞こえています。参照文とは別の英文として扱います。`
      : "文意は未設定のため、発音上の聞こえ方だけを表示しています。",
    source: "unsupportedFreeRecognition",
    sourceText: freeRecognizedText || contrastSet.text || "",
    referenceText: contrastSet.text || "",
    freeRecognizedText: freeRecognizedText || ""
  };
}

function makeListenerExperience({ meaning, phoneticText, severity, reasons, couldBlindSpot, muffled, conservative, linking }) {
  if (linking) {
    const localLinking = (reasons || [])
      .map((reason) => String(reason || "").match(/「([^」]+)」/u)?.[1])
      .find((text) => /クッ|くっ|Could you/i.test(text));
    const heard = localLinking || "クッユー / クッジュー";
    return `${meaning.listenerBase} ただし、Could you のつながりは「${heard}」寄りに聞こえる候補です。help me など別の箇所の聞こえ方とは分けて確認してください。`;
  }
  if (conservative) {
    return `${meaning.listenerBase} Azureスコアは高いため、聞こえ方の断定はしません。録音を聞き直し、出だしや語尾に少し違和感がないか確認してください。`;
  }
  if (severity === "high") {
    return `${meaning.listenerBase} ただし、聞こえ方は「${phoneticText}」に近く、聞き手は意味を一度で取りにくい可能性があります。`;
  }
  if (couldBlindSpot) {
    return `${meaning.listenerBase} ただし、出だしが「${phoneticText}」のように聞こえると、Could の部分で一瞬意味を取り直します。`;
  }
  if (muffled) {
    return `${meaning.listenerBase} ただし、子音の輪郭が弱く、聞き手には少しぼやけた依頼として届く可能性があります。`;
  }
  if (severity === "medium" || severity === "low") {
    return `${meaning.listenerBase} 一部の音が「${phoneticText}」寄りに聞こえ、聞き手は文脈で補って理解する状態です。`;
  }
  if (reasons.length) {
    return `${meaning.listenerBase} ただし、人間の耳で違和感がある場合は、音の弱さを追加で比較してください。`;
  }
  return `${meaning.listenerBase} 発音上の大きな妨げは少なく、意味は比較的そのまま届きそうです。`;
}

function estimateTimedSpeechMs(words, fallbackMs) {
  const fallback = Number(fallbackMs);
  const timedWords = words.filter((word) => Number(word.duration100ns) > 0);
  if (timedWords.length) {
    const starts = timedWords.map((word) => Number(word.offset100ns || 0));
    const ends = timedWords.map((word) => Number(word.offset100ns || 0) + Number(word.duration100ns || 0));
    const span100ns = Math.max(...ends) - Math.min(...starts);
    if (span100ns > 0) {
      const timedSpan = Math.round(span100ns / 10000);
      return timedSpan;
    }
  }
  return fallback > 0 ? Math.round(fallback) : null;
}

function estimateArticulationSpeechMs(words, rhythmHints) {
  const timedWords = words.filter((word) => Number(word.duration100ns) > 0);
  const azureDurationMs = timedWords.reduce((sum, word) => sum + Math.max(0, Number(word.duration100ns || 0) / 10000), 0);
  const localVoicedMs = Number(rhythmHints?.localVoicedMs || 0);
  const candidates = [azureDurationMs, localVoicedMs]
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value));
  if (!candidates.length) return null;
  return Math.max(120, Math.min(...candidates));
}

function classifySpeed(wpm) {
  if (wpm === null || wpm === undefined) return { level: "unknown", label: "未測定", rate: "-4%" };
  if (wpm < 95) return { level: "very_slow", label: "かなり遅い", rate: "-24%" };
  if (wpm < 125) return { level: "slow", label: "遅め", rate: "-16%" };
  if (wpm <= 255) return { level: "natural", label: "自然域", rate: "+0%" };
  if (wpm <= 320) return { level: "fast", label: "速い", rate: "+10%" };
  return { level: "very_fast", label: "かなり速い", rate: "+36%" };
}

function japaneseMirrorRateForSpeed(level) {
  return {
    unknown: "-6%",
    very_slow: "-36%",
    slow: "-26%",
    natural: "-4%",
    fast: "+8%",
    very_fast: "+24%"
  }[level] || "-6%";
}

function speedRank(level) {
  return {
    unknown: 2,
    very_slow: 0,
    slow: 1,
    natural: 2,
    fast: 3,
    very_fast: 4
  }[level] ?? 2;
}

function speedFromRank(rank) {
  return ["very_slow", "slow", "natural", "fast", "very_fast"][Math.max(0, Math.min(4, rank))] || "natural";
}

function combineVoiceSpeed({ overallSpeed, articulationSpeed, segmentedDelivery }) {
  if (!segmentedDelivery || !articulationSpeed) return overallSpeed;
  const overallRank = speedRank(overallSpeed?.level);
  const articulationRank = speedRank(articulationSpeed.level);

  // Word-by-word speech often has fast individual words but slow overall delivery.
  // Mirror that as pauses/segmentation, not as a globally fast Japanese voice.
  if (overallRank <= speedRank("slow") && articulationRank >= speedRank("fast")) {
    return { level: "natural", label: "自然域", rate: "+0%" };
  }

  if (articulationRank > overallRank + 1) {
    const level = speedFromRank(overallRank + 1);
    return { ...articulationSpeed, level, label: classifySpeed({ very_slow: 80, slow: 110, natural: 160, fast: 250, very_fast: 320 }[level]).label };
  }

  return articulationSpeed;
}

function effectiveVoiceSpeedLevel(speechFeatures) {
  const overall = speechFeatures?.speedLevel || "unknown";
  const voice = speechFeatures?.voiceSpeedLevel || overall;
  const wpm = Number(speechFeatures?.wpm || 0);
  const articulationWpm = Number(speechFeatures?.articulationWpm || 0);
  const localPauseCount = Number(speechFeatures?.rhythmHints?.localPauseCount || 0);
  const hasExplicitPause = (speechFeatures?.boundaryPauseEvents || []).some((event) => Number(event.gapMs || 0) >= 220);

  // Articulation WPM can look fast when the learner speaks with short voiced islands.
  // Keep the mirror globally natural unless the whole utterance is actually fast.
  if (overall === "natural" && ["fast", "very_fast"].includes(voice) && wpm > 0 && wpm < 190) {
    return "natural";
  }
  if (overall === "natural" && articulationWpm >= 240 && wpm > 0 && wpm < 190 && !hasExplicitPause && localPauseCount < 2) {
    return "natural";
  }
  return voice;
}

function classifyConsonantWeakness(consonantAvg, consonantMin) {
  const avg = consonantAvg === null || consonantAvg === undefined ? null : Number(consonantAvg);
  const min = consonantMin === null || consonantMin === undefined ? null : Number(consonantMin);
  if ((min !== null && min < 55) || (avg !== null && avg < 62)) return { level: "high", label: "強い" };
  if ((min !== null && min < 65) || (avg !== null && avg < 76)) return { level: "medium", label: "中" };
  if ((min !== null && min < 78) || (avg !== null && avg < 84)) return { level: "low", label: "軽い" };
  return { level: "none", label: "少ない" };
}

function phoneMs(phone) {
  const duration = Number(phone?.duration100ns || 0);
  return duration > 0 ? Math.round(duration / 10000) : null;
}

function wordStart100ns(word) {
  const offset = Number(word?.offset100ns || 0);
  const duration = Number(word?.duration100ns || 0);
  return Number.isFinite(offset) && duration > 0 ? Math.max(0, offset) : null;
}

function wordEnd100ns(word) {
  const start = wordStart100ns(word);
  const duration = Number(word?.duration100ns || 0);
  return start !== null && duration > 0 ? start + duration : null;
}

function wordGapMs(current, next) {
  const currentEnd = wordEnd100ns(current);
  const nextStart = wordStart100ns(next);
  if (currentEnd === null || nextStart === null) return null;
  return Math.max(0, Math.round((nextStart - currentEnd) / 10000));
}

function isVowelPhone(phone) {
  const value = String(phone || "").toLowerCase();
  return ["a", "e", "i", "o", "u", "æ", "ə", "ʌ", "ɪ", "ʊ", "ɛ", "ɑ", "ɔ"].some((vowel) => value.includes(vowel));
}

function findPhone(word, matcher) {
  return (word.phones || []).find((phone) => matcher(String(phone.phone || "").toLowerCase()));
}

const EXPECTED_LINKING_PAIRS = new Map([
  ["could-you", { label: "Could you", mirror: "クドゥ / ユー", action: "Could you を完全に切らず、軽くつなげて読む。" }],
  ["can-you", { label: "Can you", mirror: "キャン / ユー", action: "Can you を完全に切らず、軽くつなげて読む。" }],
  ["could-help", { label: "Could help", mirror: "クドゥ / ヘルプ", action: "Could の後で止めすぎず、help へ軽く流す。" }],
  ["you-help", { label: "You help", mirror: "ユー / ヘルプ", action: "you から help へ意味のまとまりで読む。" }],
  ["help-me", { label: "Help me", mirror: "ヘルプ / ミー", action: "help と me を1語ずつ置かず、依頼のまとまりで読む。" }],
  ["you-teach", { label: "You teach", mirror: "ユー / ティーチ", action: "you teach を意味のまとまりで読む。" }],
  ["teach-me", { label: "Teach me", mirror: "ティーチ / ミー", action: "teach me を1語ずつ置かず、依頼のまとまりで読む。" }],
  ["pass-me", { label: "Pass me", mirror: "パス / ミー", action: "pass me を意味のまとまりで読む。" }],
  ["me-the", { label: "Me the", mirror: "ミー / ザ", action: "me the を文中で止めずに読む。" }],
  ["the-salt", { label: "The salt", mirror: "ザ / ソルト", action: "the salt を名詞句としてまとめて読む。" }],
  ["can-i", { label: "Can I", mirror: "キャン / アイ", action: "Can I を完全に切らず、軽くつなげて読む。" }],
  ["have-your", { label: "Have your", mirror: "ハヴ / ユア", action: "have your を意味のまとまりで読む。" }],
  ["your-phone", { label: "Your phone", mirror: "ユア / フォン", action: "your phone を名詞句としてまとめて読む。" }],
  ["phone-number", { label: "Phone number", mirror: "フォン / ナンバー", action: "phone number を名詞句としてまとめて読む。" }],
  ["will-see", { label: "Will see", mirror: "ウィル / シー", action: "will see を意味のまとまりで読む。" }],
  ["see-you", { label: "See you", mirror: "シー / ユー", action: "see you を自然なまとまりで読む。" }],
  ["you-tomorrow", { label: "You tomorrow", mirror: "ユー / トゥモロー", action: "you tomorrow を文末へ流して読む。" }],
  ["have-to", { label: "Have to", mirror: "ハヴ / トゥ", action: "have to を意味のまとまりで読む。" }],
  ["to-work", { label: "To work", mirror: "トゥ / ワーク", action: "to work を意味のまとまりで読む。" }]
]);

function expectedLinkingPair(current, next) {
  return EXPECTED_LINKING_PAIRS.get(`${current.word}-${next.word}`) || null;
}

function buildLinkingSignals(words) {
  const signals = [];
  const events = [];

  for (let i = 0; i < words.length - 1; i += 1) {
    const current = words[i];
    const next = words[i + 1];
    if (current.word !== "could" || next.word !== "you") continue;

    const dPhone = findPhone(current, (phone) => phone.includes("d"));
    const yPhone = findPhone(next, (phone) => phone.includes("j") || phone.includes("y") || phone.includes("ʒ") || phone.includes("dʒ"));
    const dScore = Number(dPhone?.score ?? 100);
    const yScore = Number(yPhone?.score ?? next.score ?? 100);
    const dMs = phoneMs(dPhone);
    const gapMs = wordGapMs(current, next);
    const clearlySeparated = gapMs !== null && gapMs >= 55;
    const highWords = isHighAzureWord(current) && isHighAzureWord(next);
    const likelyLinked = !clearlySeparated && (dScore < 80 || yScore < 86 || String(next.errorType || "").toLowerCase() === "insertion");

    if (!likelyLinked) continue;

    const dDropped = dScore < 72 || (dMs !== null && dMs <= 80);
    const mirrorText = dDropped
      ? highWords ? "クッユー(?)" : "クッユー"
      : highWords ? "クッジュー(?)" : "クッジュー";
    const mirrorHint = dDropped ? "くっゆー / クッユー" : "くっぢゅー / クッジュー";
    signals.push(highWords ? "could-you-linking-check" : "could-you-linking-strong");
    events.push({
      key: "could-you:linking",
      type: "linking",
      words: [current.original, next.original],
      strength: highWords ? "weak" : "strong",
      mirrorText,
      label: highWords ? "Could you の連結を確認" : "Could you の連結が強い",
      detail: highWords
        ? `Could と you は高スコアです。ただし連結して「${mirrorHint}」寄りに聞こえていないか確認する候補です。${dPhone ? `d は score ${Math.round(dScore)}${dMs !== null ? ` / 約${dMs}ms` : ""}。` : ""}${gapMs !== null ? `単語間は約${gapMs}ms。` : ""}`
        : `Could you が強く連結し、「${mirrorHint}」寄りに聞こえる候補です。${gapMs !== null ? `単語間は約${gapMs}ms。` : ""}`,
      action: highWords
        ? `Could you が一語の「${mirrorText.replace(/[()?]/g, "")}」になりすぎていないか録音で確認する。`
        : "Could you をつなげすぎず、Could と you の境目を軽く残す。"
    });
  }

  return { signals, events };
}

function buildBoundaryPauseSignals(words) {
  const signals = [];
  const events = [];

  for (let i = 0; i < words.length - 1; i += 1) {
    const current = words[i];
    const next = words[i + 1];
    const gapMs = wordGapMs(current, next);
    const expectedPair = expectedLinkingPair(current, next);
    const isExpectedLinkingBreak = expectedPair && gapMs !== null && gapMs >= 155;
    if ((gapMs === null || gapMs < 220) && !isExpectedLinkingBreak) continue;

    const strength = gapMs >= 380 ? "strong" : gapMs >= 220 ? "weak" : "micro";
    const signal = strength === "strong"
      ? "word-boundary-pause-strong"
      : strength === "micro"
        ? "expected-linking-break-check"
        : "word-boundary-pause-check";
    signals.push(signal);
    events.push({
      key: `pause:${current.word}-${next.word}`,
      type: strength === "micro" ? "expected_linking_break" : "word_boundary_pause",
      words: [current.original, next.original],
      afterWordIndex: i,
      gapMs,
      strength,
      level: strength === "strong" ? "high" : "medium",
      mirrorText: expectedPair?.mirror,
      label: strength === "micro" ? `${expectedPair.label} の連結なしを確認` : strength === "strong" ? "単語間の間が長い" : "単語間の間を確認",
      detail: strength === "micro"
        ? `${expectedPair.label} は本来なめらかにつながりやすい箇所ですが、約${gapMs}msの境目があり、単語ごとに粒立って聞こえる候補です。`
        : `${current.original} と ${next.original} の間が約${gapMs}ms空いています。1語ずつ区切れて聞こえる候補です。`,
      action: expectedPair?.action || "文として自然につなげたい場合は、単語ごとの停止を短くし、意味のまとまりで読む。"
    });
  }

  return {
    level: events.some((event) => event.strength === "strong") ? "high" : events.length ? "medium" : "none",
    label: events.length ? events.map((event) => `${event.words.join("-")}:${event.gapMs}ms`).join(", ") : "大きな単語間ギャップなし",
    signals: [...new Set(signals)],
    events
  };
}

function supplementBoundaryPausesFromRhythm(words, boundaryPauses, rhythmHints) {
  const pauseCount = Number(rhythmHints?.localPauseCount || 0);
  const maxPause = Number(rhythmHints?.localMaxPauseMs || 0);
  const avgPause = Number(rhythmHints?.localAvgPauseMs || 0);
  const hasAzurePauseEvidence = (boundaryPauses.events || []).some((event) => Number(event.gapMs || 0) >= 155);
  if (pauseCount < 3 || maxPause < 240 || avgPause < 165) return boundaryPauses;
  if (!hasAzurePauseEvidence && maxPause < 240) return boundaryPauses;

  const existingKeys = new Set((boundaryPauses.events || []).map((event) => event.key));
  const events = [...(boundaryPauses.events || [])];
  const signals = [...(boundaryPauses.signals || [])];
  let added = 0;
  const targetCount = Math.min(pauseCount, Math.max(0, words.length - 1));
  for (let i = 0; i < words.length - 1 && added < targetCount; i += 1) {
    const current = words[i];
    const next = words[i + 1];
    const expectedPair = expectedLinkingPair(current, next);
    if (!expectedPair) continue;
    const azureGapMs = wordGapMs(current, next);
    if (azureGapMs !== null && azureGapMs < 90) continue;
    const key = `rhythm-pause:${current.word}-${next.word}`;
    if (existingKeys.has(key) || existingKeys.has(`pause:${current.word}-${next.word}`)) continue;
    const gapMs = Math.max(170, Math.round(avgPause || maxPause || 170));
    events.push({
      key,
      type: "expected_linking_break",
      words: [current.original, next.original],
      afterWordIndex: i,
      gapMs,
      strength: pauseCount >= 2 ? "rhythm" : "micro",
      level: "medium",
      mirrorText: expectedPair.mirror,
      label: `${expectedPair.label} の連結なしを録音波形から確認`,
      detail: `録音波形上で無音ギャップが ${pauseCount} 箇所あります。Azure単語タイミングが弱い場合の補助判定として、${expectedPair.label} が粒立って聞こえる候補です。`,
      action: expectedPair.action
    });
    signals.push("local-rhythm-pause-check");
    added += 1;
  }

  return {
    level: events.some((event) => event.strength === "strong" || event.strength === "rhythm") ? "high" : events.length ? "medium" : "none",
    label: events.length ? events.map((event) => `${event.words.join("-")}:${event.gapMs}ms`).join(", ") : "大きな単語間ギャップなし",
    signals: [...new Set(signals)],
    events
  };
}

function buildLengthAndPronunciationSignals(words) {
  const signals = [];
  const events = [];

  words.forEach((word) => {
    const phones = word.phones || [];
    if (!phones.length) return;

    const vowels = phones.filter((phone) => isVowelPhone(phone.phone));
    const longestVowel = vowels
      .map((phone) => ({ phone: phone.phone, ms: phoneMs(phone), score: Number(phone.score || 100) }))
      .filter((item) => item.ms !== null)
      .sort((a, b) => b.ms - a.ms)[0];
    const finalPhone = phones[phones.length - 1];
    const finalScore = Number(finalPhone?.score ?? 100);
    const finalMs = phoneMs(finalPhone);
    const handledFinalPhones = new Set();

    if (String(word.errorType || "").toLowerCase() === "insertion") {
      signals.push(`${word.word}-insertion`);
      events.push({
        key: `${word.word}:insertion`,
        type: "alignment",
        word: word.original,
        label: `${word.original} が余分に入っている`,
        detail: `${word.original} が挿入として検出されています。聞き手には余分な「${INSERTION_MIRRORS[word.word] || word.original}」が入ったように届く候補です。`,
        action: `${word.original} を余分に入れず、前後の単語に吸収させる。`
      });
    }

    if (word.word === "could") {
      const dPhone = findPhone(word, (phone) => phone.includes("d"));
      const dScore = Number(dPhone?.score ?? 100);
      const dMs = phoneMs(dPhone);

      if (longestVowel && longestVowel.ms >= 145) {
        signals.push("could-vowel-long");
        events.push({
          key: "could:vowel-long",
          type: "length",
          word: word.original,
          label: "Could の母音が長め",
          detail: `母音 ${longestVowel.phone} が約${longestVowel.ms}ms。短い /kəd/ より「クル」に寄る候補です。`,
          action: "Could の母音を短くして /kəd/ に近づける。"
        });
      }
      if (dPhone && (dScore < 72 || (dMs !== null && dMs >= 85))) {
        handledFinalPhones.add("d");
        const dIsShortOrWeak = dScore < 72 && (dMs === null || dMs < 70);
        const conservativeCouldD = isHighAzureWord(word) && dScore >= 50;
        const couldDCheckOnly = conservativeCouldD || (isHighAzureWord(word) && dIsShortOrWeak);
        signals.push(couldDCheckOnly ? "could-final-d-check" : dIsShortOrWeak ? "could-final-d-weak" : "could-final-d-heavy-strong");
        events.push({
          key: couldDCheckOnly ? "could:final-d-check" : dIsShortOrWeak ? "could:final-d-weak" : "could:final-d-heavy",
          type: "final-consonant",
          word: word.original,
          strength: couldDCheckOnly || dIsShortOrWeak ? "weak" : "strong",
          level: couldDCheckOnly ? "low" : dIsShortOrWeak ? "medium" : "high",
          voiceEligible: !couldDCheckOnly,
          label: couldDCheckOnly ? "Could の d を確認" : dIsShortOrWeak ? "Could の d が弱い" : "Could の d が強く残る",
          detail: dIsShortOrWeak && !couldDCheckOnly
            ? `d が score ${Math.round(dScore)}${dMs !== null ? ` / 約${dMs}ms` : ""}。語尾の閉じが短く、Could の輪郭が弱く聞こえる候補です。`
            : couldDCheckOnly
            ? `Could は単語スコアが高いため断定しません。d が score ${Math.round(dScore)}${dMs !== null ? ` / 約${dMs}ms` : ""} なので、語尾が少し強く残っていないか確認する候補です。`
            : `d が score ${Math.round(dScore)}${dMs !== null ? ` / 約${dMs}ms` : ""}。語尾が残り、「クドゥ」寄りに聞こえる候補です。母音も長い場合だけ「クルド」寄りとして扱います。`,
          action: dIsShortOrWeak && !couldDCheckOnly
            ? "Could の d を完全に消さず、短く弱い閉じを残す。"
            : couldDCheckOnly
            ? "録音を聞き直し、Could の d が日本語の「ド」まで強く残っていないか確認する。"
            : "Could の d を日本語の「ド」にせず、短く弱く閉じる。"
        });
      }
    }

    if (word.word === "help") {
      const hPhone = findPhone(word, (phone) => phone.includes("h"));
      const lPhone = findPhone(word, (phone) => phone.includes("l"));
      const pPhone = findPhone(word, (phone) => phone.includes("p"));
      const hScore = Number(hPhone?.score ?? 100);
      const lScore = Number(lPhone?.score ?? 100);
      const pScore = Number(pPhone?.score ?? 100);
      const lMs = phoneMs(lPhone);
      // level が trace/low(軽微)なのに、常に「エルプ」「ヘプ」のような強い(=別の聞こえ方に
      // 変わったと断定する)言い回しを使うと、同じ単語のカタカナ聞こえ方(別ロジックで算出)の
      // 判定と矛盾して見える(実機フィードバックで指摘: score 79 で「出だしが抜けて」は言い過ぎ、
      // かつカタカナ側は「ヘプ」= hは残っている、と矛盾)。medium/high のときだけ具体的な
      // 別の聞こえ方を断定し、trace/low は「輪郭が弱いが大きくは崩れていない」という
      // 軽微な表現に留める。
      const isNotableWeakness = (level) => level === "high" || level === "medium";
      if (hPhone && hScore < 90) {
        const level = hScore < 45 ? "high" : hScore < 62 ? "medium" : hScore < 78 ? "low" : "trace";
        signals.push("help-h-weak");
        events.push({
          key: "help:h-weak",
          type: "initial-consonant",
          word: word.original,
          strength: hScore < 55 ? "strong" : "weak",
          level,
          label: "help の h が弱い",
          detail: isNotableWeakness(level)
            ? `h が score ${Math.round(hScore)}。出だしが抜けて「エルプ」寄りに届く候補です。`
            : `h が score ${Math.round(hScore)}。出だしの子音がやや弱いものの、大きくは崩れていない軽微な候補です。`,
          action: "help の h を息だけで流さず、語頭の輪郭を軽く残す。"
        });
      }
      if (lPhone && (lScore < 90 || (lMs !== null && lMs <= 60))) {
        const durationWeak = lMs !== null && lMs <= 60;
        const level = lScore < 45 ? "high" : lScore < 62 ? "medium" : lScore < 72 || durationWeak ? "low" : "trace";
        signals.push("help-l-weak");
        events.push({
          key: "help:l-weak",
          type: "liquid",
          word: word.original,
          strength: lScore < 45 || durationWeak ? "weak" : "weak",
          level,
          label: "help の l が弱い",
          detail: isNotableWeakness(level)
            ? (durationWeak
              ? `l は score ${Math.round(lScore)}ですが約${lMs}msと短く、聞き手には「ヘプ」寄りに届く候補です。`
              : `l が score ${Math.round(lScore)}。聞き手には「ヘプ」寄りに届く候補です。`)
            : `l が score ${Math.round(lScore)}${lMs !== null ? ` / 約${lMs}ms` : ""}。やや短め・弱めですが、大きくは崩れていない軽微な候補です。`,
          action: "help の l を消さず、舌先の接触を残す。"
        });
      }
      if (pPhone && pScore < 88) {
        const level = pScore < 45 ? "high" : pScore < 62 ? "medium" : pScore < 72 ? "low" : "trace";
        handledFinalPhones.add("p");
        signals.push("help-final-p-weak");
        events.push({
          key: "help:final-p-weak",
          type: "final-consonant",
          word: word.original,
          strength: pScore < 45 ? "strong" : "weak",
          level,
          label: "help の p が弱い",
          detail: isNotableWeakness(level)
            ? `p が score ${Math.round(pScore)}。語尾が閉じず、意味がぼやける候補です。`
            : `p が score ${Math.round(pScore)}。語尾の閉じがやや弱いものの、大きくは崩れていない軽微な候補です。`,
          action: "help の p を日本語の母音付き「プ」にせず、唇で短く閉じる。"
        });
      }
    }

    if (finalPhone && finalScore < 65 && !handledFinalPhones.has(String(finalPhone.phone || "").toLowerCase())) {
      signals.push(`${word.word}-final-weak`);
      events.push({
        key: `${word.word}:final-weak:${finalPhone.phone}`,
        type: "final-consonant",
        word: word.original,
        strength: finalScore < 45 ? "strong" : "weak",
        level: finalScore < 45 ? "high" : finalScore < 55 ? "medium" : "low",
        label: `${word.original} の語尾が弱い`,
        detail: `語尾 ${finalPhone.phone} が score ${Math.round(finalScore)}${finalMs !== null ? ` / 約${finalMs}ms` : ""}。単語の輪郭が弱い候補です。`,
        action: `${word.original} の語尾 ${finalPhone.phone} を短く残す。`
      });
    }

    const finalVowel = finalPhone && isVowelPhone(finalPhone.phone) ? finalPhone : null;
    const finalVowelMs = finalVowel ? phoneMs(finalVowel) : null;
    // 語尾の母音(here の ɪɹ など)はr音化・文末伸長で自然に長くなるため、絶対的な
    // 閾値だけでは際限なく誤検出が起きる(katakanaHeavyWords と同じ問題)。
    // Azure自身のスコアが高い場合はよほど極端な長さでない限り疑わない。r音化母音は
    // 音素単体のスコアが単語全体のスコアより低めに出やすい(実機フィードバック:
    // word score 97でもɪɹ単体は86止まり)ため、単語スコアと音素スコアの高い方で判定する。
    const finalVowelScoreIsHigh = Math.max(finalScore, Number(word.score ?? 100)) >= 92;
    const finalVowelDurationBar = finalVowelScoreIsHigh ? 650 : 360;
    if (finalVowel && finalVowelMs !== null && finalVowelMs >= finalVowelDurationBar) {
      signals.push(`${word.word}-final-vowel-long`);
      events.push({
        key: `${word.word}:final-vowel-long:${finalVowel.phone}`,
        type: "length",
        word: word.original,
        strength: finalVowelMs >= 520 ? "strong" : "weak",
        level: finalVowelMs >= 520 ? "high" : "medium",
        label: `${word.original} の母音が長い`,
        detail: `${word.original} の ${finalVowel.phone} が約${finalVowelMs}ms 伸びています。語尾が長く残る候補です。`,
        action: `${word.original} の母音を必要以上に伸ばさず、短く閉じる。`
      });
    }

    const weakestPhone = phones
      .map((phone) => ({ phone: phone.phone, score: phoneScoreValue(phone), ms: phoneMs(phone) }))
      .sort((a, b) => a.score - b.score)[0];
    const wordScore = Number(word.score ?? 100);
    const hasWordEvent = events.some((event) => event.word === word.original || event.word === word.word);
    if (word.isCritical && !hasWordEvent && weakestPhone && wordScore >= 84 && wordScore < 97 && weakestPhone.score >= 78 && weakestPhone.score < 93) {
      signals.push(`${word.word}-phonics-trace`);
      events.push({
        key: `${word.word}:phonics-trace:${weakestPhone.phone}`,
        type: "phonics_trace",
        word: word.original,
        strength: "weak",
        level: "low",
        label: `${word.original} の軽い発音の甘さ`,
        detail: `${word.original} は通じる範囲ですが、${weakestPhone.phone} が score ${Math.round(weakestPhone.score)}${weakestPhone.ms !== null ? ` / 約${weakestPhone.ms}ms` : ""} です。上級者の微妙な非ネイティブ感として残す候補です。`,
        action: `${word.original} をモデル音声と比べ、母音・子音の輪郭を少しだけ調整する。`
      });
    }
  });

  const uniqueSignals = [...new Set(signals)];
  const seenEventKeys = new Set();
  const uniqueEvents = events.filter((event) => {
    const key = event.key || `${event.word}:${event.type}:${event.label}`;
    if (seenEventKeys.has(key)) return false;
    seenEventKeys.add(key);
    return true;
  });
  const strongSignalCount = uniqueEvents.filter(eventIsStrong).length;
  return {
    level: strongSignalCount >= 2 ? "high" : strongSignalCount === 1 ? "medium" : uniqueEvents.length ? "low" : "none",
    label: uniqueSignals.length ? uniqueSignals.join(", ") : "大きな長短シグナルなし",
    signals: uniqueSignals,
    events: uniqueEvents
  };
}

// 旧: 絶対(自己相対)判定。riseSemitones は録音内の early→final の自己相対な上昇量で、
// フラット(0st)を基準に判定するため、疑問文の自然な文末上昇まで「癖」として誤検出しやすい。
// モデル参照が使えない場合のみのフォールバックとして残し、buildSpeechFeatures 側で
// 低信頼度(trace)に格下げして音声への反映は抑える。
function classifyIntonationAgainstTargetLegacy(intonationFeatures, intonationTarget = {}) {
  if (!intonationFeatures?.available) return { status: "unknown", level: "unknown", label: "pitch unavailable" };
  const rise = Number(intonationFeatures.riseSemitones || 0);
  const expected = intonationTarget.expectedFinalContour || "neutral";
  const naturalRange = intonationTarget.naturalRiseRange || (expected === "moderate_rise" ? [1.2, 5.0] : [-1.5, 2.5]);
  const overRiseAbove = Number(intonationTarget.overRiseAbove ?? (expected === "moderate_rise" ? 5.0 : 4.5));
  const fallingBelow = Number(intonationTarget.fallingBelow ?? (expected === "moderate_rise" ? 0.3 : -2.5));
  const flatRange = intonationTarget.flatRange || [-0.5, 1.0];

  if (rise >= naturalRange[0] && rise <= naturalRange[1]) {
    return { status: "natural", level: "none", label: `natural ${rise.toFixed(1)}st` };
  }
  if (rise > overRiseAbove) {
    return { status: "over_rising", level: "high", label: `over-rising +${rise.toFixed(1)}st` };
  }
  if (rise >= flatRange[0] && rise <= flatRange[1]) {
    return { status: "flat_question", level: "low", label: `flat ${rise.toFixed(1)}st` };
  }
  if (rise < fallingBelow) {
    return { status: "falling_question", level: "medium", label: `falling ${rise.toFixed(1)}st` };
  }
  return { status: "borderline", level: "low", label: `borderline ${rise.toFixed(1)}st` };
}

// 新: モデル音声基準(deviation)判定。riseSemitones はここでは
// deviation(t) = userSemitone(t) - modelSemitone(t) の文末区間平均を表す
// (pitchAlignmentService.buildDeviationTimeline が同じ形状で供給する)。
// deviation ≈ 0 はモデルと同じ動き=自然という意味になるため、閾値は0を中心に対称。
function classifyIntonationDeviation(intonationFeatures, intonationTarget = {}) {
  if (!intonationFeatures?.available) return { status: "unknown", level: "unknown", label: "pitch unavailable" };
  const deviation = Number(intonationFeatures.riseSemitones || 0);
  const expected = intonationTarget.expectedFinalContour || "neutral";
  const abs = Math.abs(deviation);

  if (abs <= pitchThresholds.naturalToleranceSemitone) {
    return { status: "natural", level: "none", label: `model-relative natural Δ${deviation.toFixed(1)}st` };
  }
  if (abs <= pitchThresholds.strongDeviationSemitone) {
    return { status: "trace", level: "low", label: `model-relative trace Δ${deviation.toFixed(1)}st` };
  }
  if (deviation > 0) {
    return { status: "over_rising", level: "high", label: `model-relative over-rising Δ+${deviation.toFixed(1)}st` };
  }
  return expected === "moderate_rise"
    ? { status: "flat_question", level: "high", label: `model-relative flat Δ${deviation.toFixed(1)}st` }
    : { status: "falling_question", level: "medium", label: `model-relative falling Δ${deviation.toFixed(1)}st` };
}

function classifyIntonationAgainstTarget(intonationFeatures, intonationTarget = {}) {
  return intonationFeatures?.basis === "model-relative"
    ? classifyIntonationDeviation(intonationFeatures, intonationTarget)
    : classifyIntonationAgainstTargetLegacy(intonationFeatures, intonationTarget);
}

function buildIntonationSignals(intonationFeatures, intonationTarget) {
  if (!intonationFeatures?.available) {
    return { level: "unknown", label: "pitch unavailable", signals: [], events: [] };
  }

  const rise = Number(intonationFeatures.riseSemitones || 0);
  const classification = classifyIntonationAgainstTarget(intonationFeatures, intonationTarget);
  const contour = intonationFeatures?.contour || {};
  const contourRange = Number(contour.rangeSemitones || 0);
  const contourChanges = Number(contour.directionChanges || 0);
  const contourMoves = Array.isArray(contour.moves) ? contour.moves : [];
  const significantDirections = contourMoves.map((move) => move.direction).filter((direction) => direction === "rise" || direction === "fall");
  const hasRiseAndFall = significantDirections.includes("rise") && significantDirections.includes("fall");
  const finalMove = contourMoves.slice().reverse().find((move) => ["rise", "fall"].includes(move.direction));
  const finalMoveMagnitude = Math.abs(Number(finalMove?.semitones || 0));
  const hasFinalDirectionalMove = finalMove && finalMoveMagnitude >= 1.0;
  // deviation ベース(model-relative)の contour は pitchAlignmentService 側で
  // 既に pitchThresholds を使って pattern を判定済みなので、それをそのまま信頼する。
  // 自己相対フォールバック時のみ、旧来の再判定(マジックナンバー)を使う。
  const isModelRelative = intonationFeatures?.basis === "model-relative";
  const hasZigzag = isModelRelative
    ? contour.pattern === "zigzag"
    : contour.pattern === "zigzag" || contourChanges >= 2 || (hasRiseAndFall && contourRange >= 2.8);
  const hasPhraseMovement = !hasZigzag && (
    isModelRelative
      ? contour.pattern === "phrase_movement"
      : contourChanges >= 1
        || contourRange >= 2.6
        || (contour.pattern === "mixed" && contourRange >= 2.0)
        || hasFinalDirectionalMove
        || hasRiseAndFall
  );
  if (hasZigzag) {
    return {
      level: "high",
      label: `pitch zigzag ${contourChanges} changes / ${contourRange.toFixed(1)}st`,
      signals: ["intonation-zigzag"],
      events: [{
        key: "intonation:zigzag",
        type: "intonation",
        level: "high",
        strength: "strong",
        label: "文中の上昇下降が多すぎる",
        detail: `文中の音高変化が大きく、上昇下降の切り替わりが ${contourChanges} 回、音域差が約${contourRange.toFixed(1)}半音あります。聞き手にはかなり不自然な抑揚として届く候補です。`,
        action: "1語ごとに上げ下げせず、文全体で自然な流れを作る。"
      }],
      classification: { ...classification, status: "zigzag", level: "high", label: `zigzag ${contourChanges}` }
    };
  }

  if (hasPhraseMovement) {
    return {
      level: "medium",
      label: `pitch movement ${contourChanges} changes / ${contourRange.toFixed(1)}st`,
      signals: ["intonation-phrase-movement"],
      events: [{
        key: "intonation:phrase-movement",
        type: "intonation",
        level: "medium",
        strength: "medium",
        label: "文中の上げ下げが目立つ",
        detail: `文中の音高差が約${contourRange.toFixed(1)}半音あります。大きな誤りではありませんが、ネイティブには少し不自然な抑揚として届く候補です。`,
        action: "単語ごとに音程を作らず、意味のまとまり単位でなだらかに読む。"
      }],
      classification: { ...classification, status: "phrase_movement", level: "medium", label: `movement ${contourRange.toFixed(1)}st` }
    };
  }

  if (classification.status === "natural") {
    // deviation ≈ 0 は「モデルと一致」を意味するため、model-relative の場合はここで
    // 追加の「理想の絶対上昇量からのズレ」判定(自己相対専用の概念)は行わない。
    if (isModelRelative) {
      return { level: "none", label: classification.label, signals: [], events: [], classification };
    }
    const expected = intonationTarget?.expectedFinalContour || "neutral";
    const idealRise = expected === "moderate_rise" ? 2.8 : -0.8;
    const subtleGap = Math.abs(rise - idealRise);
    if (subtleGap >= 1.4) {
      return {
        level: "low",
        label: `${classification.label} / subtle gap ${subtleGap.toFixed(1)}st`,
        signals: ["intonation-trace"],
        events: [{
          key: "intonation:trace",
          type: "intonation",
          level: "low",
          strength: "weak",
          label: "抑揚に軽い非ネイティブ感",
          detail: `文末は許容範囲ですが、目標の自然な抑揚から約${subtleGap.toFixed(1)}半音ずれています。上級者の微妙な違和感として扱う候補です。`,
          action: "文末の上げ下げを大きく作らず、自然なモデル音声と比較する。"
        }],
        classification: { ...classification, status: "trace", level: "low", label: `trace ${subtleGap.toFixed(1)}st` }
      };
    }
    return {
      level: "none",
      label: classification.label,
      signals: [],
      events: [],
      classification
    };
  }

  const labels = isModelRelative
    ? {
        over_rising: "モデルより文尾が上がりすぎ",
        falling_question: "モデルより文尾が下がっている",
        flat_question: "モデルは上がるのに文尾が平坦",
        trace: "モデルとの軽いズレ",
        borderline: "文尾イントネーションを確認"
      }
    : {
        over_rising: "文尾上昇が強すぎる",
        falling_question: "疑問文なのに文尾が下がる",
        flat_question: "疑問文の文尾が平坦",
        borderline: "文尾イントネーションを確認"
      };
  const details = isModelRelative
    ? {
        over_rising: `モデル音声と比べて文末の音高が約${rise.toFixed(1)}半音高く動いています。モデルより上がりすぎで、不安げ・確認っぽく聞こえる候補です。`,
        falling_question: `モデル音声と比べて文末の音高が約${Math.abs(rise).toFixed(1)}半音低く動いています。モデルより下がっている候補です。`,
        flat_question: `モデル音声は文末で上昇していますが、この録音では約${Math.abs(rise).toFixed(1)}半音分その上昇が不足しています。疑問文の棒読み、または質問らしさが弱く聞こえる候補です。`,
        trace: `モデル音声との差は約${rise.toFixed(1)}半音で、許容範囲に近い軽いズレです。上級者の微妙な違和感として扱う候補です。`,
        borderline: `モデル音声との文末の差は約${rise.toFixed(1)}半音です。`
      }
    : {
        over_rising: `文末の音高が約${rise.toFixed(1)}半音上がっています。この疑問文では上がりすぎで、不安げ・確認っぽく聞こえる候補です。`,
        falling_question: `文末の音高が約${rise.toFixed(1)}半音下がっています。この疑問文では依頼・質問の感じが弱く聞こえる候補です。`,
        flat_question: `文末の音高変化が約${rise.toFixed(1)}半音で平坦です。この疑問文では棒読み、または質問らしさが弱く聞こえる候補です。`,
        borderline: `文末の音高変化は約${rise.toFixed(1)}半音です。目標イントネーションとの違いを確認してください。`
      };
  const actions = isModelRelative
    ? {
        over_rising: "文末だけを上げすぎず、モデル音声と同程度の上昇で録音し直す。",
        falling_question: "モデル音声の文末の動きに合わせて録音し直す。",
        flat_question: "モデル音声のように最後の一語を少し上げてみる。",
        trace: "モデル音声と聞き比べながら文末の上げ下げを微調整する。",
        borderline: "モデル音声と聞き比べて文末の動きを確認する。"
      }
    : {
        over_rising: "文末だけを上げすぎず、自然な軽い上昇で録音し直す。",
        falling_question: "疑問文らしく、文末を軽く上げる録音と聞き比べる。",
        flat_question: "最後の一語だけを少し上げ、質問として聞こえるか比べる。",
        borderline: "文末の上げ下げを意識して、自然な疑問文と聞き比べる。"
      };
  const strength = classification.level === "high" ? "strong" : "weak";
  return {
    level: classification.level,
    label: classification.label,
    signals: [`intonation-${classification.status}`],
    events: [{
      key: `intonation:${classification.status}`,
      type: "intonation",
      level: classification.level,
      strength,
      label: labels[classification.status] || labels.borderline,
      detail: details[classification.status] || details.borderline,
      action: actions[classification.status] || actions.borderline
    }],
    classification
  };
}

// 絶対ルール: trace/low信頼度の候補は分析表示のみとし、音声反映は原則しない。
// モデル参照が使えず自己相対(絶対)判定にフォールバックした場合、その判定はノイズが
// 大きく誤検出しやすいことが検証ログ(logs/validation-log.jsonl)で繰り返し指摘されている。
// そのためフォールバック時は強いステータス(zigzag/phrase_movement/over_rising等)であっても
// trace(表示のみ・低信頼度)に格下げし、ミラー音声への強い反映を避ける。
function downgradeFallbackIntonation(intonation, intonationFeatures) {
  if (intonationFeatures?.basis !== "self-relative-fallback") return intonation;
  const downgradeStatuses = ["zigzag", "phrase_movement", "over_rising", "falling_question", "flat_question", "borderline"];
  if (!downgradeStatuses.includes(intonation.classification?.status)) return intonation;
  return {
    ...intonation,
    level: "low",
    label: `(fallback) ${intonation.label}`,
    events: intonation.events.map((event) => ({ ...event, level: "low", strength: "weak" })),
    classification: { ...intonation.classification, status: "trace", level: "low" }
  };
}

function buildSpeechFeatures({ words, scores, consonantAvg, consonantMin, muffled, couldBlindSpot, recordingDurationMs, rhythmHints, intonationFeatures, intonationTarget }) {
  const wordCount = Math.max(1, words.filter((word) => word.word).length);
  const durationMs = estimateTimedSpeechMs(words, recordingDurationMs);
  const wpm = durationMs ? Math.round((wordCount / durationMs) * 60000) : null;
  const articulationDurationMs = estimateArticulationSpeechMs(words, rhythmHints);
  const articulationWpm = articulationDurationMs ? Math.round((wordCount / articulationDurationMs) * 60000) : null;
  const speed = classifySpeed(wpm);
  const articulationSpeed = classifySpeed(articulationWpm);
  const consonants = classifyConsonantWeakness(consonantAvg, consonantMin);
  const length = buildLengthAndPronunciationSignals(words);
  const linking = buildLinkingSignals(words);
  const boundaryPauses = supplementBoundaryPausesFromRhythm(words, buildBoundaryPauseSignals(words), rhythmHints);
  const localPauseCount = Number(rhythmHints?.localPauseCount || 0);
  const localMaxPauseMs = Number(rhythmHints?.localMaxPauseMs || 0);
  const segmentedDelivery = boundaryPauses.events.some((event) => ["expected_linking_break", "word_boundary_pause"].includes(event.type))
    || (localPauseCount >= 2 && localMaxPauseMs >= 170);
  const voiceSpeed = combineVoiceSpeed({ overallSpeed: speed, articulationSpeed, segmentedDelivery: segmentedDelivery && articulationWpm });
  const intonation = downgradeFallbackIntonation(buildIntonationSignals(intonationFeatures, intonationTarget), intonationFeatures);
  const articulationEvents = [...boundaryPauses.events, ...linking.events, ...length.events];
  const pronunciationEvents = [...articulationEvents, ...intonation.events];
  const lengthSignals = [...new Set([...boundaryPauses.signals, ...linking.signals, ...length.signals])];
  const fillerWords = words
    .filter((word) => ["well", "ah", "uh", "um", "er", "hmm"].includes(String(word.word || "").toLowerCase()))
    .map((word) => word.original || word.word);
  const strongSignalCount = articulationEvents.filter(eventIsStrong).length;
  const lengthLevel = strongSignalCount >= 2 ? "high" : strongSignalCount === 1 ? "medium" : articulationEvents.length ? "low" : "none";
  const prosody = Number(scores.prosody || 0);
  const accuracy = Number(scores.accuracy || 0);
  const pronunciation = Number(scores.pronunciation || 0);
  const highScoreNaturalCandidate = accuracy >= 90 && pronunciation >= 88 && prosody >= 75;
  const nearNaturalCandidate = accuracy >= 84 && pronunciation >= 82 && prosody >= 80;
  const moderateCandidate = accuracy >= 75 && pronunciation >= 78 && prosody >= 75;
  const rawIntonationStatus = intonation.classification?.status || "unknown";
  const voiceIntonationStatus = highScoreNaturalCandidate && ["zigzag", "phrase_movement", "trace"].includes(rawIntonationStatus)
    ? "natural"
    : rawIntonationStatus;
  const avgConsonant = consonantAvg === null || consonantAvg === undefined ? null : Number(consonantAvg);
  const minConsonant = consonantMin === null || consonantMin === undefined ? null : Number(consonantMin);
  const effectiveMuffled = muffled && !(
    nearNaturalCandidate
    && (avgConsonant === null || avgConsonant >= 80)
    && (minConsonant === null || minConsonant >= 45)
  );
  const consonantVoiceEvents = pronunciationEvents.filter((event) => ["final-consonant", "liquid", "alignment"].includes(event.type));
  const strongConsonantVoiceCount = consonantVoiceEvents.filter(eventIsStrong).length;
  const articulationMirrorLevel = effectiveMuffled || (!moderateCandidate && consonants.level === "high" && (strongConsonantVoiceCount >= 2 || (minConsonant !== null && minConsonant < 35) || (avgConsonant !== null && avgConsonant < 50)))
    ? "unclear"
    : !nearNaturalCandidate && (consonants.level === "high" || consonants.level === "medium" || strongConsonantVoiceCount >= 2)
      ? "soft"
      : "clear";
  const effectiveIntonationLevel = highScoreNaturalCandidate && intonation.level === "high" ? "low" : intonation.level;
  const ambiguityLevel = highScoreNaturalCandidate
    ? articulationMirrorLevel === "soft" || lengthLevel === "high" ? "medium" : "low"
    : !nearNaturalCandidate && (couldBlindSpot || effectiveMuffled || articulationMirrorLevel === "unclear" || effectiveIntonationLevel === "high" || prosody < 55)
    ? "high"
    : articulationMirrorLevel === "soft" || lengthLevel === "high" || lengthLevel === "medium" || (!nearNaturalCandidate && effectiveIntonationLevel === "low") || prosody < 70
      ? "medium"
      : "low";
  const voiceMirrorLevel = articulationMirrorLevel === "unclear" || accuracy < 70 || prosody < 50
    ? "unclear"
    : articulationMirrorLevel === "soft" || ambiguityLevel === "medium" || accuracy < 84 || prosody < 72
      ? "soft"
      : accuracy < 96 || prosody < 92 || consonants.level === "low" || lengthLevel === "low"
        ? "trace"
      : "clear";

  return {
    wordCount,
    durationMs,
    articulationDurationMs,
    wpm,
    articulationWpm,
    accuracyScore: accuracy,
    pronunciationScore: pronunciation,
    prosodyScore: prosody,
    nativeReferenceWpm: "130-160",
    speedLevel: speed.level,
    speedLabel: speed.label,
    articulationSpeedLevel: articulationSpeed.level,
    articulationSpeedLabel: articulationSpeed.label,
    voiceSpeedLevel: voiceSpeed.level,
    voiceSpeedLabel: voiceSpeed.label,
    voiceRate: japaneseMirrorRateForSpeed(voiceSpeed.level),
    consonantWeaknessLevel: consonants.level,
    consonantWeaknessLabel: consonants.label,
    ambiguityLevel,
    voiceMirrorLevel,
    articulationMirrorLevel,
    intonationLevel: effectiveIntonationLevel,
    intonationLabel: intonation.label,
    intonationStatus: voiceIntonationStatus,
    intonationTarget,
    intonationFeatures,
    pitchContour: intonationFeatures?.contour || null,
    rhythmHints: rhythmHints || {},
    boundaryPauseLevel: boundaryPauses.level,
    boundaryPauseLabel: boundaryPauses.label,
    boundaryPauseEvents: boundaryPauses.events,
    fillerWords,
    hasFiller: fillerWords.length > 0,
    lengthSignal: lengthSignals.length ? lengthSignals.join(", ") : "no length/linking signal",
    lengthLevel,
    lengthSignals,
    pronunciationEvents,
    notes: [
      wpm ? `overall WPM ${wpm} / native reference 130-160` : "overall WPM unavailable",
      articulationWpm ? `articulation WPM ${articulationWpm}` : "articulation WPM unavailable",
      `voice speed:${voiceSpeed.label}`,
      `consonants:${consonants.label}`,
      `pauses:${boundaryPauses.label}`,
      `length/linking:${lengthSignals.length ? lengthSignals.join(", ") : "none"}`,
      `intonation:${intonation.label}`,
      `ambiguity:${ambiguityLevel}`
    ]
  };
}

function applyMeaningPauses(text, speechFeatures) {
  const source = String(text || "");
  const pauses = speechFeatures?.boundaryPauseEvents || [];
  if (!pauses.length) return source;

  const hasStrongPause = pauses.some((event) => event.strength === "strong");
  const mark = hasStrongPause ? "……" : "、";
  if (source.includes("手伝ってもらえ")) return source.replace("手伝ってもらえ", `手伝って${mark}もらえ`);
  if (source.includes("してもらえ")) return source.replace("してもらえ", `して${mark}もらえ`);
  return `${mark}${source}`;
}

function classifyMeaningCollapse({ meaning, severity, muffled, speechFeatures }) {
  if (!meaning || meaning.alternateWordHearing || meaning.source === "freeRecognition") return "none";

  const events = speechFeatures?.pronunciationEvents || [];
  const consonantEvents = events.filter((event) => ["final-consonant", "liquid", "alignment"].includes(event.type));
  const strongConsonantEvents = consonantEvents.filter(eventIsStrong);
  const articulation = speechFeatures?.articulationMirrorLevel || "clear";
  const voice = speechFeatures?.voiceMirrorLevel || "clear";
  const weakness = speechFeatures?.consonantWeaknessLevel || "none";
  const ambiguity = speechFeatures?.ambiguityLevel || "low";
  const accuracy = Number(speechFeatures?.accuracyScore || 0);
  const pronunciation = Number(speechFeatures?.pronunciationScore || 0);
  const highScoreMinorIssue = accuracy >= 88 && pronunciation >= 90 && !muffled && strongConsonantEvents.length === 0;
  const nearNaturalCandidate = accuracy >= 84 && pronunciation >= 82 && Number(speechFeatures?.prosodyScore || 0) >= 80;
  const moderateCandidate = accuracy >= 75 && pronunciation >= 78 && Number(speechFeatures?.prosodyScore || 0) >= 75;

  if (highScoreMinorIssue || nearNaturalCandidate || (moderateCandidate && speechFeatures?.intonationStatus === "zigzag")) return "none";

  if (
    articulation === "unclear"
    && weakness === "high"
    && (muffled || voice === "unclear" || ambiguity === "high" || strongConsonantEvents.length >= 2 || severity === "high")
  ) {
    return "strong";
  }
  if (
    articulation === "unclear"
    || (articulation === "soft" && weakness !== "none")
    || strongConsonantEvents.length >= 2
  ) {
    return "medium";
  }
  return "none";
}

function buildVoicePlan({ meaning, severity, muffled, speechFeatures, soundSignature }) {
  const voiceSpeedLevel = effectiveVoiceSpeedLevel(speechFeatures);
  const speedSource = voiceSpeedLevel === (speechFeatures.voiceSpeedLevel || speechFeatures.speedLevel)
    ? (speechFeatures.voiceSpeedLabel || speechFeatures.speedLabel || "未測定")
    : classifySpeed({ very_slow: 80, slow: 110, natural: 160, fast: 250, very_fast: 320 }[voiceSpeedLevel]).label;
  const speed = {
    level: voiceSpeedLevel,
    label: speedSource,
    rate: japaneseMirrorRateForSpeed(voiceSpeedLevel)
  };
  const strongConsonantEvents = (speechFeatures.pronunciationEvents || []).filter((event) => ["final-consonant", "liquid", "alignment"].includes(event.type) && eventIsStrong(event));
  const consonantEvents = (speechFeatures.pronunciationEvents || []).filter((event) => ["final-consonant", "liquid", "alignment"].includes(event.type));
  const strongSoundConsonants = (soundSignature?.weakPhones || []).filter((item) => item.class !== "vowel" && Number(item.score || 100) < 55);
  const highScoreMinorIssue = Number(speechFeatures?.accuracyScore || 0) >= 88
    && Number(speechFeatures?.pronunciationScore || 0) >= 90
    && !muffled
    && strongConsonantEvents.length === 0
    && strongSoundConsonants.length === 0;
  const nearNaturalCandidate = Number(speechFeatures?.accuracyScore || 0) >= 84
    && Number(speechFeatures?.pronunciationScore || 0) >= 82
    && Number(speechFeatures?.prosodyScore || 0) >= 80
    && !muffled;
  const unclearArticulation = speechFeatures.articulationMirrorLevel === "unclear" && (
    muffled
    || speechFeatures.consonantWeaknessLevel === "high"
    || speechFeatures.voiceMirrorLevel === "unclear"
    || strongConsonantEvents.length >= 1
    || (soundSignature?.level === "high" && strongSoundConsonants.length >= 2)
  );
  const softArticulation = !highScoreMinorIssue && !nearNaturalCandidate && !unclearArticulation && speechFeatures.articulationMirrorLevel === "soft" && (
    speechFeatures.consonantWeaknessLevel === "medium"
    || speechFeatures.consonantWeaknessLevel === "high"
    || consonantEvents.length >= 1
    || ["low", "medium"].includes(soundSignature?.level)
  );
  const boundaryPauseOnly = speechFeatures.boundaryPauseLevel !== "none"
    && speechFeatures.consonantWeaknessLevel === "none"
    && !muffled
    && severity !== "high";
  const needsHesitation = speechFeatures.ambiguityLevel === "high" || severity === "high" || muffled;
  const prefix = "";
  const consonantPause = "";
  const pausedJapanese = applyMeaningPauses(meaning.japanese, speechFeatures);
  const meaningText = pausedJapanese;
  const meaningCollapseLevel = classifyMeaningCollapse({ meaning, severity, muffled, speechFeatures });
  const intonationPattern = {
    over_rising: "final-rise",
    falling_question: "final-fall",
    zigzag: "pitch-zigzag",
    phrase_movement: "pitch-movement",
    flat_question: "flat",
    trace: "plain",
    borderline: "plain",
    natural: "plain"
  }[speechFeatures.intonationStatus] || (needsHesitation && !boundaryPauseOnly ? "hesitation" : "plain");

  return {
    text: `${prefix}${consonantPause}${meaningText}`,
    rate: speed.rate,
    pitch: speechFeatures.intonationStatus === "over_rising" ? "+12%" : speechFeatures.intonationStatus === "falling_question" ? "-12%" : ["zigzag", "phrase_movement"].includes(speechFeatures.intonationStatus) ? "+0%" : speechFeatures.intonationStatus === "trace" ? "+2%" : unclearArticulation ? "-5%" : speechFeatures.voiceMirrorLevel === "trace" ? "-2%" : "+0%",
    volume: unclearArticulation ? "x-soft" : softArticulation ? "soft" : "default",
    articulation: unclearArticulation ? "unclear" : softArticulation ? "soft" : "clear",
    pausePattern: intonationPattern,
    appliedSignals: [
      `speed:${speechFeatures.speedLevel}`,
      `articulationSpeed:${speechFeatures.articulationSpeedLevel}`,
      `voiceSpeed:${speechFeatures.voiceSpeedLevel}`,
      `consonants:${speechFeatures.consonantWeaknessLevel}`,
      `pauses:${speechFeatures.boundaryPauseLevel}`,
      `length:${speechFeatures.lengthLevel}`,
      `intonation:${speechFeatures.intonationLevel}`,
      `filler:${speechFeatures.hasFiller ? speechFeatures.fillerWords.join(",") : "none"}`,
      `ambiguity:${speechFeatures.ambiguityLevel}`,
      `voiceMirror:${speechFeatures.voiceMirrorLevel}`,
      `articulationMirror:${speechFeatures.articulationMirrorLevel}`,
      `articulation:${unclearArticulation ? "unclear" : softArticulation ? "soft" : "clear"}`,
      `meaningCollapse:${meaningCollapseLevel}`,
      `sound:${soundSignature?.summary || "none"}`
    ],
    meaningCollapseLevel
  };
}

function buildTargetActions(speechFeatures, severeWords, conservative) {
  const eventActions = (speechFeatures?.pronunciationEvents || [])
    .map((event) => event.action)
    .filter(Boolean);
  if (conservative && eventActions.length) {
    return [...new Set(eventActions)].slice(0, 2);
  }
  const fallbackActions = severeWords.length
    ? severeWords.map((word) => `${word} の子音の輪郭を残す。`)
    : [];

  return [...new Set([...eventActions, ...fallbackActions])].slice(0, 4);
}

function buildMirroredWords(words, speechFeatures, context) {
  const linkingEvent = (speechFeatures.pronunciationEvents || []).find((event) => event.key === "could-you:linking");
  const mirroredWords = [];

  for (let i = 0; i < words.length; i += 1) {
    const current = words[i];
    const next = words[i + 1];
    if (linkingEvent && current?.word === "could" && next?.word === "you") {
      const text = linkingEvent.mirrorText || "クッユー(?)";
      mirroredWords.push({
        word: "could-you",
        original: "Could you",
        text,
        severity: linkingEvent.strength === "weak" ? "low" : "medium",
        reason: `Could you の連結が「${text.replace(/[()?]/g, "")}」寄りに聞こえる候補です。`,
        conservative: linkingEvent.strength === "weak",
        linking: true,
        sourceWordIndex: i,
        pauseAfterIndex: i + 1,
        spanWordIndices: [i, i + 1]
      });
      i += 1;
      continue;
    }
    mirroredWords.push({
      word: current?.word,
      original: current?.original,
      ...mirrorWord(current, { ...context, pronunciationEvents: speechFeatures.pronunciationEvents || [] }),
      sourceWordIndex: i,
      pauseAfterIndex: i,
      spanWordIndices: [i]
    });
  }

  return mirroredWords;
}

function composePhoneticText(mirroredWords, speechFeatures) {
  const pauses = speechFeatures?.boundaryPauseEvents || [];
  if (!mirroredWords.length) return "";
  const pauseByIndex = new Map(pauses.map((pause) => [pause.afterWordIndex, pause]));

  return mirroredWords.map((word, index) => {
    if (index === mirroredWords.length - 1) return word.text;
    const pause = pauseByIndex.get(index);
    if (!pause) return `${word.text} `;
    return pause.strength === "strong" ? `${word.text} / ` : `${word.text}、`;
  }).join("").replace(/\s+/g, " ").trim();
}

function buildPhonemeTimeline(words) {
  return words.map((word, wordIndex) => {
    const start100ns = wordStart100ns(word);
    const duration100ns = Number(word.duration100ns || 0);
    const phones = (word.phones || []).map((phone) => ({
      phone: String(phone.phone || ""),
      score: Math.round(phoneScoreValue(phone)),
      startMs: Number.isFinite(Number(phone.offset100ns)) ? Math.round(Number(phone.offset100ns) / 10000) : null,
      durationMs: phoneMs(phone),
      class: isVowelPhone(phone.phone) ? "vowel" : "consonant"
    }));

    return {
      wordIndex,
      word: word.original || word.word,
      normalized: word.word,
      score: Math.round(Number(word.score || 0)),
      errorType: word.errorType || "None",
      startMs: start100ns === null ? null : Math.round(start100ns / 10000),
      durationMs: duration100ns > 0 ? Math.round(duration100ns / 10000) : null,
      phones,
      // 英単語がどの日本語ミラーの「役割(role)」に対応するかの静的な対応表。
      // voiceScript.segments[].role と突き合わせることで、フロントエンドが
      // 英語原文とミラー読み上げ文の対応箇所を色分けできるようにする。
      roles: japaneseRolesForEnglishWord(word.word, "")
    };
  });
}

function buildJapaneseMirrorTimeline(words, mirroredWords, speechFeatures) {
  // mirroredWords は Could+you のような連結ペアを1件にまとめる場合があり、
  // words 配列と要素数がズレる。ループの index をそのまま words[] の添字として
  // 使うと、連結が発生した文で以降の単語すべての sourceWord/kana が1つずつ
  // ズレてしまう(例: help の判定が you の欄に、me の判定が help の欄に出る)。
  // mirrorWord 生成時に記録した sourceWordIndex/pauseAfterIndex を使う。
  const pauseByIndex = new Map((speechFeatures?.boundaryPauseEvents || []).map((pause) => [pause.afterWordIndex, pause]));
  return mirroredWords.map((mirror, index) => {
    const sourceIndex = Number.isInteger(mirror.sourceWordIndex) ? mirror.sourceWordIndex : index;
    const pauseIndex = Number.isInteger(mirror.pauseAfterIndex) ? mirror.pauseAfterIndex : index;
    const source = words[sourceIndex] || {};
    const pauseAfter = pauseByIndex.get(pauseIndex);
    return {
      wordIndex: sourceIndex,
      spanWordIndices: Array.isArray(mirror.spanWordIndices) ? mirror.spanWordIndices : [sourceIndex],
      sourceWord: source.original || source.word || "",
      kana: mirror.text,
      severity: mirror.severity || "ok",
      reason: mirror.reason || "",
      startMs: wordStart100ns(source) === null ? null : Math.round(wordStart100ns(source) / 10000),
      durationMs: Number(source.duration100ns || 0) > 0 ? Math.round(Number(source.duration100ns) / 10000) : null,
      pauseAfterMs: pauseAfter?.gapMs || 0,
      pauseAfterStrength: pauseAfter?.strength || "none"
    };
  });
}

function buildPitchOverlay(speechFeatures) {
  const pitch = speechFeatures?.intonationFeatures || {};
  return {
    available: Boolean(pitch.available),
    basis: pitch.basis || "unknown",
    status: speechFeatures?.intonationStatus || "unknown",
    label: speechFeatures?.intonationLabel || "pitch unavailable",
    earlyHz: pitch.earlyHz ?? null,
    finalHz: pitch.finalHz ?? null,
    riseSemitones: pitch.riseSemitones ?? null,
    modelMedianHz: pitch.modelMedianHz ?? null,
    userMedianHz: pitch.userMedianHz ?? null
  };
}

function buildMirrorTimeline({ words, mirroredWords, speechFeatures }) {
  const speedLevel = effectiveVoiceSpeedLevel(speechFeatures);
  return {
    version: "0.2",
    purpose: "phoneme-kana-timing-pitch intermediate representation",
    phonemeTimeline: buildPhonemeTimeline(words),
    japaneseMirrorTimeline: buildJapaneseMirrorTimeline(words, mirroredWords, speechFeatures),
    rhythm: {
      wpm: speechFeatures.wpm,
      articulationWpm: speechFeatures.articulationWpm,
      overallSpeedLevel: speechFeatures.speedLevel,
      articulationSpeedLevel: speechFeatures.articulationSpeedLevel,
      speedLevel,
      boundaryPauses: speechFeatures.boundaryPauseEvents || []
    },
    pitchOverlay: buildPitchOverlay(speechFeatures)
  };
}

function soundClassForPhone(phone) {
  const value = String(phone || "").toLowerCase();
  if (/[pbtdkg]/.test(value) || value.includes("tʃ") || value.includes("dʒ")) return "stop";
  if (/[fvszʃʒhθð]/.test(value) || value.includes("sh") || value.includes("th")) return "fricative";
  if (/[lr]/.test(value)) return "liquid";
  if (/[mnŋ]/.test(value)) return "nasal";
  if (isVowelPhone(value)) return "vowel";
  return "other";
}

function buildSoundSignature(words) {
  const weakPhones = [];
  const allPhones = [];
  (words || []).forEach((word) => {
    (word.phones || []).forEach((phone) => {
      const phoneName = String(phone.phone || "");
      const score = phoneScoreValue(phone);
      allPhones.push({
        word: word.word,
        original: word.original || word.word,
        phone: phoneName,
        score: Math.round(score),
        wordScore: Number(word.score ?? 100),
        durationMs: phoneMs(phone),
        class: soundClassForPhone(phoneName),
        position: phone === word.phones[word.phones.length - 1] ? "final" : "inside"
      });
      if (score >= 72) return;
      weakPhones.push({
        word: word.word,
        original: word.original || word.word,
        phone: phoneName,
        score: Math.round(score),
        durationMs: phoneMs(phone),
        class: soundClassForPhone(phoneName),
        position: phone === word.phones[word.phones.length - 1] ? "final" : "inside"
      });
    });
  });

  const count = (klass) => weakPhones.filter((item) => item.class === klass).length;
  const weakest = weakPhones.slice().sort((a, b) => a.score - b.score)[0] || null;
  const strongCount = weakPhones.filter((item) => item.score < 55).length;
  const longPhones = allPhones.filter((item) => Number(item.durationMs || 0) >= 240);

  // 二重母音・r音化母音(aɪ, oʊ, ɪɹ, ɜːr など、IPA表記が2文字以上になる母音)は、
  // 単純母音(ɪ, ɛ, æ など)よりも発音として自然に長くなる(グライドする分の時間が
  // かかる)。加えて、文末の語(here など)は英語として自然な文末伸長(phrase-final
  // lengthening)が起きる。この2つは絶対的な閾値だけではいくら上げても際限なく
  // 誤検出が起きる(実機フィードバックで、220ms→340ms→450msと閾値を上げても、
  // score94〜97の綺麗な発音の"i"/"here"がそのたびにカタカナ判定される実害が
  // 3回連続で確認された)。根本的に、絶対長さは「日本語のモーラが足されたのか」
  // 「単に英語として自然に長い音なのか」を区別できない。
  //
  // そのため、Azure自身の音素スコアが高い(=音の質そのものは正しいとAzureが
  // 判断している)場合は、よほど極端な長さでない限り疑わない方針に切り替える。
  // スコアが低め(質そのものに疑いがある)場合は、これまで通りの閾値で反映する。
  const isComplexVowelPhone = (phoneName) => String(phoneName || "").length >= 2;
  const vowelDurationBar = (item) => (isComplexVowelPhone(item.phone) ? 340 : 220);
  const HIGH_PHONE_SCORE_BAR = 92;
  const EXTREME_DURATION_MS = { vowel: 650, stop: 260, other: 220 };
  // r音化母音(ɪɹ など)はAzureの音素単体スコアが実際の発音の良し悪しより低めに
  // 出やすい(実機フィードバック: word score 97でもɪɹ単体は86止まりだった)。
  // 単語全体としてAzureが高評価している場合は、その音素単体のスコアだけで
  // 「質に疑いあり」と判断しない(単語スコアと音素スコアの高い方を採用する)。
  const isPhoneEffectivelyHighScore = (item) => Math.max(Number(item.score ?? 100), Number(item.wordScore ?? 100)) >= HIGH_PHONE_SCORE_BAR;
  const isLongVowel = (item) => {
    if (item.class !== "vowel") return false;
    const dur = Number(item.durationMs || 0);
    return isPhoneEffectivelyHighScore(item) ? dur >= EXTREME_DURATION_MS.vowel : dur >= vowelDurationBar(item);
  };
  const longVowels = allPhones.filter(isLongVowel);
  const longStops = allPhones.filter((item) => item.class === "stop" && Number(item.durationMs || 0) >= 120);

  // カタカナ発音(母音追加)は「単語1つの中で複数の音が伸びる/保持される」パターンで、
  // 文全体のどこかに1音だけ長い箇所があるのとは区別する必要がある。
  // 実機テストで、同じ p の長さ(約190ms)でも
  // - l も約120ms と長い場合(「ヘルプ」のようなカタカナ発音) → カタカナ扱いが正しい
  // - l は約30msと短い場合(「ヘプ」のような子音圧縮/弱化) → 子音欠落/弱化として扱うべき
  // という違いが確認された。単語内で「長い音」がisLong的が2つ以上ある場合のみ、
  // その単語をカタカナ発音候補とする(1音だけの長さは伸長の根拠にしない)。
  const isLongForWordSignature = (item) => {
    if (item.class === "vowel") return isLongVowel(item);
    const dur = Number(item.durationMs || 0);
    const scoreIsHigh = isPhoneEffectivelyHighScore(item);
    if (item.class === "stop") return scoreIsHigh ? dur >= EXTREME_DURATION_MS.stop : dur >= 120;
    return scoreIsHigh ? dur >= EXTREME_DURATION_MS.other : dur >= 100;
  };
  const katakanaHeavyWords = new Set();
  // 「英語側でどのくらいの割合が実際に崩れていたか」を、対応する日本語ミラーの
  // 反映強度に比例させるための土台。単語ごとに「全体の発話時間」「弱い(score<72)
  // 音素の時間」「長い(カタカナ的に伸びる)音素の時間」を集計しておき、色分けグループ
  // (=役割roleを共有する語句のまとまり)単位で weakMs/totalMs, longMs/totalMs の
  // 割合を後段(katakanaDeliveryStrengthForRole, localConsonantOmissionForVoice)で
  // 計算できるようにする。
  const wordDurationTotals = {};
  new Set(allPhones.map((item) => item.word)).forEach((wordKey) => {
    const wordPhones = allPhones.filter((item) => item.word === wordKey);
    const wordLongVowels = wordPhones.filter(isLongVowel);
    const wordLongPhones = wordPhones.filter(isLongForWordSignature);
    if (wordLongVowels.length >= 1 || wordLongPhones.length >= 2) katakanaHeavyWords.add(wordKey);
    wordDurationTotals[wordKey] = {
      totalMs: wordPhones.reduce((sum, item) => sum + Number(item.durationMs || 0), 0),
      weakMs: wordPhones.filter((item) => item.score < 72).reduce((sum, item) => sum + Number(item.durationMs || 0), 0),
      longMs: wordLongPhones.reduce((sum, item) => sum + Number(item.durationMs || 0), 0)
    };
  });
  const katakanaVowelHeavy = katakanaHeavyWords.size > 0;
  return {
    weakPhones,
    longPhones,
    longVowels,
    longStops,
    weakest,
    stopWeakness: count("stop"),
    fricativeWeakness: count("fricative"),
    liquidWeakness: count("liquid"),
    nasalWeakness: count("nasal"),
    vowelWeakness: count("vowel"),
    strongCount,
    katakanaVowelHeavy,
    katakanaHeavyWords,
    wordDurationTotals,
    level: strongCount >= 2 || (weakest && weakest.score < 40) ? "high" : weakPhones.length >= 2 ? "medium" : weakPhones.length ? "low" : "none",
    summary: weakPhones.length
      ? weakPhones.map((item) => `${item.original}:${item.phone}/${item.score}/${item.class}`).join(", ")
      : "no weak phoneme"
  };
}

function timeRangeMsForWord(word) {
  const start = wordStart100ns(word);
  const end = wordEnd100ns(word);
  if (start === null || end === null) return null;
  return {
    startMs: Math.round(start / 10000),
    endMs: Math.round(end / 10000)
  };
}

function vowelPhoneCountForWord(word) {
  return (word?.phones || []).filter((phone) => isVowelPhone(phone.phone)).length;
}

function syllablePositionForPhone(word, phoneName) {
  const phones = word?.phones || [];
  if (!phones.length) return { scope: "word", fraction: 0.5, slot3: null, syllables: 1 };
  const vowelCount = Math.max(1, vowelPhoneCountForWord(word));
  if (vowelCount <= 1) return { scope: "whole", fraction: 0.5, slot3: null, syllables: vowelCount };

  const targetPhone = String(phoneName || "").toLowerCase();
  const phoneIndex = Math.max(0, phones.findIndex((phone) => String(phone.phone || "").toLowerCase() === targetPhone));
  const index = phoneIndex >= 0 ? phoneIndex : Math.floor(phones.length / 2);
  const fraction = phones.length <= 1 ? 0.5 : Math.max(0, Math.min(1, index / (phones.length - 1)));
  return {
    scope: "syllable",
    fraction,
    slot3: Math.max(0, Math.min(2, Math.floor(fraction * 3))),
    syllables: vowelCount
  };
}

function phoneNameFromPronunciationEvent(event) {
  const key = String(event?.key || "");
  const match = key.match(/^[^:]+:([a-zɑɪʊəɛæɔɜʌθðʃʒŋ]+)-/i);
  return match ? match[1] : "";
}

// r/l など、聞き間違えると別の実在単語になる紛らわしい単語ペア。
// データとして持つことで、新しいペアの追加は表の1行追加だけで済み、コード側の
// 分岐を増やす必要がない(alternateWordMeaningFromPronunciationのような文全体
// 単位のハードコードとは違い、単語単位でどの練習文にも適用できる)。
const CONFUSABLE_WORD_PAIRS = {
  light: { alternate: "right", alternateJapanese: "右" },
  right: { alternate: "light", alternateJapanese: "軽い" },
  correct: { alternate: "collect", alternateJapanese: "集める" },
  collect: { alternate: "correct", alternateJapanese: "正しい" },
  grass: { alternate: "glass", alternateJapanese: "ガラス" },
  glass: { alternate: "grass", alternateJapanese: "芝生" },
  road: { alternate: "load", alternateJapanese: "荷物" },
  load: { alternate: "road", alternateJapanese: "道" }
};

function japaneseRolesForEnglishWord(word) {
  const value = String(word || "").toLowerCase();
  const roles = new Set();

  if (["help", "teach", "pass", "work", "see", "live", "leave", "consider", "love"].includes(value)) {
    roles.add("request-action");
    roles.add("predicate");
    roles.add("predicate-head");
  }
  if (["me", "him", "her", "us", "them", "you"].includes(value)) {
    roles.add("request-object");
    roles.add("object");
    roles.add("request-ending");
  }
  if (["phone", "number", "salt", "pen", "today", "tomorrow", "here", "it",
    "light", "right", "correct", "collect", "grass", "glass", "road", "load"].includes(value)) {
    roles.add("request-object");
    roles.add("object");
    roles.add("time");
    roles.add("predicate-ending");
  }
  if (["could", "can", "will", "have", "to"].includes(value)) {
    roles.add("request-ending");
    roles.add("predicate-ending");
  }
  // 以前は meaning が「私は」「彼女」で始まるだけで、文中の全ての単語に
  // subject roleを付けてしまっていた(i/sheでない単語にまで主語セグメントへの
  // 反映が付いてしまう実害があった)。単語自体が i/she の場合だけに限定する。
  if (["i", "she"].includes(value)) {
    roles.add("subject");
  }
  if (!roles.size) roles.add("sentence");
  return [...roles];
}

function issueTypeForPronunciationEvent(event) {
  const type = String(event?.type || "");
  if (type === "word_boundary_pause" || type === "expected_linking_break") return "pause_or_unlinked";
  // r/l の弱さは「別の子音に置き換わって聞こえる」性質が強く、他の子音弱化
  // (h/p/sなどが単に落ちる)とは別カテゴリとして扱う(絶対ルール: 別種類の
  // 癖に置き換えない、を守るため、混同せず区別する)。
  if (type === "liquid") return "liquid_confusion";
  if (type === "initial-consonant" || type === "final-consonant" || type === "alignment") return "consonant_or_phonics";
  if (type === "length") return "length";
  if (type === "linking") return "linking";
  if (type === "intonation") return "intonation";
  if (type === "phonics_trace") return "subtle_phonics_trace";
  return type || "pronunciation_event";
}

function mirrorActionForLocalEvent(issueType, event) {
  if (issueType === "pause_or_unlinked") return "該当する日本語の区切りだけに短い間を入れる。全体を遅くしない。";
  if (issueType === "katakana_delivery") return "子音を欠落させず、該当する日本語を粒立てて母音つきに聞こえるようにする。";
  if (issueType === "consonant_or_phonics") return "該当する語句だけ子音の輪郭を少し弱める。別種類の癖には置き換えない。";
  if (issueType === "liquid_confusion") return "該当する語句の子音を、別の子音に置き換わって聞こえる形(清音→濁音)で反映する。母音だけにする弱化とは区別する。";
  if (issueType === "length") return "該当する母音・語尾だけを少し伸ばす。文全体を崩さない。";
  if (issueType === "linking") return "該当する語句だけを少し連結して聞こえるようにする。";
  if (issueType === "intonation") return String(event?.key || "").includes("zigzag")
    ? "音程変化を局所的な上下として扱う。ただし声質を変えず、過剰な別声化はしない。"
    : "文末または該当句だけの上昇下降として扱う。";
  if (issueType === "subtle_phonics_trace") return "自然さは保ったまま、該当語句だけに軽い非ネイティブ感を残す。";
  return "該当箇所だけに反映する。";
}

// CONFUSABLE_WORD_PAIRS に載っている単語について、r/l などの弱さや自由認識結果から
// 「別の実在単語として聞こえた可能性」を検出する。文全体単位ではなく単語単位の
// チェックなので、この単語が登場するどの練習文にも自動的に適用できる。
function confusableWordLocalEvents(words, meaningJapanese, freeRecognizedText) {
  const freeWords = new Set(sentenceMeaningKey(freeRecognizedText).split(" ").filter(Boolean));
  const events = [];
  (words || []).forEach((word, index) => {
    const key = String(word.word || "").toLowerCase();
    const pair = CONFUSABLE_WORD_PAIRS[key];
    if (!pair) return;
    const liquidPhone = (word.phones || []).find((phone) => soundClassForPhone(phone.phone) === "liquid");
    const liquidScore = liquidPhone ? phoneScoreValue(liquidPhone) : null;
    const heardInFreeRecognition = freeWords.has(pair.alternate);
    const weakLiquid = liquidScore !== null && liquidScore < 60;
    if (!heardInFreeRecognition && !weakLiquid) return;

    events.push({
      id: `alternate-${index + 1}-${key}`,
      source: "confusableWordPair",
      issueType: "alternate_word_local",
      word: word.original || key,
      timeRangeMs: timeRangeMsForWord(word),
      syllablePosition: { scope: "word", fraction: 0.5, slot3: null, syllables: 1 },
      severity: heardInFreeRecognition || (liquidScore !== null && liquidScore < 45) ? "high" : "medium",
      confidence: heardInFreeRecognition ? "high" : "medium",
      targetRoles: japaneseRolesForEnglishWord(key, meaningJapanese),
      alternateWord: pair.alternate,
      alternateJapanese: pair.alternateJapanese,
      englishEvidence: heardInFreeRecognition
        ? `自由認識で「${pair.alternate}」寄りに聞こえています。`
        : `${word.original || key} の r/l が score ${Math.round(liquidScore)}。「${pair.alternate}」寄りに聞こえる候補です。`,
      mirrorAction: `該当語句を「${pair.alternateJapanese}」の和訳に置き換えて反映する。`,
      preserveMeaning: false
    });
  });
  return events;
}

function buildMirrorLocalEvents({ meaning, words, speechFeatures, soundSignature, freeRecognizedText }) {
  const meaningJapanese = meaning?.japanese || "";
  const byWord = new Map((words || []).map((word) => [String(word.word || word.original || "").toLowerCase(), word]));
  const localEvents = [...confusableWordLocalEvents(words, meaningJapanese, freeRecognizedText)];

  (speechFeatures?.pronunciationEvents || []).forEach((event, index) => {
    const eventWord = String(event.word || "").toLowerCase().replace(/[^a-z]/g, "");
    const word = byWord.get(eventWord) || null;
    const issueType = issueTypeForPronunciationEvent(event);
    const eventWords = Array.isArray(event.words) ? event.words.map((item) => String(item || "").toLowerCase().replace(/[^a-z]/g, "")).filter(Boolean) : [];
    const wordRoles = [...new Set((eventWords.length ? eventWords : eventWord ? [eventWord] : [])
      .flatMap((englishWord) => japaneseRolesForEnglishWord(englishWord, meaningJapanese))
      .filter((role) => role !== "sentence"))];
    const targetRoles = event.type === "intonation"
      ? String(event.key || "").includes("zigzag") || String(event.key || "").includes("phrase")
        ? ["request-action", "request-ending", "predicate", "predicate-ending"]
        : ["request-ending", "predicate-ending"]
      : wordRoles.length
        ? wordRoles
        : japaneseRolesForEnglishWord(eventWord, meaningJapanese);

    localEvents.push({
      id: `event-${index + 1}-${event.key || issueType}`,
      source: "pronunciationEvents",
      issueType,
      word: event.word || null,
      key: event.key || null,
      timeRangeMs: word ? timeRangeMsForWord(word) : null,
      syllablePosition: word ? syllablePositionForPhone(word, phoneNameFromPronunciationEvent(event)) : { scope: "phrase", fraction: 0.5, slot3: null, syllables: 1 },
      severity: event.level || (event.strength === "strong" ? "high" : "low"),
      confidence: event.strength === "strong" ? "medium" : "low",
      targetRoles,
      englishEvidence: event.detail || event.label || "",
      mirrorAction: mirrorActionForLocalEvent(issueType, event),
      preserveMeaning: !["alternate_word"].includes(issueType)
    });
  });

  (soundSignature?.weakPhones || []).slice(0, 8).forEach((phone, index) => {
    const alreadyCovered = localEvents.some((event) => String(event.word || "").toLowerCase() === String(phone.word || "").toLowerCase()
      && ["consonant_or_phonics", "subtle_phonics_trace", "liquid_confusion"].includes(event.issueType));
    if (alreadyCovered) return;
    const issueType = phone.class === "vowel" ? "vowel_weakness" : phone.class === "liquid" ? "liquid_confusion" : "consonant_or_phonics";
    localEvents.push({
      id: `phone-${index + 1}-${phone.word}-${phone.phone}`,
      source: "soundSignature",
      issueType,
      word: phone.original || phone.word,
      phone: phone.phone,
      timeRangeMs: null,
      syllablePosition: syllablePositionForPhone(byWord.get(String(phone.word || "").toLowerCase()), phone.phone),
      severity: Number(phone.score || 100) < 45 ? "high" : Number(phone.score || 100) < 62 ? "medium" : "low",
      confidence: "low",
      targetRoles: japaneseRolesForEnglishWord(phone.word, meaningJapanese),
      englishEvidence: `${phone.original || phone.word} の ${phone.phone} が score ${phone.score}。${phone.class} の弱さとして扱う候補です。`,
      mirrorAction: phone.class === "vowel"
        ? "該当語句だけ母音の曖昧さとして軽く反映する。子音弱化には置き換えない。"
        : issueType === "liquid_confusion"
          ? "該当語句の子音を、別の子音に置き換わって聞こえる形で反映する。母音だけにする弱化とは区別する。"
          : "該当語句だけ子音の輪郭を軽く弱める。文全体を入れ歯風にしない。",
      preserveMeaning: true
    });
  });

  if (speechFeatures?.voiceSpeedLevel && !["natural", "unknown"].includes(speechFeatures.voiceSpeedLevel)) {
    localEvents.unshift({
      id: "global-speed",
      source: "speechFeatures",
      issueType: "speech_rate",
      word: null,
      timeRangeMs: null,
      severity: deviationSeverity(speechFeatures.voiceSpeedLevel),
      confidence: speechFeatures.wpm ? "medium" : "low",
      targetRoles: ["sentence"],
      englishEvidence: `WPM ${speechFeatures.wpm ?? "--"} / articulation ${speechFeatures.articulationWpm ?? "--"} / ${speechFeatures.voiceSpeedLabel}`,
      mirrorAction: "全体速度だけに反映する。滑舌の崩れや区切りに置き換えない。",
      preserveMeaning: true,
      global: true
    });
  }

  const hasExpectedLinkingBreak = (speechFeatures?.pronunciationEvents || []).some((event) => event.type === "expected_linking_break" || event.type === "word_boundary_pause");
  if (hasExpectedLinkingBreak || soundSignature?.katakanaVowelHeavy) {
    // 絶対ルール: カタカナ英語は母音追加・粒立ち・区切りで表現し、子音欠落として扱わない。
    // このイベントの severity/confidence が "low" だと eventCanAffectMirrorVoice() の
    // フィルター(severityRank >= 2 相当)を通過できず、hasKatakanaDeliveryForRole() が
    // 常に false になってしまう。その結果、同じ弱い子音スコアから作られる
    // consonant_or_phonics イベント(localConsonantOmissionForVoice = 子音欠落表現)が
    // 優先されてしまい、ルール違反の「てうあって」「もあえ」のような欠落ミラーが
    // 生成される実害があった(soundSignature 由来の場合のみ再現)。
    // soundSignature.katakanaVowelHeavy は Azureの音素スコア・長さから直接算出される
    // 具体的な信号であり、他の consonant_or_phonics 系イベント(hard-codedな語別ロジック)
    // と同程度の確からしさがあるため、"medium" に統一してフィルターを通過させる。
    // soundSignature 由来の場合は、カタカナ的な伸びが確認できた単語だけに反映範囲を絞る
    // (文中の別の単語がたまたま長い母音を持つだけで、無関係な単語の子音の癖まで
    // カタカナ扱いに引きずられないようにする)。hasExpectedLinkingBreak は単語同士の
    // つながり方についての文全体の信号のため、従来通り広い範囲を対象にする。
    const katakanaHeavyWords = [...(soundSignature?.katakanaHeavyWords || [])];

    if (hasExpectedLinkingBreak) {
      // 文全体のリズム信号(単語間のつながり方)なので、特定の単語には紐づけない。
      localEvents.push({
        id: "katakana-delivery",
        source: "expectedLinkingBreak",
        issueType: "katakana_delivery",
        word: null,
        timeRangeMs: null,
        syllablePosition: { scope: "phrase", fraction: 0.5, slot3: null, syllables: 1 },
        severity: "medium",
        confidence: "medium",
        targetRoles: ["request-action", "request-ending", "predicate", "predicate-ending", "object", "request-object"],
        englishEvidence: "本来つながりやすい英語フレーズが、1語ずつ粒立って聞こえる候補です。",
        mirrorAction: "子音欠落ではなく、母音つき・粒立ち・短い区切りとして日本語ミラーに反映する。",
        preserveMeaning: true
      });
    } else if (katakanaHeavyWords.length) {
      // soundSignature由来(単語ごとの音の長さから直接算出)の場合は、単語1つずつに
      // イベントを分けて word を設定する。以前は word:null の1件にまとめていたため、
      // 単語カード側(buildWordGroups)にはこの反映が一切表示されず、「その単語には
      // 癖なしと出ているのに読み上げ文だけ変化する」という実機フィードバックの
      // 混乱の原因になっていた。
      katakanaHeavyWords.forEach((heavyWord) => {
        const sourceWord = byWord.get(heavyWord);
        const wordRoles = [...japaneseRolesForEnglishWord(heavyWord, meaningJapanese)];
        localEvents.push({
          id: `katakana-delivery-${heavyWord}`,
          source: "soundSignature",
          issueType: "katakana_delivery",
          word: sourceWord?.original || heavyWord,
          timeRangeMs: sourceWord ? timeRangeMsForWord(sourceWord) : null,
          syllablePosition: { scope: "phrase", fraction: 0.5, slot3: null, syllables: 1 },
          severity: "medium",
          confidence: "medium",
          targetRoles: wordRoles.length ? wordRoles : ["request-action", "request-ending", "predicate", "predicate-ending", "object", "request-object"],
          englishEvidence: `${sourceWord?.original || heavyWord} の母音や語尾が日本語的に残り、カタカナ英語寄りに聞こえる候補です。`,
          mirrorAction: "子音欠落ではなく、母音つき・粒立ち・短い区切りとして日本語ミラーに反映する。",
          preserveMeaning: true
        });
      });
    }
  }

  return {
    version: "local-mirror-events-0.1",
    purpose: "map English pronunciation deviations to local Japanese mirror actions",
    events: localEvents.slice(0, 24),
    summary: localEvents.length
      ? `${localEvents.length}件の局所ミラー反映候補があります。`
      : "局所的に反映する癖はまだありません。"
  };
}

function maxTimelinePauseMs(mirrorTimeline) {
  const pauses = mirrorTimeline?.japaneseMirrorTimeline?.map((item) => Number(item.pauseAfterMs || 0)) || [];
  return pauses.length ? Math.max(...pauses) : 0;
}

function timelineWeaknessLevel(mirrorTimeline) {
  const severities = mirrorTimeline?.japaneseMirrorTimeline?.map((item) => item.severity) || [];
  if (severities.includes("high")) return "high";
  if (severities.includes("medium")) return "medium";
  if (severities.includes("low")) return "low";
  return "none";
}

function hasTimelineLinking(mirrorTimeline) {
  return (mirrorTimeline?.japaneseMirrorTimeline || []).some((item) => (
    String(item.kana || "").includes("ジュー")
    || String(item.reason || "").includes("連結")
    || String(item.reason || "").includes("クッジュー")
  ));
}

function voicePitchFromTimeline(mirrorTimeline, fallbackPitch) {
  const status = mirrorTimeline?.pitchOverlay?.status;
  if (status === "over_rising") return "+12%";
  if (status === "falling_question") return "-12%";
  if (status === "flat_question") return "+0%";
  if (status === "trace") return "+3%";
  return fallbackPitch || "+0%";
}

function splitMeaningForVoice(meaningJapanese) {
  const text = String(meaningJapanese || "");
  if (text.includes("塩を取ってもらえ")) {
    return [
      { text: "塩を", role: "request-object" },
      { text: "取って", role: "request-action" },
      { text: text.slice(text.indexOf("もらえ")), role: "request-ending" }
    ];
  }
  if (text.includes("電話番号を教えてもらえ")) {
    return [
      { text: "電話番号を", role: "request-object" },
      { text: "教えて", role: "request-action" },
      { text: text.slice(text.indexOf("もらえ")), role: "request-ending" }
    ];
  }
  if (text.includes("手伝ってもらえ")) {
    const boundary = text.indexOf("もらえ");
    return [
      { text: text.slice(0, boundary), role: "request-action" },
      { text: text.slice(boundary), role: "request-ending" }
    ];
  }
  if (text.includes("してもらえ")) {
    const boundary = text.indexOf("もらえ");
    return [
      { text: text.slice(0, boundary), role: "request-action" },
      { text: text.slice(boundary), role: "request-ending" }
    ];
  }
  if (text.includes("もらえ")) {
    const boundary = text.indexOf("もらえ");
    return [
      { text: text.slice(0, boundary), role: "request-action" },
      { text: text.slice(boundary), role: "request-ending" }
    ];
  }
  if (text.includes("私はペンを持っています")) {
    return [
      { text: "私は", role: "subject" },
      { text: "ペンを", role: "object" },
      { text: "持っています。", role: "predicate" }
    ];
  }
  if (text.includes("明日会いましょう")) {
    return [
      { text: "明日", role: "time" },
      { text: "会いましょう。", role: "predicate" }
    ];
  }
  if (text.includes("今日は働かなければなりません")) {
    return [
      { text: "今日は", role: "time" },
      { text: "働かなければ", role: "predicate-head" },
      { text: "なりません。", role: "predicate-ending" }
    ];
  }
  // live/leave の言い換え文。動詞(住んでいます/去ります)を独立したpredicate
  // セグメントにしておかないと、"leave"などのローカルイベント(targetRolesに
  // predicateを含む)が「私は」側にしか付けられる場所がなく、意図しない箇所
  // (主語)に反映されてしまう(実機フィードバックで確認)。
  if (text.includes("私はここに住んでいます")) {
    return [
      { text: "私は", role: "subject" },
      { text: "ここに", role: "time" },
      { text: "住んでいます。", role: "predicate" }
    ];
  }
  if (text.includes("私はここを去ります")) {
    return [
      { text: "私は", role: "subject" },
      { text: "ここを", role: "time" },
      { text: "去ります。", role: "predicate" }
    ];
  }
  return [{ text, role: "sentence" }];
}

function softenJapaneseConsonantsForVoice(text, articulation) {
  const source = String(text || "");
  if (articulation === "clear") return source;

  let output = source;
  if (articulation === "soft") {
    return output
      .replace(/手伝って/g, "てつだて")
      .replace(/取って/g, "とて")
      .replace(/教えて/g, "おしえて")
      .replace(/っ/g, "")
      .replace(/ッ/g, "")
      .replace(/もらえますか/g, "もらえまふか")
      .replace(/できますか/g, "できまふか")
      .replace(/ください/g, "くらさい")
      .replace(/ですか/g, "でふか")
      .replace(/ますか/g, "まふか");
  }

  return output
    .replace(/手伝って/g, "てつだて")
    .replace(/取って/g, "とて")
    .replace(/っ/g, "")
    .replace(/ッ/g, "")
    .replace(/できますか/g, "できまふか")
    .replace(/もらえますか/g, "もらえまふか")
    .replace(/教えて/g, "おしえて")
    .replace(/持っています/g, "もています")
    .replace(/ください/g, "くらはい")
    .replace(/ですか/g, "れふか")
    .replace(/です/g, "れふ")
    .replace(/ますか/g, "まふか")
    .replace(/ました/g, "まひた");
}

function collapseJapaneseMeaningForVoice(text, level) {
  const source = String(text || "");
  if (!level || level === "none") return source;

  let output = source
    .replace(/手伝って/g, "てつだて")
    .replace(/取って/g, "とて")
    .replace(/教えて/g, "おしえて")
    .replace(/もらえますか/g, "もらえまふか")
    .replace(/してもらえますか/g, "してもらえまふか")
    .replace(/できますか/g, "できまふか")
    .replace(/ください/g, "くらさい")
    .replace(/ですか/g, "でふか")
    .replace(/ますか/g, "まふか")
    .replace(/ます/g, "まふ");

  if (level !== "strong") return output;

  return output
    .replace(/てつだて/g, "てたて")
    .replace(/おしえて/g, "おえて")
    .replace(/でんわ番号/g, "でんあ番号")
    .replace(/電話番号/g, "でんあばんご")
    .replace(/塩を/g, "しお")
    .replace(/もらえ/g, "もあえ")
    .replace(/まふか/g, "まふぁ")
    .replace(/まふ/g, "まふ")
    .replace(/でき/g, "でい")
    .replace(/持っています/g, "もています")
    .replace(/います/g, "いまふ")
    .replace(/ここに/g, "ここい")
    .replace(/あります/g, "あいまふ")
    .replace(/住んでいます/g, "すんれいまふ")
    .replace(/去ります/g, "さりまふ")
    .replace(/検討します/g, "けんとうしまふ")
    .replace(/大好きです/g, "だいすきれふ")
    .replace(/です/g, "れふ");
}

function katakanaVowelHeavyJapanese(text, strength = "medium") {
  const source = String(text || "");
  const strong = strength === "strong";
  let output = source
    .replace(/手伝って/g, strong ? "てえつうだあってえ" : "てつだあって")
    .replace(/てつだて/g, strong ? "てえつうだあてえ" : "てつだあて")
    .replace(/てだて/g, strong ? "てえだあてえ" : "てだあて")
    .replace(/取って/g, strong ? "とおってえ" : "とってえ")
    .replace(/とて/g, strong ? "とおてえ" : "とてえ")
    .replace(/教えて/g, strong ? "おおしええてえ" : "おしえてえ")
    .replace(/おしえて/g, strong ? "おおしええてえ" : "おしえてえ")
    .replace(/もらえますか/g, strong ? "もおらあえまあすうかあ" : "もらあえまあすか")
    .replace(/もらえまふか/g, strong ? "もおらあえまあふうかあ" : "もらあえまあふか")
    .replace(/もあえまふか/g, strong ? "もおああえまあふうかあ" : "もあえまあふか")
    .replace(/もあえ/g, strong ? "もおああえ" : "もあえ")
    .replace(/してもらえますか/g, strong ? "しいてえもおらあえまあすうかあ" : "してもらあえまあすか")
    .replace(/できますか/g, strong ? "でえきいいまあすうかあ" : "できまあすか")
    .replace(/できまふか/g, strong ? "でえきいいまあふうかあ" : "できまあふか")
    .replace(/ください/g, strong ? "くうだあさあい" : "くださあい")
    .replace(/助けて/g, strong ? "たあすうけえてえ" : "たすけてえ")
    .replace(/ください。/g, strong ? "くうだあさあい。" : "くださあい。")
    .replace(/まふか/g, strong ? "まあふうかあ" : "まあふか")
    .replace(/まふ/g, strong ? "まあふう" : "まあふ")
    .replace(/ますか/g, strong ? "まあすうかあ" : "まあすか")
    .replace(/ます/g, strong ? "まあすう" : "まあす")
    .replace(/です/g, strong ? "でえすう" : "でえす");
  return output;
}

function weakenJapaneseBySoundSignature(text, soundSignature, strength = "medium") {
  let output = String(text || "");
  if (!soundSignature || soundSignature.level === "none") return output;
  if (strength === "light") return output;
  if (soundSignature.katakanaVowelHeavy) {
    if (strength !== "strong") return output;
    return katakanaVowelHeavyJapanese(output, "strong");
  }

  const strong = strength === "strong" || soundSignature.level === "high";
  const hasStopWeakness = Number(soundSignature.stopWeakness || 0) > 0;
  const hasFinalStopWeakness = (soundSignature.weakPhones || []).some((item) => item.class === "stop" && item.position === "final");
  const hasLiquidWeakness = Number(soundSignature.liquidWeakness || 0) > 0;
  const hasFricativeWeakness = Number(soundSignature.fricativeWeakness || 0) > 0;
  const hasVowelWeakness = Number(soundSignature.vowelWeakness || 0) > 0;

  if (hasStopWeakness) {
    output = output
      .replace(/手伝って/g, strong ? "てだて" : "てつだて")
      .replace(/取って/g, strong ? "とえ" : "とて")
      .replace(/持って/g, strong ? "もて" : "もって")
      .replace(/できますか/g, strong ? "でいまふか" : "できまふか")
      .replace(/ください/g, strong ? "くあさい" : "くらさい")
      .replace(/っ/g, "")
      .replace(/ッ/g, "");
  }

  if (hasFinalStopWeakness) {
    output = output
      .replace(/ますか/g, strong ? "まふぁ" : "まふか")
      .replace(/ですか/g, strong ? "れふぁ" : "でふか")
      .replace(/ます/g, "まふ")
      .replace(/です/g, "でふ");
  }

  if (hasLiquidWeakness) {
    output = output
      .replace(/もらえ/g, strong ? "もあえ" : "もらえ")
      .replace(/教えて/g, strong ? "おえて" : "おしえて")
      .replace(/あります/g, strong ? "あいまふ" : "ありまふ")
      .replace(/去ります/g, strong ? "さいまふ" : "さりまふ")
      .replace(/住んでいます/g, strong ? "すんでいまふ" : "すんでいます");
  }

  if (hasFricativeWeakness) {
    output = output
      .replace(/して/g, strong ? "いて" : "して")
      .replace(/しお/g, strong ? "いお" : "しお")
      .replace(/塩/g, strong ? "いお" : "塩")
      .replace(/教えて/g, strong ? "おいえて" : "おしえて")
      .replace(/です/g, "でふ");
  }

  if (hasVowelWeakness && strong) {
    output = output
      .replace(/もらえ/g, "もれ")
      .replace(/います/g, "いむ")
      .replace(/あなた/g, "あな");
  }

  return output;
}

function splitForSegmentedDelivery(parts, transferPlan) {
  const segmentedEffect = (transferPlan?.effects || []).find((effect) => effect.type === "segmented_delivery");
  if (!segmentedEffect) return parts;

  const expanded = [];
  parts.forEach((part) => {
    const text = String(part.text || "");
    if (text === "もらえますか？") {
      expanded.push(
        { text: "もらえ", role: `${part.role}-grain-1` },
        { text: "ます", role: `${part.role}-grain-2` },
        { text: "か？", role: `${part.role}-grain-3` }
      );
      return;
    }
    if (text === "持っています。") {
      expanded.push({ text: "持って", role: `${part.role}-grain-1` }, { text: "います。", role: `${part.role}-grain-2` });
      return;
    }
    expanded.push(part);
  });
  return expanded;
}

function splitForPitchContour(parts, transferPlan) {
  if (!["zigzag", "phrase_movement", "over_rising", "falling_question", "flat_question", "trace"].includes(transferPlan?.intonationStatus)) return parts;
  const expanded = [];
  parts.forEach((part) => {
    const text = String(part.text || "");
    if (text === "もらえますか？") {
      expanded.push(
        { text: "もらえ", role: `${part.role}-pitch-1` },
        { text: "ます", role: `${part.role}-pitch-2` },
        { text: "か？", role: `${part.role}-pitch-3` }
      );
      return;
    }
    if (text === "してもらえますか？") {
      expanded.push(
        { text: "して", role: `${part.role}-pitch-1` },
        { text: "もらえ", role: `${part.role}-pitch-2` },
        { text: "ますか？", role: `${part.role}-pitch-3` }
      );
      return;
    }
    if (text === "手伝って？") {
      expanded.push(
        { text: "手伝って", role: `${part.role}-pitch-1` },
        { text: "？", role: `${part.role}-pitch-2` }
      );
      return;
    }
    if (text === "持っています。") {
      expanded.push(
        { text: "持って", role: `${part.role}-pitch-1` },
        { text: "います。", role: `${part.role}-pitch-2` }
      );
      return;
    }
    expanded.push(part);
  });
  return expanded;
}

function localEventsNeedSyllableSlots(transferPlan) {
  return (transferPlan?.localEvents?.events || []).some((event) => event?.syllablePosition?.scope === "syllable");
}

function splitForLocalSyllableMapping(parts, transferPlan) {
  if (!localEventsNeedSyllableSlots(transferPlan)) return parts;
  const expanded = [];
  parts.forEach((part) => {
    const text = String(part.text || "");
    const role = String(part.role || "");
    const pushSlots = (items) => {
      const total = items.length;
      items.forEach((item, index) => expanded.push({
        text: item,
        role: `${role}-syllable-${index + 1}of${total}`
      }));
    };

    if (text === "もらえますか？") {
      pushSlots(["もらえ", "ます", "か？"]);
      return;
    }
    if (text === "してもらえますか？") {
      pushSlots(["して", "もらえ", "ますか？"]);
      return;
    }
    if (text === "手伝って") {
      pushSlots(["手", "伝って"]);
      return;
    }
    if (text === "教えて") {
      pushSlots(["教", "えて"]);
      return;
    }
    if (text === "取って") {
      pushSlots(["取", "って"]);
      return;
    }
    if (text === "検討します") {
      pushSlots(["検", "討", "します"]);
      return;
    }
    expanded.push(part);
  });
  return expanded;
}

function affectedJapaneseRoles(transferPlan) {
  const localRoles = (transferPlan?.localEvents?.events || [])
    .filter((event) => !event.global)
    .flatMap((event) => event.targetRoles || []);
  if (localRoles.length) return new Set(localRoles);

  const events = transferPlan?.events || [];
  const roles = new Set();
  events.forEach((event) => {
    const word = String(event.word || event.key || "").toLowerCase();
    const words = Array.isArray(event.words) ? event.words.map((item) => String(item).toLowerCase()) : [];
    const all = [word, ...words].join(" ");
    if (/(could|you|help|teach|pass|work|see)/.test(all)) roles.add("request-action");
    if (/(me|him|her|us|them|phone|number|salt|pen|today|tomorrow)/.test(all)) {
      roles.add("request-ending");
      roles.add("request-object");
      roles.add("object");
      roles.add("predicate");
    }
  });
  return roles;
}

function affectedJapaneseRolesForIssues(transferPlan, issueTypes = []) {
  const events = transferPlan?.localEvents?.events || [];
  const roles = events
    .filter((event) => !event.global)
    .filter((event) => !issueTypes.length || issueTypes.includes(event.issueType))
    .flatMap((event) => event.targetRoles || []);
  return new Set(roles);
}

function roleMatchesTarget(role, targetRoles = []) {
  const value = String(role || "");
  // role が "sentence"(splitMeaningForVoiceが専用の分割パターンを持たない文で、
  // 文全体が1セグメントになっている場合)のときは、どのtargetRoleでも一致させる。
  // これが無いと、request-action/predicate のような細かいroleを持つローカル
  // イベント(子音の弱さ、r/l混同など)が、1セグメントしかない文(多くの平叙文、
  // および他語からの言い換えで文構造が変わった場合)には一切反映されない
  // (実機フィードバックで確認: leaveのl→r崩れが、live代替文への切り替え後は
  // 一度もミラー音声に反映されなかった)。
  if (value === "sentence") return true;
  return targetRoles.some((target) => target === "sentence" || value === target || value.includes(target));
}

// 「英語側で実際に崩れていた割合」を求める。分母・分子とも、実際にそのイベントを
// 発生させた単語(wordKeys)自身の発話時間だけを使う。
// 注意: 分母を「role を共有する単語すべて」(could/you/me など)まで広げると、
// you/me のようにほぼ崩れない単語が混ざるだけで割合が薄まり、Could をどれだけ
// 崩して発音しても閾値を超えられず、読み上げ文に一切反映されなくなる実害があった
// (実機フィードバックで確認)。それを避けるため、判定対象の単語自身に限定する。
// 該当する単語が見つからない場合は null を返し、呼び出し側は既存の
// (severityベースの)判定にフォールバックする。
function phoneCoverageRatioForWords(wordKeys, soundSignature, metric) {
  const totals = soundSignature?.wordDurationTotals || {};
  let totalMs = 0;
  let coveredMs = 0;
  (wordKeys || []).forEach((key) => {
    const entry = totals[String(key || "").toLowerCase()];
    if (!entry) return;
    totalMs += entry.totalMs;
    coveredMs += entry[metric] || 0;
  });
  return totalMs > 0 ? coveredMs / totalMs : null;
}

function reflectionTierFromRatio(ratio) {
  if (ratio === null || ratio === undefined) return null;
  if (ratio >= 2 / 3) return "strong";
  if (ratio >= 1 / 3) return "medium";
  if (ratio > 0) return "light";
  return "none";
}

function weakerReflectionTier(tierA, tierB) {
  const rank = { none: 0, light: 1, medium: 2, strong: 3 };
  const a = rank[tierA] ?? 1;
  const b = rank[tierB] ?? 1;
  return a <= b ? tierA : tierB;
}

function syllableSlotFromRole(role) {
  const match = String(role || "").match(/-syllable-(\d+)of(\d+)/);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  const total = Number(match[2]);
  if (!Number.isFinite(index) || !Number.isFinite(total) || total <= 0) return null;
  return { index, total };
}

function eventMatchesRoleSyllable(event, role) {
  const slot = syllableSlotFromRole(role);
  if (!slot) return true;
  const position = event?.syllablePosition || {};
  if (position.scope !== "syllable") return true;
  const fraction = Number(position.fraction);
  if (!Number.isFinite(fraction)) return true;
  const targetIndex = Math.max(0, Math.min(slot.total - 1, Math.floor(fraction * slot.total)));
  return targetIndex === slot.index;
}

function localEventsForRole(transferPlan, role, issueTypes = []) {
  const events = transferPlan?.localEvents?.events || [];
  return events.filter((event) => {
    if (event.global) return false;
    if (issueTypes.length && !issueTypes.includes(event.issueType)) return false;
    if (!eventCanAffectMirrorVoice(event)) return false;
    if (!eventMatchesRoleSyllable(event, role)) return false;
    return roleMatchesTarget(role, event.targetRoles || []);
  });
}

function shouldApplyLocalSoundEffect(transferPlan, role) {
  const localEvents = transferPlan?.localEvents?.events || [];
  if (!localEvents.length) return true;
  return localEventsForRole(transferPlan, role, ["consonant_or_phonics", "vowel_weakness", "subtle_phonics_trace"]).length > 0;
}

function hasLocalConsonantEventForRole(transferPlan, role) {
  return localEventsForRole(transferPlan, role, ["consonant_or_phonics"]).length > 0;
}

function hasLocalLinkingEventForRole(transferPlan, role) {
  return localEventsForRole(transferPlan, role, ["linking"]).length > 0;
}

function hasKatakanaDeliveryForRole(transferPlan, role) {
  return localEventsForRole(transferPlan, role, ["katakana_delivery", "pause_or_unlinked"]).length > 0;
}

// カタカナ的な母音付加(katakana_delivery)と、連結による子音の弱化・脱落(linking /
// consonant_or_phonics)は別の現象であり、同じ role に両方の候補が出ることがある
// (例: Could you を強く連結して「クッユー」寄りに発音しつつ、別の理由で語のどこかが
// 長く伸びてもいる場合)。以前は if/else の並び順でカタカナを常に最優先していたため、
// 実際にはより強い根拠(severity high)を持つ連結の弱化・脱落があっても、母音付加の
// 表現に上書きされてしまっていた(実機フィードバックで確認: 「クッユー」「ヘプミー」の
// ように聞こえる、子音欠落寄りの発音をしたのに、母音を足す形でしかミラーに反映され
// ない)。ここでは role ごとに、各カテゴリの中で最も強い severity を比較し、根拠が
// 明確に強い方を優先する。同点の場合は従来通りカタカナ→子音→連結の順を維持する。
function dominantLocalTransformForRole(transferPlan, role) {
  const maxRank = (events) => events.reduce((max, event) => Math.max(max, severityRank(event.severity)), -1);
  const alternateRank = maxRank(localEventsForRole(transferPlan, role, ["alternate_word_local"]));
  const katakanaRank = maxRank(localEventsForRole(transferPlan, role, ["katakana_delivery", "pause_or_unlinked"]));
  const liquidRank = maxRank(localEventsForRole(transferPlan, role, ["liquid_confusion"]));
  const consonantRank = maxRank(localEventsForRole(transferPlan, role, ["consonant_or_phonics"]));
  const linkingRank = maxRank(localEventsForRole(transferPlan, role, ["linking"]));
  if (alternateRank < 0 && katakanaRank < 0 && liquidRank < 0 && consonantRank < 0 && linkingRank < 0) return "none";
  // alternate_word_local(r/lなどで単語そのものが別の実在単語として聞こえる)は
  // 最も具体的で強い根拠なので、存在する限り最優先する。
  if (alternateRank >= 0) return "alternate";
  if (katakanaRank >= liquidRank && katakanaRank >= consonantRank && katakanaRank >= linkingRank && katakanaRank >= 0) return "katakana";
  if (liquidRank >= consonantRank && liquidRank >= linkingRank && liquidRank >= 0) return "liquid";
  if (consonantRank >= linkingRank) return "consonant";
  return "linking";
}

// alternate_word_local イベントのうち、この role に一致するものの和訳(alternateJapanese)
// を返す。複数ある場合はseverityが最も高いものを採用する。
function alternateWordJapaneseForRole(transferPlan, role) {
  const events = localEventsForRole(transferPlan, role, ["alternate_word_local"]);
  if (!events.length) return "";
  const best = events.slice().sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  return best?.alternateJapanese || "";
}

function katakanaDeliveryStrengthForRole(transferPlan, role) {
  const events = localEventsForRole(transferPlan, role, ["katakana_delivery", "pause_or_unlinked"]);
  if (!events.length) return "none";
  const severityTier = events.some((event) => severityRank(event.severity) >= 3 || event.strength === "strong") ? "strong"
    : events.some((event) => severityRank(event.severity) >= 2 || event.strength === "rhythm") ? "medium" : "light";

  // hasExpectedLinkingBreak 由来(文全体のリズム信号)のイベントは特定の単語の
  // 音の長さに紐づかないため、severity ベースの判定をそのまま使う。soundSignature
  // 由来(単語ごとの音の長さから直接算出)の場合だけ、実際に「長い(カタカナ的)」と
  // 判定された単語自身(katakanaHeavyWords)のうち、この role に対応するものの
  // 発話時間に占める長い音の割合で強さを弱める側に補正する(強める側には補正しない)。
  const wordScoped = events.every((event) => event.source === "soundSignature");
  if (!wordScoped) return severityTier;
  const heavyWords = [...(transferPlan?.soundSignature?.katakanaHeavyWords || [])]
    .filter((word) => roleMatchesTarget(role, japaneseRolesForEnglishWord(word, "")));
  const ratio = phoneCoverageRatioForWords(heavyWords, transferPlan?.soundSignature, "longMs");
  const coverageTier = reflectionTierFromRatio(ratio);
  if (!coverageTier) return severityTier;
  return weakerReflectionTier(severityTier, coverageTier);
}

// カタカナ的な母音付加(語尾・母音を伸ばす)は、モーラの母音を重ねる汎用エンジンで
// 表現する。以前は「手伝って」「もらえますか」など特定の単語のべた書き置換だったため、
// 練習文の日本語訳に登場する単語ごとに手作業でパターンを追加する必要があった。
// モーラ単位の変形にしたことで、どんな日本語テキストにも自動的に適用できる。
function katakanaDeliveryForVoice(text, strength = "light") {
  const source = String(text || "");
  if (strength === "strong" || strength === "medium") return elongateJapaneseMoraText(source, strength);
  return segmentPauseJapaneseMoraText(source);
}

// 子音の弱さ・欠落は、モーラの子音を落として母音だけにする汎用エンジンで表現する。
// severity/ratio による強さの判定(いつ・どれだけ反映するか)はロールごとに既に汎用化
// 済みなので、ここでは「何を(どの単語)」ではなく「どれだけ(強さ)」だけを使う。
function localConsonantOmissionForVoice(text, transferPlan, role = "") {
  const source = String(text || "");
  const events = localEventsForRole(transferPlan, role, ["consonant_or_phonics"]);
  if (!events.length) return source;

  // イベントを発生させた単語自身(例: help)のうち、実際に弱かった音の時間が
  // 1/3未満(light)であれば、その単語の大部分は崩れていないはずなので、
  // 子音欠落表現をミラーへ反映しない(絶対ルール: 崩れていない部分にまで癖を反映しない)。
  const words = [...new Set(events.map((event) => String(event.word || event.key || "").toLowerCase()))];
  const ratio = phoneCoverageRatioForWords(words, transferPlan?.soundSignature, "weakMs");
  const coverageTier = reflectionTierFromRatio(ratio);
  if (coverageTier === "light") return source;

  const severityTier = events.some((event) => severityRank(event.severity) >= 3) ? "strong" : "medium";
  const strength = coverageTier === "strong" || coverageTier === "medium" ? coverageTier : severityTier;
  return weakenJapaneseMoraText(source, strength);
}

// r/l の弱さ・混同は、清音→濁音のずらし(muddle)で表現する。consonant_or_phonics の
// 母音化(weaken)とは別の操作 — 絶対ルール: 別種類の癖に置き換えない、を守るため、
// 「子音が落ちる」パターンと「別の子音に聞こえる」パターンを混同しない。
function localLiquidConfusionForVoice(text, transferPlan, role = "") {
  const source = String(text || "");
  const events = localEventsForRole(transferPlan, role, ["liquid_confusion"]);
  if (!events.length) return source;

  const words = [...new Set(events.map((event) => String(event.word || event.key || "").toLowerCase()))];
  const ratio = phoneCoverageRatioForWords(words, transferPlan?.soundSignature, "weakMs");
  if (reflectionTierFromRatio(ratio) === "light") return source;

  return muddleJapaneseMoraText(source);
}

// 連結による子音の弱化・脱落(例: Could you を強く連結して「クッユー」寄りに聞こえる)も、
// 同じ「子音を落として母音だけ残す」モーラ変形で表現する。以前は"could"/"can"などの
// 単語名を直接キーワード判定していたため、他の単語の連結には一切対応できなかった。
function localLinkingForVoice(text, transferPlan, role = "") {
  const source = String(text || "");
  const events = localEventsForRole(transferPlan, role, ["linking"]);
  if (!events.length) return source;

  const strength = events.some((event) => eventIsStrong(event) || severityRank(event.severity) >= 3) ? "strong" : "medium";
  return weakenJapaneseMoraText(source, strength);
}

function hasLocalPronunciationEventForRole(transferPlan, role) {
  return hasLocalConsonantEventForRole(transferPlan, role) || hasLocalLinkingEventForRole(transferPlan, role);
}

function shouldApplyLocalLengthEffect(transferPlan, role) {
  const localEvents = transferPlan?.localEvents?.events || [];
  if (!localEvents.length) return Boolean(transferPlan?.hasLengthDrag);
  return localEventsForRole(transferPlan, role, ["length"]).length > 0;
}

function buildAccentTransferPlan({ speechFeatures, mirrorTimeline, voicePlan, soundSignature, mirrorLocalEvents }) {
  const events = speechFeatures?.pronunciationEvents || [];
  const hasType = (type) => events.some((event) => event.type === type);
  const strongEvents = events.filter(eventIsStrong);
  const pauseEvents = events.filter((event) => event.type === "word_boundary_pause");
  const unlinkedEvents = events.filter((event) => event.type === "expected_linking_break");
  const voiceSpeedLevel = effectiveVoiceSpeedLevel(speechFeatures);
  const localPauseCount = Number(speechFeatures?.rhythmHints?.localPauseCount || 0);
  const slowSmoothDelivery = ["slow", "very_slow"].includes(voiceSpeedLevel) && localPauseCount < 2;
  const effectivePauseEvents = slowSmoothDelivery ? pauseEvents.filter((event) => event.strength === "strong") : pauseEvents;
  const effectiveUnlinkedEvents = slowSmoothDelivery ? unlinkedEvents.filter((event) => event.strength === "strong" || event.strength === "rhythm") : unlinkedEvents;
  const segmentedEvents = [...effectivePauseEvents, ...effectiveUnlinkedEvents].filter((event) => {
    const gap = Number(event.gapMs || 0);
    return event.strength === "strong" || event.strength === "rhythm" || gap >= 220;
  });
  const lengthEvents = events.filter((event) => event.type === "length");
  const consonantEvents = events.filter((event) => ["final-consonant", "liquid", "alignment"].includes(event.type));
  const linkingEvents = events.filter((event) => event.type === "linking");
  const katakanaDeliveryEvents = (mirrorLocalEvents?.events || []).filter((event) => event.issueType === "katakana_delivery");
  const intonationStatus = mirrorTimeline?.pitchOverlay?.status || speechFeatures?.intonationStatus || "unknown";
  const intonationMoves = Array.isArray(speechFeatures?.pitchContour?.moves) ? speechFeatures.pitchContour.moves : [];
  const maxPause = effectivePauseEvents.length ? Math.max(...effectivePauseEvents.map((event) => Number(event.gapMs || 0))) : 0;
  const maxUnlinkedGap = effectiveUnlinkedEvents.length ? Math.max(...effectiveUnlinkedEvents.map((event) => Number(event.gapMs || 0))) : 0;
  const voiceMirrorLevel = speechFeatures?.voiceMirrorLevel || "clear";
  const articulationMirrorLevel = speechFeatures?.articulationMirrorLevel || "clear";
  const semanticCollapseLevel = voicePlan?.meaningCollapseLevel || "none";
  const hasSemanticCollapse = semanticCollapseLevel !== "none";
  const highScoreMinorIssue = Number(speechFeatures?.accuracyScore || 0) >= 88
    && Number(speechFeatures?.pronunciationScore || 0) >= 90
    && !(soundSignature?.weakPhones || []).some((item) => item.class !== "vowel" && Number(item.score || 100) < 55)
    && articulationMirrorLevel !== "unclear";
  const nearNaturalCandidate = Number(speechFeatures?.accuracyScore || 0) >= 84
    && Number(speechFeatures?.pronunciationScore || 0) >= 82
    && Number(speechFeatures?.prosodyScore || 0) >= 80
    && articulationMirrorLevel !== "unclear";
  const moderateCandidate = Number(speechFeatures?.accuracyScore || 0) >= 75
    && Number(speechFeatures?.pronunciationScore || 0) >= 78
    && Number(speechFeatures?.prosodyScore || 0) >= 75;
  const strongNonVowelCount = (soundSignature?.weakPhones || []).filter((item) => item.class !== "vowel" && Number(item.score || 100) < 55).length;
  const intonationDominant = ["zigzag", "over_rising", "falling_question", "phrase_movement"].includes(intonationStatus)
    && Number(speechFeatures?.prosodyScore || 0) >= 75
    && Number(speechFeatures?.accuracyScore || 0) >= 72;

  const effects = [];
  if (hasSemanticCollapse) effects.push({ type: "semantic_collapse", strength: semanticCollapseLevel });
  if (katakanaDeliveryEvents.length) effects.push({ type: "katakana_delivery", strength: katakanaDeliveryEvents.some((event) => severityRank(event.severity) >= 2) ? "medium" : "light" });
  if (soundSignature?.level && soundSignature.level !== "none") {
    const soundStrength = highScoreMinorIssue || nearNaturalCandidate || intonationDominant || (moderateCandidate && strongNonVowelCount <= 1)
      ? "light"
      : soundSignature.level === "high" && (voiceMirrorLevel === "unclear" || strongNonVowelCount >= 2)
        ? "strong"
        : "medium";
    effects.push({ type: "phoneme_sound_deformation", strength: soundStrength, soundSignature });
  }
  if (effectivePauseEvents.length) effects.push({ type: "pause", strength: maxPause >= 320 ? "strong" : "medium", pauseMs: Math.min(800, Math.max(220, maxPause)) });
  if (segmentedEvents.length >= 2 || segmentedEvents.some((event) => event.strength === "strong" || event.strength === "rhythm")) {
    const maxSegmentGap = segmentedEvents.length ? Math.max(...segmentedEvents.map((event) => Number(event.gapMs || 0))) : maxUnlinkedGap;
    effects.push({
      type: "segmented_delivery",
      strength: segmentedEvents.length >= 2 || maxSegmentGap >= 170 ? "strong" : "medium",
      pauseMs: Math.min(520, Math.max(240, maxSegmentGap + 120)),
      targets: segmentedEvents.map((event) => event.key || event.words?.join("-")).filter(Boolean)
    });
  }
  // Slow but smooth speech should stay connected in Japanese; rate carries the slowness.
  if (lengthEvents.length) effects.push({ type: "length_drag", strength: lengthEvents.some(eventIsStrong) ? "strong" : "medium" });
  if (!katakanaDeliveryEvents.length && !highScoreMinorIssue && (consonantEvents.filter(eventIsStrong).length >= 2 || articulationMirrorLevel === "unclear" || (articulationMirrorLevel === "soft" && consonantEvents.length >= 2))) {
    effects.push({ type: "soften_consonants", strength: articulationMirrorLevel === "unclear" || consonantEvents.filter(eventIsStrong).length >= 2 ? "strong" : "medium" });
  }
  if (linkingEvents.length) effects.push({ type: "linking_compression", strength: linkingEvents.some(eventIsStrong) ? "strong" : "weak" });
  if (hasType("intonation") || !["unknown", "natural"].includes(intonationStatus)) effects.push({ type: "intonation", status: intonationStatus });
  if (voiceMirrorLevel === "trace") effects.push({ type: "trace_accent", strength: "light" });

  return {
    version: "accent-transfer-0.1",
    events,
    localEvents: mirrorLocalEvents || { version: "local-mirror-events-0.1", events: [], summary: "局所イベントなし" },
    voiceMirrorLevel,
    articulationMirrorLevel,
    eventCount: events.length,
    strongEventCount: strongEvents.length,
    effects,
    lengthTargets: lengthEvents.map((event) => String(event.word || "").toLowerCase()).filter(Boolean),
    soundSignature,
    semanticCollapseLevel,
    hasSemanticCollapse,
    hasPause: effectivePauseEvents.length > 0 || effectiveUnlinkedEvents.length > 0,
    pauseMs: maxPause || (effectiveUnlinkedEvents.length ? Math.min(520, Math.max(260, maxUnlinkedGap + 210)) : 0),
    hasLengthDrag: lengthEvents.length > 0,
    hasConsonantSoftening: !katakanaDeliveryEvents.length && (articulationMirrorLevel === "unclear" || (articulationMirrorLevel === "soft" && consonantEvents.length >= 1) || consonantEvents.filter(eventIsStrong).length >= 2),
    hasKatakanaDelivery: katakanaDeliveryEvents.length > 0,
    hasLinkingCompression: linkingEvents.length > 0,
    hasSegmentedDelivery: segmentedEvents.length >= 2 || effectiveUnlinkedEvents.length > 0,
    segmentedTargets: segmentedEvents.map((event) => event.label || event.words?.join("-")).filter(Boolean),
    hasTraceAccent: voiceMirrorLevel === "trace",
    speedLevel: voiceSpeedLevel || "unknown",
    overallSpeedLevel: speechFeatures?.speedLevel || "unknown",
    articulationSpeedLevel: speechFeatures?.articulationSpeedLevel || "unknown",
    intonationStatus,
    intonationMoves,
    intonationExpected: speechFeatures?.intonationTarget?.expectedFinalContour || "unknown"
  };
}

function addLengthDragForVoice(text, transferPlan, role = "") {
  if (!transferPlan?.hasLengthDrag) return text;
  const source = String(text || "");
  const targets = new Set(transferPlan.lengthTargets || []);
  const roleText = String(role || "");
  if (targets.has("me") && roleText.includes("request-ending")) {
    if (/か[？?]?$/.test(source)) return source.replace(/か([？?]?)$/u, "かあ$1");
    if (/ます[？?]?$/.test(source)) return source.replace(/ます([？?]?)$/u, "まあす$1");
    if (/もらえ/.test(source)) return source.replace(/もらえ/u, "もらえ");
  }
  if (source.includes("もらえ")) return source.replace("もらえ", "もらあえ");
  if (source.includes("教えて")) return source.replace("教えて", "おしえーて");
  if (source.includes("取って")) return source.replace("取って", "とーて");
  if (source.includes("持っています")) return source.replace("持っています", "もーています");
  if (source.includes("ですか")) return source.replace("ですか", "でーすか");
  if (source.includes("ますか")) return source.replace("ますか", "まーすか");
  return source.replace(/([ぁ-んァ-ンー])([？！?。.]*)$/u, "$1ー$2");
}

function applyAccentTransferToVoiceText(text, articulation, transferPlan, role = "") {
  const dominantTransform = dominantLocalTransformForRole(transferPlan, role);

  // alternate(r/lなどで単語そのものが別の実在単語に聞こえる)は、音の弱め・伸ばし
  // ではなく、そのものずばり別単語の和訳に置き換える、最も強い反映。他の変形は重ねない。
  if (dominantTransform === "alternate") {
    const alternateText = alternateWordJapaneseForRole(transferPlan, role);
    if (alternateText) return alternateText;
  }

  const localSound = shouldApplyLocalSoundEffect(transferPlan, role);
  const localConsonant = dominantTransform === "consonant";
  const localLinking = dominantTransform === "linking";
  const localLiquid = dominantTransform === "liquid";
  const localKatakanaDelivery = dominantTransform === "katakana";
  const localLength = shouldApplyLocalLengthEffect(transferPlan, role) && !localConsonant && !localLinking && !localLiquid;
  const lengthAdjusted = localLength ? addLengthDragForVoice(text, transferPlan, role) : String(text || "");
  const consonantEffect = (transferPlan?.effects || []).find((effect) => effect.type === "soften_consonants");
  const collapseEffect = (transferPlan?.effects || []).find((effect) => effect.type === "semantic_collapse");
  const soundEffect = (transferPlan?.effects || []).find((effect) => effect.type === "phoneme_sound_deformation");
  const shouldDeformText = localSound && (articulation !== "clear" || consonantEffect?.strength === "strong" || localConsonant);
  let softened = localConsonant || localLiquid || localKatakanaDelivery
    ? lengthAdjusted
    : softenJapaneseConsonantsForVoice(lengthAdjusted, shouldDeformText ? articulation : "clear");
  if (localKatakanaDelivery) {
    softened = katakanaDeliveryForVoice(softened, katakanaDeliveryStrengthForRole(transferPlan, role));
  } else if (localLiquid) {
    softened = localLiquidConfusionForVoice(softened, transferPlan, role);
  } else if (localConsonant) {
    softened = localConsonantOmissionForVoice(softened, transferPlan, role);
  } else if (localLinking) {
    softened = localLinkingForVoice(softened, transferPlan, role);
  } else if (soundEffect && localSound) {
    softened = weakenJapaneseBySoundSignature(softened, soundEffect.soundSignature, soundEffect.strength);
  }
  if (!localConsonant && !localLiquid && collapseEffect && localSound && !soundEffect?.soundSignature?.katakanaVowelHeavy) {
    softened = collapseJapaneseMeaningForVoice(softened, collapseEffect.strength);
  }
  if (transferPlan?.hasLinkingCompression && articulation === "clear") {
    softened = softened
      .replace(/手伝ってもらえ/g, "手伝ってもりゃえ")
      .replace(/取ってもらえ/g, "取ってもりゃえ")
      .replace(/教えてもらえ/g, "教えてもりゃえ");
  }
  if (!transferPlan?.hasTraceAccent) return softened;
  if (!transferPlan?.hasLinkingCompression && !["fast", "very_fast"].includes(transferPlan?.speedLevel)) return softened;

  return softened
    .replace(/塩を取って/g, "塩取って")
    .replace(/電話番号を教えて/g, "電話番号教えて")
    .replace(/私を手伝って/g, "私手伝って")
    .replace(/彼を手伝って/g, "彼手伝って")
    .replace(/彼女を手伝って/g, "彼女手伝って")
    .replace(/私たちを手伝って/g, "私たち手伝って")
    .replace(/ペンを持っています/g, "ペン持っています");
}

function segmentArticulationForRole(baseArticulation, role, transferPlan) {
  if (hasKatakanaDeliveryForRole(transferPlan, role)) return "clear";
  if (baseArticulation === "clear") return "clear";
  const affectedRoles = affectedJapaneseRolesForIssues(transferPlan, ["consonant_or_phonics", "vowel_weakness", "subtle_phonics_trace"]);
  const hasLocalEvents = (transferPlan?.localEvents?.events || []).some((event) => !event.global);
  if (String(role || "") === "sentence" && (transferPlan?.articulationMirrorLevel === "unclear" || transferPlan?.articulationMirrorLevel === "soft")) {
    return hasLocalEvents && !affectedRoles.has("sentence") ? "clear" : baseArticulation;
  }
  if (!affectedRoles.size) return baseArticulation;
  const value = String(role || "");
  const isAffected = [...affectedRoles].some((affected) => value.includes(affected));
  return isAffected ? baseArticulation : "clear";
}

function segmentVolumeForArticulation(baseVolume, segmentArticulation) {
  if (segmentArticulation === "unclear") return "x-soft";
  if (segmentArticulation === "soft") return "soft";
  return "default";
}

function intonationPitchPattern(transferPlan, partCount = 0) {
  const moves = Array.isArray(transferPlan?.intonationMoves) ? transferPlan.intonationMoves : [];
  const usableMoves = moves.filter((move) => ["rise", "fall"].includes(move.direction));
  const source = usableMoves.length ? usableMoves : moves;
  if (!source.length) return [];
  let pattern = source.map((move) => {
    const semitones = Math.abs(Number(move.semitones || 0));
    const size = semitones >= 3.5 ? 14 : semitones >= 1.8 ? 10 : 7;
    if (move.direction === "rise") return `+${size}%`;
    if (move.direction === "fall") return `-${size}%`;
    return "+0%";
  });
  const signs = new Set(pattern.map((value) => String(value).startsWith("-") ? "-" : String(value).startsWith("+") ? "+" : "0"));
  if (partCount >= 3 && signs.size <= 1) {
    pattern = ["+10%", "-8%", "+10%", "-8%", "+7%"];
  }
  while (partCount > 0 && pattern.length < partCount) {
    pattern.push(pattern[pattern.length - 1]);
  }
  return pattern;
}

function pitchForVoiceSegment({ index, parts, basePitch, weakPitch, transferPlan }) {
  const isFinal = index === parts.length - 1;
  if (transferPlan?.intonationStatus === "zigzag") {
    const pattern = intonationPitchPattern(transferPlan, parts.length);
    if (pattern.length) return pattern[index % pattern.length];
    const fallback = ["+10%", "-9%", "+10%", "-9%", "+7%"];
    return fallback[index % fallback.length];
  }
  if (transferPlan?.intonationStatus === "phrase_movement") {
    return isFinal ? basePitch : weakPitch;
  }
  if (!isFinal) return weakPitch;
  if (transferPlan?.intonationStatus === "over_rising") return "+16%";
  if (transferPlan?.intonationStatus === "falling_question") return "-15%";
  if (transferPlan?.intonationStatus === "flat_question") return "+0%";
  if (transferPlan?.intonationStatus === "trace") return basePitch;
  if (transferPlan?.intonationStatus === "natural" && transferPlan?.intonationExpected === "moderate_rise") return "+8%";
  return basePitch;
}

function applyIntonationPunctuation(text, index, parts, transferPlan) {
  const value = String(text || "");
  const isFinal = index === parts.length - 1;
  if (!isFinal) return value;
  if (transferPlan?.intonationStatus === "falling_question") {
    return value.replace(/[？?]+$/u, "。");
  }
  if (transferPlan?.intonationStatus === "over_rising") {
    return value.replace(/[。.!！？?]*$/u, "？");
  }
  if (transferPlan?.intonationStatus === "flat_question") {
    return value.replace(/[？?]+$/u, "");
  }
  return value;
}

function timelineToVoiceScript({ meaning, mirrorTimeline, voicePlan, speechFeatures, soundSignature, mirrorLocalEvents }) {
  const maxPause = maxTimelinePauseMs(mirrorTimeline);
  const weakness = timelineWeaknessLevel(mirrorTimeline);
  const speedLevel = mirrorTimeline?.rhythm?.speedLevel || "unknown";
  const linking = hasTimelineLinking(mirrorTimeline);
  const transferPlan = buildAccentTransferPlan({ speechFeatures, mirrorTimeline, voicePlan, soundSignature, mirrorLocalEvents });
  const parts = splitForPitchContour(
    splitForLocalSyllableMapping(
      splitForSegmentedDelivery(splitMeaningForVoice(meaning.japanese), transferPlan),
      transferPlan
    ),
    transferPlan
  );
  const baseRate = voicePlan?.rate || "-4%";
  const basePitch = voicePitchFromTimeline(mirrorTimeline, voicePlan?.pitch || "+0Hz");
  const baseVolume = voicePlan?.volume || "default";
  const articulation = voicePlan?.articulation || "clear";
  const transferPause = transferPlan.hasPause ? Math.min(800, Math.max(220, transferPlan.pauseMs || 0)) : 0;
  const pauseAfterFirst = Math.max(transferPlan.hasPause && maxPause >= 170 ? Math.max(170, Math.min(650, maxPause)) : 0, transferPause);
  const slowSegmentPause = 0;
  const fastDelivery = speedLevel === "fast" || speedLevel === "very_fast";
  const katakanaDelivery = Boolean(transferPlan.hasKatakanaDelivery);
  const segmentedFastWords = transferPlan.hasSegmentedDelivery && ["fast", "very_fast"].includes(transferPlan.articulationSpeedLevel);
  const compressedRate = speedLevel === "very_fast" && linking ? "+30%" : speedLevel === "very_fast" ? "+24%" : speedLevel === "fast" && linking ? "+14%" : speedLevel === "fast" ? "+8%" : linking ? "+0%" : transferPlan.hasTraceAccent ? "-4%" : baseRate;
  const compressedDelivery = articulation === "clear" && (fastDelivery || (linking && transferPlan.hasLinkingCompression));
  const useWeakTiming = !katakanaDelivery && !segmentedFastWords && !fastDelivery && (articulation === "unclear" || transferPlan.hasLengthDrag || speedLevel === "slow" || speedLevel === "very_slow" || weakness === "high");
  const weakBreak = transferPlan.hasPause || transferPlan.hasSegmentedDelivery
    ? compressedDelivery ? 0 : articulation === "unclear" ? 180 : weakness === "high" ? 130 : transferPlan.hasLengthDrag ? 90 : 0
    : 0;
  const weakRate = compressedDelivery
    ? compressedRate
    : segmentedFastWords ? "+0%"
    : articulation === "unclear" ? "-28%"
    : transferPlan.hasLengthDrag ? "-22%"
    : speedLevel === "very_slow" || speedLevel === "slow" ? baseRate
    : weakness === "high" ? "-20%"
    : weakness === "medium" || articulation === "soft" ? "-14%"
    : compressedRate;
  const weakPitch = katakanaDelivery ? "+0%" : articulation === "unclear" ? "-14%" : articulation === "soft" ? "-7%" : transferPlan.hasTraceAccent ? "-4%" : "+0%";

  return {
    version: "timeline-voice-0.1",
    source: "mirrorTimeline",
    weakness,
    speedLevel,
    linking,
    compressedDelivery,
    articulation,
    volume: baseVolume,
    pitchStatus: mirrorTimeline?.pitchOverlay?.status || "unknown",
    transferPlan,
    segments: parts.map((part, index) => {
      const segmentArticulation = segmentArticulationForRole(articulation, part.role, transferPlan);
      const accentText = applyAccentTransferToVoiceText(part.text, segmentArticulation, transferPlan, part.role);
      const segmentKatakanaDelivery = hasKatakanaDeliveryForRole(transferPlan, part.role);
      return {
        text: applyIntonationPunctuation(accentText, index, parts, transferPlan),
        sourceText: part.text,
        role: part.role,
        rate: index === 0 && useWeakTiming ? weakRate : useWeakTiming ? weakRate : compressedRate,
        pitch: pitchForVoiceSegment({ index, parts, basePitch, weakPitch, transferPlan }),
        volume: segmentVolumeForArticulation(baseVolume, segmentArticulation),
        articulation: segmentArticulation,
        breakAfterMs: index < parts.length - 1
          ? fastDelivery
            ? Math.min(340, Math.max(transferPlan.hasSegmentedDelivery ? 240 : 0, transferPlan.hasPause ? Math.round(transferPause * 0.8) : 0))
            : Math.max(segmentKatakanaDelivery ? 90 : 0, transferPlan.hasPause ? transferPause : 0, index === 0 ? pauseAfterFirst : 0, weakBreak, slowSegmentPause)
          : 0
      };
    })
  };
}

function makeVoiceText({ meaning, severity, couldBlindSpot, muffled, voicePlan, speechFeatures }) {
  if (voicePlan?.text) return voicePlan.text;
  return meaning.japanese;
}

function buildConfidence({ words, mirroredWords, scores, consonantMin, muffled, couldBlindSpot, speechFeatures }) {
  const criticalEvidence = words.filter((word) => word.isCritical && wordSeverity(word) !== "ok");
  const highEvidence = words.filter((word) => wordSeverity(word) === "high");
  const scoreHigh = Number(scores.accuracy || 0) >= 88;
  const phonemeWeak = consonantMin !== null && consonantMin !== undefined && Number(consonantMin) < 70;
  const hypothesisOnly = mirroredWords.some((word) => word.hypothesisOnly);
  const conservative = mirroredWords.some((word) => word.conservative);
  const linking = mirroredWords.some((word) => word.linking);
  const strongEventCount = (speechFeatures?.pronunciationEvents || []).filter(eventIsStrong).length;
  const evidence = [];

  if (criticalEvidence.length) evidence.push(`重要語 ${criticalEvidence.map((word) => word.original).join(", ")} に弱さがあります。`);
  if (highEvidence.length) evidence.push(`${highEvidence.map((word) => word.original).join(", ")} は音素・単語スコア上も崩れが大きい候補です。`);
  if (phonemeWeak) evidence.push(`子音最小値が ${Math.round(Number(consonantMin))} で、子音の輪郭が弱い可能性があります。`);
  if (muffled) evidence.push("子音全体が弱い、またはこもって聞こえる候補です。");
  if (couldBlindSpot) evidence.push("Azureは高評価でも、人間の耳では Could が別語寄りに聞こえる可能性を仮説として表示しています。");
  (speechFeatures?.pronunciationEvents || []).slice(0, 3).forEach((event) => evidence.push(event.detail));

  if (conservative && !criticalEvidence.length && !highEvidence.length && strongEventCount === 0) {
    return {
      level: "low",
      label: "低",
      evidence: evidence.length ? evidence : ["Azureスコアは高く、強いMirror根拠はまだありません。"],
      warning: "高スコアのため断定しません。Mirrorは確認用の仮説として扱ってください。"
    };
  }

  if (criticalEvidence.length || highEvidence.length || phonemeWeak || speechFeatures?.lengthLevel === "high") {
    return {
      level: scoreHigh && (hypothesisOnly || conservative) ? "medium" : "high",
      label: scoreHigh && (hypothesisOnly || conservative) ? "中" : "高",
      evidence,
      warning: scoreHigh && (hypothesisOnly || conservative) ? "Azureスコアは高いため、断定ではありません。録音再生または単語単体比較で確認してください。" : ""
    };
  }

  if (couldBlindSpot || hypothesisOnly) {
    return {
      level: "low",
      label: "低",
      evidence,
      warning: "これは聞こえ方の仮説です。Azure上は高評価の可能性があるため、「そう聞こえる」とは断定しません。"
    };
  }

  return {
    level: "low",
    label: "低",
    evidence: evidence.length ? evidence : ["大きなスコア上の根拠はまだありません。"],
    warning: "人間の耳で違和感がある場合だけ、追加比較してください。"
  };
}

function deviationSeverity(level) {
  return {
    none: "none",
    unknown: "low",
    low: "low",
    medium: "medium",
    high: "high",
    very_slow: "medium",
    slow: "low",
    fast: "low"
  }[level] || "low";
}

function buildDeviationModel({ contrastSet, words, scores, consonantMin, muffled, couldBlindSpot, speechFeatures }) {
  const deviations = [];

  if (speechFeatures.speedLevel && !["natural", "unknown"].includes(speechFeatures.speedLevel)) {
    deviations.push({
      type: "speech_rate",
      source: "recording_duration",
      status: speechFeatures.speedLevel,
      severity: deviationSeverity(speechFeatures.speedLevel),
      confidence: speechFeatures.wpm ? "medium" : "low",
      evidence: `WPM ${speechFeatures.wpm ?? "--"} / native reference ${speechFeatures.nativeReferenceWpm}`,
      mirrorVoice: {
        rate: speechFeatures.speedLevel === "very_slow" ? "-22%" : speechFeatures.speedLevel === "slow" ? "-14%" : "+4%"
      }
    });
  }

  if (speechFeatures.consonantWeaknessLevel && speechFeatures.consonantWeaknessLevel !== "none") {
    deviations.push({
      type: "consonant_weakness",
      source: "phoneme_scores",
      status: speechFeatures.consonantWeaknessLevel,
      severity: deviationSeverity(speechFeatures.consonantWeaknessLevel),
      confidence: consonantMin !== null && consonantMin !== undefined ? "medium" : "low",
      evidence: `consonantMin ${consonantMin ?? "--"} / label ${speechFeatures.consonantWeaknessLabel}`,
      mirrorVoice: {
        articulation: "soften_consonant_edges"
      }
    });
  }

  if (muffled) {
    deviations.push({
      type: "muffled_articulation",
      source: "consonant_summary",
      status: "muffled",
      severity: "medium",
      confidence: "medium",
      evidence: "子音全体が弱い、またはこもって聞こえる候補です。",
      mirrorVoice: {
        articulation: "muffled"
      }
    });
  }

  (speechFeatures.pronunciationEvents || []).forEach((event) => {
    deviations.push({
      type: event.type || "pronunciation_event",
      source: event.key || event.word || "speech_features",
      status: event.key || event.label,
      severity: event.level || (event.strength === "strong" ? "high" : "low"),
      confidence: event.strength === "strong" ? "medium" : "low",
      evidence: event.detail,
      action: event.action,
      mirrorVoice: {
        pausePattern: event.type === "intonation" ? speechFeatures.voicePausePattern : undefined
      }
    });
  });

  if (couldBlindSpot) {
    deviations.push({
      type: "azure_blind_spot",
      source: "critical_word_high_score",
      status: "could_blind_spot",
      severity: "low",
      confidence: "low",
      evidence: "AzureはCouldを高評価にしていますが、人間の耳で別語寄りに聞こえる可能性を検証します。",
      mirrorVoice: {
        articulation: "hypothesis_only"
      }
    });
  }

  if (speechFeatures.hasFiller) {
    deviations.push({
      type: "filler_candidate",
      source: "recognized_words",
      status: speechFeatures.fillerWords.join(","),
      severity: "low",
      confidence: "low",
      evidence: `Azure認識上は ${speechFeatures.fillerWords.join(", ")} が含まれています。ただし短い filler は誤認識しやすいため、Mirror Voiceには自動で「えっと」を入れません。`,
      mirrorVoice: {
        pausePattern: "pause_only"
      }
    });
  }

  const weakWords = words
    .filter((word) => wordSeverity(word) !== "ok")
    .map((word) => ({
      word: word.original,
      score: Math.round(Number(word.score || 0)),
      severity: wordSeverity(word),
      errorType: word.errorType
    }));

  return {
    version: "0.1",
    targetText: contrastSet.text,
    targetMeaning: getMeaning(contrastSet).japanese,
    intonationTarget: contrastSet.intonationTarget || null,
    scores,
    weakWords,
    deviations,
    summary: deviations.length
      ? `${deviations.length}件の聞こえ方のズレ候補があります。`
      : "大きな聞こえ方のズレ候補はまだありません。"
  };
}

function neutralSoundSignature() {
  return {
    weakPhones: [],
    longPhones: [],
    longVowels: [],
    longStops: [],
    weakest: null,
    stopWeakness: 0,
    fricativeWeakness: 0,
    liquidWeakness: 0,
    nasalWeakness: 0,
    vowelWeakness: 0,
    strongCount: 0,
    katakanaVowelHeavy: false,
    level: "none",
    summary: "free recognition meaning; reference pronunciation assessment ignored"
  };
}

function neutralizeReferenceAssessmentForFreeMeaning(speechFeatures) {
  return {
    ...speechFeatures,
    consonantWeaknessLevel: "none",
    consonantWeaknessLabel: "自由認識を優先",
    ambiguityLevel: "low",
    voiceMirrorLevel: "clear",
    articulationMirrorLevel: "clear",
    boundaryPauseLevel: "none",
    boundaryPauseLabel: "自由認識を優先",
    boundaryPauseEvents: [],
    lengthLevel: "none",
    lengthSignals: [],
    lengthSignal: "free recognition meaning",
    pronunciationEvents: [],
    hasFiller: false,
    fillerWords: [],
    notes: [
      ...(speechFeatures?.notes || []),
      "freeRecognition meaning selected: reference Pronunciation Assessment events are not used for Mirror Voice"
    ]
  };
}

function neutralMirrorTimelineForFreeMeaning(mirrorTimeline, speechFeatures) {
  return {
    ...mirrorTimeline,
    japaneseMirrorTimeline: [],
    rhythm: {
      ...(mirrorTimeline?.rhythm || {}),
      wpm: speechFeatures?.wpm ?? mirrorTimeline?.rhythm?.wpm,
      articulationWpm: speechFeatures?.articulationWpm ?? mirrorTimeline?.rhythm?.articulationWpm,
      overallSpeedLevel: "natural",
      articulationSpeedLevel: "natural",
      speedLevel: "natural",
      boundaryPauses: []
    },
    pitchOverlay: {
      ...(mirrorTimeline?.pitchOverlay || {}),
      status: "natural",
      label: "free recognition meaning"
    }
  };
}

function generateJapaneseMirror({ contrastSet, wordDiagnostics, scores, consonantAvg, consonantMin, muffled, couldBlindSpot, recordingDurationMs, rhythmHints, intonationFeatures, freeRecognizedText, utteranceCheck }) {
  const words = wordDiagnostics.length
    ? wordDiagnostics
    : String(contrastSet.text || "").split(/\s+/).map((word) => ({ original: word, word: word.toLowerCase().replace(/[^a-z]/g, ""), score: 100, consonantMin: null }));

  const speechFeatures = buildSpeechFeatures({
    words,
    scores,
    consonantAvg,
    consonantMin,
    muffled,
    couldBlindSpot,
    recordingDurationMs,
    rhythmHints,
    intonationFeatures,
    intonationTarget: contrastSet.intonationTarget
  });
  const mirroredWords = buildMirroredWords(words, speechFeatures, { couldBlindSpot, lengthSignals: speechFeatures.lengthSignals, pronunciationEvents: speechFeatures.pronunciationEvents });
  const maxSeverity = mirroredWords.reduce((max, word) => (severityRank(word.severity) > severityRank(max) ? word.severity : max), "ok");
  const conservative = mirroredWords.some((word) => word.conservative);
  const linking = mirroredWords.some((word) => word.linking);
  const reasons = mirroredWords.map((word) => word.reason).filter(Boolean);
  const confidence = buildConfidence({ words, mirroredWords, scores, consonantMin, muffled, couldBlindSpot, speechFeatures });
  const utteranceMismatch = utteranceCheck?.status === "possible_mismatch";
  const adjustedConfidence = utteranceMismatch
    ? {
        ...confidence,
        level: confidence.level === "high" ? "medium" : confidence.level,
        label: confidence.label === "高" ? "中" : confidence.label,
        evidence: [
          `参照文なし認識: ${freeRecognizedText || "取得できませんでした"}`,
          ...(confidence.evidence || [])
        ],
        warning: "参照文なし認識では別の英文として聞こえている可能性があります。日本語訳とMirror Voiceは確認用の仮説として扱ってください。"
      }
    : confidence;

  if (muffled) {
    reasons.push("子音全体が弱く、聞き手には輪郭がぼやけて聞こえる可能性があります。");
  }
  if (Number(scores.prosody || 0) < 60) {
    reasons.push("prosody が低く、単語のつながりやリズムが不自然に聞こえる可能性があります。");
  }
  (speechFeatures.pronunciationEvents || []).forEach((event) => reasons.push(event.detail));

  const referencePhoneticText = composePhoneticText(mirroredWords, speechFeatures);
  const targetPhoneticText = freeRecognitionPhoneticText(freeRecognizedText) || freeRecognitionPhoneticText(contrastSet.text);
  const expectedWords = expectedWordCount(freeRecognizedText) || expectedWordCount(contrastSet.text);
  const assessedWords = words.filter((word) => word.word).length;
  const partialAssessment = expectedWords >= 3 && assessedWords > 0 && assessedWords < Math.ceil(expectedWords * 0.6);
  const freePhoneticText = utteranceMismatch ? freeRecognitionPhoneticText(freeRecognizedText) : "";
  const phoneticText = freePhoneticText
    || (partialAssessment && targetPhoneticText
      ? `推定全文: ${targetPhoneticText} / 弱く拾えた音: ${referencePhoneticText}`
      : referencePhoneticText);
  const soundSignature = buildSoundSignature(words);
  const mirrorTimeline = buildMirrorTimeline({ words, mirroredWords, speechFeatures });
  const severeWords = words.filter((word) => wordSeverity(word) !== "ok").map((word) => word.original);
  const targetActions = buildTargetActions(speechFeatures, severeWords, conservative);
  const targetContrast = linking && targetActions.length
    ? targetActions.join(" ")
    : severeWords.length
    ? targetActions.length ? targetActions.join(" ") : `${severeWords.join(", ")} を短く、子音の輪郭を残して言う練習が必要です。`
    : couldBlindSpot
      ? conservative
        ? "Azureスコアは高いため、Could の母音長と語尾 d が本当に崩れているか録音で確認してください。"
        : "Could の母音を短くし、語尾 d を日本語の「ド」まで強く残さないようにします。"
      : "大きな崩れは少ないため、人間の耳で違和感がある箇所を追加で比較してください。";

  const allowReferenceFallback = utteranceMismatch && (
    speechFeatures.consonantWeaknessLevel !== "none"
    || speechFeatures.articulationMirrorLevel !== "clear"
    || speechFeatures.voiceMirrorLevel !== "clear"
    || speechFeatures.ambiguityLevel === "high"
    || ["medium", "high"].includes(maxSeverity)
  );
  const pronunciationAlternateMeaning = alternateWordMeaningFromPronunciation({ contrastSet, words, mirroredWords, freeRecognizedText });
  const preferReference = !pronunciationAlternateMeaning && minimalPairCriticalWordIsClean(contrastSet, words);
  const meaning = pronunciationAlternateMeaning || getMeaning(contrastSet, freeRecognizedText, utteranceCheck, { allowReferenceFallback, preferReference });
  const useFreeMeaningNaturalMirror = utteranceMismatch && meaning.source === "freeRecognition";
  const voiceSpeechFeatures = useFreeMeaningNaturalMirror ? neutralizeReferenceAssessmentForFreeMeaning(speechFeatures) : speechFeatures;
  const voiceSoundSignature = useFreeMeaningNaturalMirror ? neutralSoundSignature() : soundSignature;
  const voiceMirrorTimeline = useFreeMeaningNaturalMirror ? neutralMirrorTimelineForFreeMeaning(mirrorTimeline, voiceSpeechFeatures) : mirrorTimeline;
  const voiceSeverity = useFreeMeaningNaturalMirror ? "ok" : maxSeverity;
  const mirrorLocalEvents = buildMirrorLocalEvents({ meaning, words, mirroredWords, speechFeatures: voiceSpeechFeatures, soundSignature: voiceSoundSignature, freeRecognizedText });
  const voicePlan = buildVoicePlan({ meaning, severity: voiceSeverity, muffled: useFreeMeaningNaturalMirror ? false : muffled, speechFeatures: voiceSpeechFeatures, soundSignature: voiceSoundSignature });
  const voiceScript = timelineToVoiceScript({ meaning, mirrorTimeline: voiceMirrorTimeline, voicePlan, speechFeatures: voiceSpeechFeatures, soundSignature: voiceSoundSignature, mirrorLocalEvents });
  const listenerExperience = utteranceMismatch
    ? meaning.source === "referenceFallback"
      ? `${meaning.listenerBase} Mirror Voiceは、選択中の例文の意味を保ったまま、子音の弱さや音の崩れを反映する確認用のミラーです。`
      : meaning.source === "reference"
        ? meaning.listenerBase
        : `${meaning.listenerBase} 参照文なし認識では「${freeRecognizedText || "別の英文"}」として聞こえている可能性があるため、カタカナと日本語訳は自由認識ベースの仮説として表示しています。`
    : makeListenerExperience({ meaning, phoneticText, severity: maxSeverity, reasons, couldBlindSpot, muffled, conservative, linking });
  const voiceText = makeVoiceText({ meaning, severity: voiceSeverity, couldBlindSpot: useFreeMeaningNaturalMirror ? false : couldBlindSpot, muffled: useFreeMeaningNaturalMirror ? false : muffled, voicePlan, speechFeatures: voiceSpeechFeatures });
  const deviationModel = buildDeviationModel({ contrastSet, words, scores, consonantMin, muffled, couldBlindSpot, speechFeatures });

  return {
    phoneticText,
    referencePhoneticText,
    targetPhoneticText,
    phoneticSource: freePhoneticText ? "freeRecognition" : partialAssessment ? "mixedPartialAssessment" : "pronunciationAssessment",
    heardAsJapanese: phoneticText,
    meaningJapanese: meaning.japanese,
    meaningSource: meaning.source,
    meaningSourceText: meaning.sourceText,
    // 参照英文の単語ではなく、実際にそう聞こえた(あるいはそう扱われた)単語を
    // 表示側で示せるようにする一覧。文全体が言い換わったケース(she/sea,
    // live/leaveなど)と、単語単位で別語として扱ったケース(alternate_word_local)
    // の両方をまとめる。
    wordHearingOverrides: [
      ...(meaning.alternateWordSwap ? [meaning.alternateWordSwap] : []),
      ...mirrorLocalEvents.events
        .filter((event) => event.issueType === "alternate_word_local")
        .map((event) => ({ from: String(event.word || "").toLowerCase(), to: event.alternateWord }))
    ],
    freeRecognizedText: freeRecognizedText || "",
    utteranceCheck,
    listenerExperience,
    voiceText,
    voiceScript,
    mirrorTimeline,
    mirrorLocalEvents,
    soundSignature,
    deviationModel,
    speechFeatures,
    voicePlan,
    voiceSpeechFeatures,
    voiceSoundSignature,
    severity: maxSeverity,
    confidence: adjustedConfidence,
    reasons: [...new Set(reasons)].slice(0, 4),
    targetContrast,
    targetActions,
    debug: {
      consonantMin,
      couldBlindSpot,
      muffled,
      conservative,
      linking,
      soundSignature,
      meaningSource: meaning.source
    }
  };
}

module.exports = { generateJapaneseMirror };
