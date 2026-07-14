function readAscii(buffer, offset, length) {
  if (offset + length > buffer.length) return "";
  return buffer.toString("ascii", offset, offset + length);
}

function parseWavPcm(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) return null;
  if (readAscii(buffer, 0, 4) !== "RIFF" || readAscii(buffer, 8, 4) !== "WAVE") return null;

  let offset = 12;
  let format = null;
  let dataOffset = null;
  let dataSize = null;

  while (offset + 8 <= buffer.length) {
    const id = readAscii(buffer, offset, 4);
    const size = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (id === "fmt ") {
      format = {
        audioFormat: buffer.readUInt16LE(chunkStart),
        channels: buffer.readUInt16LE(chunkStart + 2),
        sampleRate: buffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkStart + 14)
      };
    }

    if (id === "data") {
      dataOffset = chunkStart;
      dataSize = Math.min(size, buffer.length - chunkStart);
      break;
    }

    offset = chunkStart + size + (size % 2);
  }

  if (!format || dataOffset === null || !dataSize) return null;
  if (format.audioFormat !== 1 || format.bitsPerSample !== 16 || format.channels < 1) return null;

  const frameCount = Math.floor(dataSize / (format.channels * 2));
  const samples = new Float32Array(frameCount);
  let cursor = dataOffset;

  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let ch = 0; ch < format.channels; ch += 1) {
      sum += buffer.readInt16LE(cursor) / 32768;
      cursor += 2;
    }
    samples[i] = sum / format.channels;
  }

  return { samples, sampleRate: format.sampleRate };
}

function rms(samples, start, end) {
  let sum = 0;
  const count = Math.max(1, end - start);
  for (let i = start; i < end; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / count);
}

function estimatePitchForFrame(samples, sampleRate, start, size) {
  const end = Math.min(samples.length, start + size);
  const energy = rms(samples, start, end);
  if (energy < 0.012) return null;

  const minLag = Math.floor(sampleRate / 450);
  const maxLag = Math.floor(sampleRate / 65);
  let bestLag = 0;
  let bestScore = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    let left = 0;
    let right = 0;
    for (let i = start; i + lag < end; i += 1) {
      const a = samples[i];
      const b = samples[i + lag];
      corr += a * b;
      left += a * a;
      right += b * b;
    }
    const denom = Math.sqrt(left * right) || 1;
    const score = corr / denom;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (bestScore < 0.35 || !bestLag) return null;
  return { hz: sampleRate / bestLag, confidence: bestScore, energy };
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  return clean[Math.floor(clean.length / 2)];
}

function semitoneDiff(toHz, fromHz) {
  if (!Number.isFinite(toHz) || !Number.isFinite(fromHz) || toHz <= 0 || fromHz <= 0) return 0;
  return 12 * Math.log2(toHz / fromHz);
}

function buildPitchContour(frames) {
  const zoneCount = Math.min(5, Math.max(3, frames.length));
  const zones = [];
  for (let i = 0; i < zoneCount; i += 1) {
    const start = Math.floor((frames.length * i) / zoneCount);
    const end = Math.max(start + 1, Math.floor((frames.length * (i + 1)) / zoneCount));
    const slice = frames.slice(start, end);
    const hz = median(slice.map((frame) => frame.hz));
    zones.push({
      index: i,
      startMs: slice[0]?.centerMs ?? null,
      endMs: slice[slice.length - 1]?.centerMs ?? null,
      hz: hz ? Math.round(hz) : null
    });
  }

  const moves = [];
  for (let i = 0; i < zones.length - 1; i += 1) {
    const semitones = Number(semitoneDiff(zones[i + 1].hz, zones[i].hz).toFixed(1));
    const direction = semitones >= 0.8 ? "rise" : semitones <= -0.8 ? "fall" : "flat";
    moves.push({ from: i, to: i + 1, semitones, direction });
  }
  const significantMoves = moves.filter((move) => move.direction !== "flat");
  const directionChanges = significantMoves.reduce((count, move, index) => {
    if (index === 0) return 0;
    const prev = significantMoves[index - 1].direction;
    return prev !== move.direction ? count + 1 : count;
  }, 0);
  const rangeSemitones = zones.length
    ? Number(semitoneDiff(Math.max(...zones.map((zone) => zone.hz || 0)), Math.min(...zones.map((zone) => zone.hz || Infinity))).toFixed(1))
    : 0;

  return {
    zones,
    moves,
    directionChanges,
    rangeSemitones,
    pattern: directionChanges >= 2 || (directionChanges >= 1 && rangeSemitones >= 2.8)
      ? "zigzag"
      : significantMoves.some((move) => move.direction === "rise") && significantMoves.some((move) => move.direction === "fall")
        ? "mixed"
        : "simple"
  };
}

function toSemitone(f0Hz, medianF0OfSpeaker) {
  return semitoneDiff(f0Hz, medianF0OfSpeaker);
}

