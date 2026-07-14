function round(value) {
  return value === null || value === undefined ? null : Math.round(Number(value) || 0);
}

function criticalConcernCount(attempt) {
  return Array.isArray(attempt.criticalConcerns) ? attempt.criticalConcerns.length : 0;
}

function scoreValue(attempt, key) {
  return Number(attempt?.scores?.[key] ?? 0);
}

function attemptRiskScore(attempt) {
  const criticalPenalty = criticalConcernCount(attempt) * 25;
  const blindSpotPenalty = attempt?.flags?.couldBlindSpot ? 18 : 0;
  const muffledPenalty = attempt?.flags?.muffled ? 12 : 0;
  const accuracyGap = Math.max(0, 100 - scoreValue(attempt, "accuracy"));
  const prosodyGap = Math.max(0, 100 - scoreValue(attempt, "prosody")) * 0.25;
  const consonantGap = attempt.consonantMin === null || attempt.consonantMin === undefined ? 0 : Math.max(0, 88 - Number(attempt.consonantMin)) * 0.4;

  return round(criticalPenalty + blindSpotPenalty + muffledPenalty + accuracyGap + prosodyGap + consonantGap);
}

function summarizeAttempt(attempt, index) {
  return {
    id: attempt.id || `attempt-${index + 1}`,
    label: attempt.label || `Attempt ${index + 1}`,
    contrastSetId: attempt.contrastSet?.id || attempt.contrastSetId || null,
    referenceText: attempt.referenceText || attempt.contrastSet?.text || "",
    recognizedText: attempt.recognizedText || "",
    scores: attempt.scores || {},
    consonantAvg: attempt.consonantAvg,
    consonantMin: attempt.consonantMin,
    blindSpotJudgment: attempt.blindSpotJudgment || "",
    mirrorPreview: attempt.mirrorPreview || "",
    mirror: attempt.mirror || null,
    flags: attempt.flags || {},
    criticalConcernCount: criticalConcernCount(attempt),
    riskScore: attemptRiskScore(attempt)
  };
}

function compareAttempts(attempts) {
  const summarized = attempts.map(summarizeAttempt);
  const sortedByRisk = [...summarized].sort((a, b) => b.riskScore - a.riskScore);
  const sortedByAccuracy = [...summarized].sort((a, b) => scoreValue(b, "accuracy") - scoreValue(a, "accuracy"));
  const baseline = summarized[0] || null;
  const latest = summarized[summarized.length - 1] || null;

  const deltas = baseline && latest
    ? {
        from: baseline.id,
        to: latest.id,
        accuracy: round(scoreValue(latest, "accuracy") - scoreValue(baseline, "accuracy")),
        fluency: round(scoreValue(latest, "fluency") - scoreValue(baseline, "fluency")),
        prosody: round(scoreValue(latest, "prosody") - scoreValue(baseline, "prosody")),
        consonantMin: baseline.consonantMin === null || latest.consonantMin === null ? null : round(Number(latest.consonantMin) - Number(baseline.consonantMin))
      }
    : null;

  const blindSpotCount = summarized.filter((attempt) => attempt.flags?.couldBlindSpot).length;
  const muffledCount = summarized.filter((attempt) => attempt.flags?.muffled).length;
  const criticalConcernTotal = summarized.reduce((sum, attempt) => sum + attempt.criticalConcernCount, 0);

  let sessionJudgment = "No attempts yet";
  let recommendation = "録音して診断すると、attempt間の差分がここに出ます。";

  if (summarized.length > 0) {
    if (blindSpotCount > 0 && criticalConcernTotal === 0) {
      sessionJudgment = "Human-listener mirror needed";
      recommendation = "Azureは高評価でも、重要語が日本語寄りに聞こえる可能性があります。次は単語単体と文中発音を並べて比較してください。";
    } else if (criticalConcernTotal > 0) {
      sessionJudgment = "Azure-detected contrast";
      recommendation = "Azureが拾った重要語・子音の弱さを中心に、Mirror previewへ反映してください。";
    } else if (muffledCount > 0) {
      sessionJudgment = "Muffled articulation pattern";
      recommendation = "子音の最小値と録音音量を見ながら、こもり感の再現ルールを調整してください。";
    } else {
      sessionJudgment = "Stable high-score attempts";
      recommendation = "Azure上は安定しています。人間の耳で違和感があるattemptだけを残し、独自mirrorルールの教師例にしてください。";
    }
  }

  return {
    version: "0.10.0-deviation-model",
    attemptCount: summarized.length,
    attempts: summarized,
    bestAttempt: sortedByAccuracy[0] || null,
    riskiestAttempt: sortedByRisk[0] || null,
    deltas,
    pattern: {
      blindSpotCount,
      muffledCount,
      criticalConcernTotal
    },
    sessionJudgment,
    recommendation
  };
}

module.exports = { compareAttempts };