function sampleHzAt(frames, centerMs, windowMs = 60) {
  if (!Array.isArray(frames) || !frames.length) return null;
  const inWindow = frames.filter((frame) => Math.abs(frame.centerMs - centerMs) <= windowMs);
  if (inWindow.length) return median(inWindow.map((frame) => frame.hz));
  const nearest = frames.reduce((best, frame) => (
    Math.abs(frame.centerMs - centerMs) < Math.abs(best.centerMs - centerMs) ? frame : best
  ), frames[0]);
  return nearest.hz;
}

function nearestOctave(hz, anchorHz) {
  if (!Number.isFinite(hz) || !Number.isFinite(anchorHz) || hz <= 0 || anchorHz <= 0) return hz;
  let adjusted = hz;
  while (adjusted / anchorHz > 1.65) adjusted /= 2;
  while (adjusted / anchorHz < 0.6) adjusted *= 2;
  return adjusted;
}

function stabilizePitchFrames(frames) {
  const sorted = frames
    .filter((frame) => frame.confidence >= 0.38)
    .sort((a, b) => a.centerMs - b.centerMs);
  if (sorted.length < 4) return sorted;

  const anchor = median(sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.45))).map((frame) => frame.hz));
  let previous = anchor;
  return sorted.map((frame) => {
    const anchorHz = previous || anchor;
    const hz = nearestOctave(frame.hz, anchorHz);
    previous = hz;
    return { ...frame, rawHz: frame.hz, hz };
  });
}

function extractPitchTrack(buffer) {
  const parsed = parseWavPcm(buffer);
  if (!parsed) {
    return { available: false, reason: "unsupported-wav" };
  }

  const { samples, sampleRate } = parsed;
  const frameSize = Math.max(512, Math.round(sampleRate * 0.04));
  const hopSize = Math.max(256, Math.round(sampleRate * 0.02));
  const frames = [];

  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const pitch = estimatePitchForFrame(samples, sampleRate, start, frameSize);
    if (pitch) frames.push({ ...pitch, centerMs: Math.round(((start + frameSize / 2) / sampleRate) * 1000) });
  }

  if (frames.length < 4) {
    return { available: false, reason: "not-enough-voiced-frames", voicedFrameCount: frames.length };
  }

  const durationMs = Math.round((samples.length / sampleRate) * 1000);
  const stableFrames = stabilizePitchFrames(frames);
  if (stableFrames.length < 4) {
    return { available: false, reason: "not-enough-stable-pitch-frames", durationMs, voicedFrameCount: frames.length, stableFrameCount: stableFrames.length };
  }

  const medianHz = median(stableFrames.map((frame) => frame.hz));
  if (!medianHz) {
    return { available: false, reason: "missing-median-f0", durationMs, voicedFrameCount: frames.length };
  }

  return {
    available: true,
    durationMs,
    voicedFrameCount: frames.length,
    frames: stableFrames,
    medianHz
  };
}

function analyzePitchFromWav(buffer) {
  const track = extractPitchTrack(buffer);
  if (!track.available) return { ...track, basis: "self-relative-fallback" };

  const { durationMs, voicedFrameCount, frames: sortedFrames } = track;
  const finalCount = Math.max(2, Math.ceil(sortedFrames.length * 0.16));
  const earlyCount = Math.max(2, Math.floor((sortedFrames.length - finalCount) * 0.55));
  const earlyFrames = sortedFrames.slice(0, earlyCount);
  const finalFrames = sortedFrames.slice(-finalCount);
  const earlyHz = median(earlyFrames.map((frame) => frame.hz));
  const finalHz = median(finalFrames.map((frame) => frame.hz));

  if (!earlyHz || !finalHz) {
    return { available: false, reason: "missing-comparison-window", durationMs, voicedFrameCount };
  }

  const riseRatio = finalHz / earlyHz;
  const riseSemitones = 12 * Math.log2(riseRatio);
  const finalRise = riseSemitones >= 1.4;
  const finalFall = riseSemitones <= -1.4;
  const contour = buildPitchContour(sortedFrames);

  return {
    available: true,
    basis: "self-relative-fallback",
    durationMs,
    voicedFrameCount,
    stableFrameCount: sortedFrames.length,
    voicedStartMs: sortedFrames[0]?.centerMs ?? null,
    voicedEndMs: sortedFrames[sortedFrames.length - 1]?.centerMs ?? null,
    comparedEarlyFrames: earlyFrames.length,
    comparedFinalFrames: finalFrames.length,
    earlyHz: Math.round(earlyHz),
    finalHz: Math.round(finalHz),
    riseRatio: Number(riseRatio.toFixed(2)),
    riseSemitones: Number(riseSemitones.toFixed(1)),
    finalRise,
    finalFall,
    contour,
    confidence: voicedFrameCount >= 8 ? "medium" : "low"
  };
}

module.exports = { analyzePitchFromWav, extractPitchTrack, toSemitone, sampleHzAt };
