/*
 * Generator audio untuk video Remotion.
 *
 * Jalankan: npm run generate:audio
 *
 * Script ini menulis file WAV 16-bit 44.1 kHz tanpa dependensi eksternal:
 * - Musik ambient 10 detik untuk Video10Detik
 * - Musik chiptune 20 detik untuk PixelVlog20Detik
 * - Ambience sunset / night / dawn untuk PixelVlog20Detik
 * - Whoosh transisi yang dipakai kedua video
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 44100;
const TAU = Math.PI * 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const mulberry32 = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createBuffer = (duration, channelCount = 2) =>
  Array.from(
    { length: channelCount },
    () => new Float32Array(Math.round(duration * SR)),
  );

const panGains = (pan) => {
  const angle = ((clamp(pan, -1, 1) + 1) / 2) * (Math.PI / 2);
  return [Math.cos(angle), Math.sin(angle)];
};

const envelope = (t, duration, attack, decay, sustain, release) => {
  if (t < 0 || t >= duration) {
    return 0;
  }

  const a = Math.max(0.0005, attack);
  const d = Math.max(0.0005, decay);
  const r = Math.max(0.0005, release);

  if (t < a) {
    return Math.min(1, t / a);
  }

  if (t < a + d) {
    return 1 - (1 - sustain) * ((t - a) / d);
  }

  const releaseStart = Math.max(a + d, duration - r);

  if (t < releaseStart) {
    return sustain;
  }

  return sustain * Math.max(0, 1 - (t - releaseStart) / r);
};

const addVoice = (buffer, options) => {
  const {
    start = 0,
    duration,
    freq,
    type = "sine",
    gain = 0.1,
    pan = 0,
    attack = 0.01,
    decay = 0.1,
    sustain = 0.7,
    release = 0.2,
    vibratoDepth = 0,
    vibratoRate = 5,
    detuneCents = 0,
    duty = 0.5,
    cutoff = 0,
    glideFrom = null,
    glideTime = 0.2,
    seed = 1,
  } = options;

  const totalSamples = buffer[0].length;
  const startSample = Math.round(start * SR);
  const samples = Math.floor(duration * SR);
  const frequency = freq * Math.pow(2, detuneCents / 1200);
  const [panL, panR] = buffer.length === 1 ? [1, 1] : panGains(pan);
  const noise = mulberry32(seed);
  const alpha = cutoff > 0 ? 1 - Math.exp((-TAU * cutoff) / SR) : 1;

  let phase = 0;
  let filtered = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= totalSamples) {
      continue;
    }

    const t = i / SR;
    const env = envelope(t, duration, attack, decay, sustain, release);

    if (env <= 0.000001) {
      continue;
    }

    const glide =
      glideFrom == null
        ? frequency
        : glideFrom +
          (frequency - glideFrom) * clamp(t / glideTime, 0, 1);

    phase +=
      (glide * (1 + vibratoDepth * Math.sin(TAU * vibratoRate * t))) / SR;
    phase -= Math.floor(phase);

    let sample;

    switch (type) {
      case "triangle":
        sample = 2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;
        break;
      case "saw":
        sample = 2 * (phase - Math.floor(phase + 0.5));
        break;
      case "square":
        sample = phase < duty ? 1 : -1;
        break;
      case "noise":
        sample = noise() * 2 - 1;
        break;
      default:
        sample = Math.sin(TAU * phase);
    }

    sample *= gain * env;

    const output =
      cutoff > 0 ? (filtered += alpha * (sample - filtered)) : sample;

    buffer[0][index] += output * panL;

    if (buffer[1]) {
      buffer[1][index] += output * panR;
    }
  }
};

const addDelay = (
  buffer,
  { delay = 0.2, feedback = 0.25, mix = 0.12, damp = 0.35 } = {},
) => {
  for (const channel of buffer) {
    const delaySamples = Math.max(1, Math.floor(delay * SR));
    const line = new Float32Array(delaySamples);
    let index = 0;
    let lowpassed = 0;

    for (let i = 0; i < channel.length; i++) {
      const delayed = line[index];
      lowpassed += damp * (delayed - lowpassed);
      line[index] = channel[i] + lowpassed * feedback;
      channel[i] = channel[i] * (1 - mix) + delayed * mix;
      index = (index + 1) % delaySamples;
    }
  }
};

const fade = (buffer, duration, fadeIn = 0.05, fadeOut = 0.2) => {
  const length = Math.min(buffer[0].length, Math.round(duration * SR));
  const inSamples = Math.min(length, Math.floor(fadeIn * SR));
  const outSamples = Math.min(length, Math.floor(fadeOut * SR));

  for (const channel of buffer) {
    for (let i = 0; i < inSamples; i++) {
      channel[i] *= i / inSamples;
    }

    for (let i = 0; i < outSamples; i++) {
      channel[length - 1 - i] *= i / outSamples;
    }
  }
};

const normalize = (buffer, peak = 0.9) => {
  let max = 0;

  for (const channel of buffer) {
    for (const value of channel) {
      max = Math.max(max, Math.abs(value));
    }
  }

  if (max === 0) {
    return;
  }

  const scale = peak / max;

  for (const channel of buffer) {
    for (let i = 0; i < channel.length; i++) {
      channel[i] *= scale;
    }
  }
};

const getStats = (buffer) => {
  let peak = 0;
  let sum = 0;
  let count = 0;

  for (const channel of buffer) {
    for (const value of channel) {
      peak = Math.max(peak, Math.abs(value));
      sum += value * value;
      count++;
    }
  }

  return {
    peak: peak.toFixed(3),
    rms: Math.sqrt(sum / count).toFixed(3),
  };
};

const writeWav = (relativePath, buffer) => {
  const channelCount = buffer.length;
  const samples = buffer[0].length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = samples * blockAlign;
  const file = Buffer.alloc(44 + dataSize);

  file.write("RIFF", 0);
  file.writeUInt32LE(36 + dataSize, 4);
  file.write("WAVE", 8);
  file.write("fmt ", 12);
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(channelCount, 22);
  file.writeUInt32LE(SR, 24);
  file.writeUInt32LE(SR * blockAlign, 28);
  file.writeUInt16LE(blockAlign, 32);
  file.writeUInt16LE(16, 34);
  file.write("data", 36);
  file.writeUInt32LE(dataSize, 40);

  let offset = 44;

  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const sample = clamp(buffer[channel][i], -1, 1);
      file.writeInt16LE(Math.round(sample * 32767), offset);
      offset += 2;
    }
  }

  const outputPath = join(ROOT, relativePath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, file);

  const stats = getStats(buffer);
  console.log(
    `  ${relativePath}  ${(file.length / 1024 / 1024).toFixed(2)} MB  peak=${stats.peak} rms=${stats.rms}`,
  );
};

const NOTE_OFFSETS = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const noteFreq = (name) => {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(name);

  if (!match) {
    throw new Error(`Nama nada tidak valid: ${name}`);
  }

  const midi = (Number(match[2]) + 1) * 12 + NOTE_OFFSETS[match[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
};

/* ------------------------------- Drum kit -------------------------------- */

const addKick = (buffer, start, gain = 0.5, pan = 0) => {
  const duration = 0.28;
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  const [panL, panR] = buffer.length === 1 ? [1, 1] : panGains(pan);
  let phase = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const freq = 45 + 120 * Math.exp(-t * 35);
    phase += freq / SR;

    const env = Math.exp(-t * 16) * (1 - Math.exp(-t * 800));
    const sample = Math.sin(TAU * phase) * env * gain;

    buffer[0][index] += sample * panL;

    if (buffer[1]) {
      buffer[1][index] += sample * panR;
    }
  }
};

const addSnare = (buffer, start, gain = 0.2, pan = 0, seed = 1) => {
  const duration = 0.2;
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  const [panL, panR] = buffer.length === 1 ? [1, 1] : panGains(pan);
  const noise = mulberry32(seed);
  const alpha = 1 - Math.exp((-TAU * 1400) / SR);
  let lowpassed = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const white = noise() * 2 - 1;
    lowpassed += alpha * (white - lowpassed);
    const high = white - lowpassed;
    const env = Math.exp(-t * 18) * (1 - Math.exp(-t * 1200));
    const tone = Math.sin(TAU * 190 * t) * Math.exp(-t * 24) * 0.4;
    const sample = (high * 0.8 + tone) * env * gain;

    buffer[0][index] += sample * panL;

    if (buffer[1]) {
      buffer[1][index] += sample * panR;
    }
  }
};

const addHat = (buffer, start, gain = 0.04, open = false, pan = 0.15) => {
  const duration = open ? 0.14 : 0.05;
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  const [panL, panR] = buffer.length === 1 ? [1, 1] : panGains(pan);
  const noise = mulberry32(Math.floor(start * 1000) + 17);
  const alpha = 1 - Math.exp((-TAU * 6000) / SR);
  let lowpassed = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const white = noise() * 2 - 1;
    lowpassed += alpha * (white - lowpassed);
    const high = white - lowpassed;
    const env = Math.exp(-t * (open ? 22 : 65));
    const sample = high * env * gain;

    buffer[0][index] += sample * panL;

    if (buffer[1]) {
      buffer[1][index] += sample * panR;
    }
  }
};

const addCrash = (buffer, start, gain = 0.1) => {
  const duration = 1.4;
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  const noise = mulberry32(991);
  const alpha = 1 - Math.exp((-TAU * 4200) / SR);
  let lowpassed = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const white = noise() * 2 - 1;
    lowpassed += alpha * (white - lowpassed);
    const high = white - lowpassed;
    const env = Math.exp(-t * 3.2) * (1 - Math.exp(-t * 200));
    const sample = high * env * gain;

    buffer[0][index] += sample;
    buffer[1][index] += sample;
  }
};

/* ----------------------------- Ambience FX -------------------------------- */

const addNoiseBurst = (
  buffer,
  { start, duration, gain, highpass = 2000, seed = 1 },
) => {
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  const noise = mulberry32(seed);
  const alpha = 1 - Math.exp((-TAU * highpass) / SR);
  let lowpassed = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const white = noise() * 2 - 1;
    lowpassed += alpha * (white - lowpassed);
    const high = white - lowpassed;
    const env =
      Math.exp(-t * Math.max(8, 4 / duration)) *
      (1 - Math.exp(-t * 3000));

    buffer[0][index] += high * env * gain;
  }
};

const addCricket = (buffer, start, freq, gain) => {
  const duration = 0.024;
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  let phase = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const p = t / duration;
    const modulated = freq * (1 + 0.03 * Math.sin(TAU * 40 * t));
    phase += modulated / SR;
    const env = Math.pow(Math.sin(Math.PI * p), 1.5);

    buffer[0][index] += Math.sin(TAU * phase) * env * gain;
  }
};

const addBirdNote = (buffer, start, from, to, duration, gain) => {
  const samples = Math.floor(duration * SR);
  const startSample = Math.round(start * SR);
  let phase = 0;

  for (let i = 0; i < samples; i++) {
    const index = startSample + i;

    if (index < 0 || index >= buffer[0].length) {
      continue;
    }

    const t = i / SR;
    const p = t / duration;
    const freq = from + (to - from) * p + 40 * Math.sin(TAU * 30 * t);
    phase += freq / SR;
    const env = Math.pow(Math.sin(Math.PI * p), 0.8);
    const sample =
      (Math.sin(TAU * phase) + 0.16 * Math.sin(TAU * phase * 2)) *
      env *
      gain;

    buffer[0][index] += sample;
  }
};

const addGull = (buffer, start, pan, gain) => {
  const calls = [
    { delay: 0, from: 1750, to: 1280, duration: 0.28 },
    { delay: 0.34, from: 1680, to: 1320, duration: 0.24 },
  ];

  for (const call of calls) {
    const samples = Math.floor(call.duration * SR);
    const startSample = Math.round((start + call.delay) * SR);
    let phase = 0;

    for (let i = 0; i < samples; i++) {
      const index = startSample + i;

      if (index < 0 || index >= buffer[0].length) {
        continue;
      }

      const t = i / SR;
      const p = t / call.duration;
      const freq =
        call.from +
        (call.to - call.from) * p +
        60 * Math.sin(TAU * 22 * t);
      phase += freq / SR;
      const env = Math.pow(Math.sin(Math.PI * clamp(p, 0, 1)), 0.7);
      const sample =
        (Math.sin(TAU * phase) + 0.2 * Math.sin(TAU * phase * 2)) *
        env *
        gain *
        (1 - 0.25 * pan);

      buffer[0][index] += sample;
    }
  }
};

/* --------------------------------- Musik ---------------------------------- */

const renderAmbient = () => {
  const duration = 10;
  const buffer = createBuffer(duration, 2);

  const sections = [
    {
      start: 0,
      bass: "A2",
      pad: ["A2", "E3", "G3", "B3", "C4", "E4"],
      arp: ["A4", "C5", "E5", "G5"],
    },
    {
      start: 2.5,
      bass: "F2",
      pad: ["F2", "C3", "E3", "G3", "A3", "C4"],
      arp: ["F4", "A4", "C5", "E5"],
    },
    {
      start: 5,
      bass: "C3",
      pad: ["C3", "G3", "B3", "D4", "E4"],
      arp: ["C5", "E5", "G5", "B5"],
    },
    {
      start: 7.5,
      bass: "G2",
      pad: ["G2", "D3", "B3", "D4", "A4"],
      arp: ["G4", "B4", "D5", "A5"],
    },
  ];

  sections.forEach((section, sectionIndex) => {
    section.pad.forEach((note, noteIndex) => {
      const spread =
        section.pad.length > 1
          ? noteIndex / (section.pad.length - 1) - 0.5
          : 0;

      addVoice(buffer, {
        start: section.start,
        duration: 3.1,
        freq: noteFreq(note),
        type: "saw",
        gain: noteIndex === 0 ? 0.045 : 0.03,
        pan: spread * 0.7,
        attack: 0.8,
        decay: 0.6,
        sustain: 0.8,
        release: 1.3,
        detuneCents: noteIndex % 2 === 0 ? -4 : 4,
        cutoff: 900 + sectionIndex * 120,
      });

      if (noteIndex > 0) {
        addVoice(buffer, {
          start: section.start + 0.02,
          duration: 3.1,
          freq: noteFreq(note),
          type: "triangle",
          gain: 0.016,
          pan: spread * -0.5,
          attack: 1,
          decay: 0.5,
          sustain: 0.85,
          release: 1.4,
          detuneCents: 3,
          cutoff: 1600,
        });
      }
    });

    addVoice(buffer, {
      start: section.start,
      duration: 2.6,
      freq: noteFreq(section.bass),
      type: "sine",
      gain: 0.16,
      attack: 0.12,
      decay: 0.4,
      sustain: 0.8,
      release: 0.8,
    });

    const arpPattern = [0, 1, 2, 3, 2, 1, 0, 2];

    for (let step = 0; step < 20; step++) {
      const start = section.start + step * 0.25 + 0.12;

      if (start > 9.5) {
        break;
      }

      addVoice(buffer, {
        start,
        duration: 0.32,
        freq: noteFreq(section.arp[arpPattern[step % arpPattern.length]]),
        type: "sine",
        gain: 0.036,
        pan: step % 2 === 0 ? -0.45 : 0.45,
        attack: 0.004,
        decay: 0.18,
        sustain: 0,
        release: 0.1,
      });
    }
  });

  const shimmers = [
    { start: 1, note: "E6", pan: -0.5 },
    { start: 3.5, note: "A5", pan: 0.5 },
    { start: 6, note: "B5", pan: -0.3 },
    { start: 8.5, note: "D6", pan: 0.4 },
  ];

  for (const shimmer of shimmers) {
    addVoice(buffer, {
      start: shimmer.start,
      duration: 1.8,
      freq: noteFreq(shimmer.note),
      type: "sine",
      gain: 0.022,
      pan: shimmer.pan,
      attack: 0.7,
      decay: 0.3,
      sustain: 0.7,
      release: 0.8,
      vibratoDepth: 0.003,
      vibratoRate: 4.2,
    });
  }

  const noise = mulberry32(7);
  const airAlpha = 1 - Math.exp((-TAU * 700) / SR);
  let air = 0;

  for (let i = 0; i < buffer[0].length; i++) {
    const t = i / SR;
    const white = noise() * 2 - 1;
    air += airAlpha * (white - air);
    const level = 0.012 * (0.6 + 0.4 * Math.sin(TAU * 0.07 * t));
    buffer[0][i] += air * level;
    buffer[1][i] += air * level;
  }

  addDelay(buffer, {
    delay: 0.31,
    feedback: 0.32,
    mix: 0.16,
    damp: 0.45,
  });
  fade(buffer, duration, 0.6, 1.8);
  normalize(buffer, 0.82);

  return buffer;
};

const renderChiptune = () => {
  const duration = 20;
  const buffer = createBuffer(duration, 2);
  const beat = 0.5;
  const bar = beat * 4;

  const sections = [
    {
      start: 2,
      bars: 2,
      pad: ["C4", "E4", "G4"],
      arp: ["C5", "E5", "G5", "C6"],
      bass: ["C2", "G2", "C3"],
    },
    {
      start: 6,
      bars: 2,
      pad: ["G3", "B3", "D4"],
      arp: ["G4", "B4", "D5", "G5"],
      bass: ["G2", "D3", "G3"],
    },
    {
      start: 10,
      bars: 2,
      pad: ["A3", "C4", "E4"],
      arp: ["A4", "C5", "E5", "A5"],
      bass: ["A2", "E3", "A3"],
    },
    {
      start: 14,
      bars: 2,
      pad: ["F3", "A3", "C4"],
      arp: ["F4", "A4", "C5", "F5"],
      bass: ["F2", "C3", "F3"],
    },
  ];

  // Intro: arpeggio C yang mengembang.
  const introPattern = [0, 1, 2, 3, 2, 1, 2, 3];

  for (let step = 0; step < 16; step++) {
    addVoice(buffer, {
      start: step * (beat / 4),
      duration: beat / 4 - 0.01,
      freq: noteFreq(
        ["C5", "E5", "G5", "C6"][introPattern[step % introPattern.length]],
      ),
      type: "square",
      duty: 0.25,
      gain: 0.024,
      pan: step % 2 === 0 ? -0.4 : 0.4,
      attack: 0.002,
      decay: 0.06,
      sustain: 0.2,
      release: 0.03,
      cutoff: 5000,
    });
  }

  for (const section of sections) {
    const padDuration = section.bars * bar + 0.25;

    section.pad.forEach((note, noteIndex) => {
      const spread =
        section.pad.length > 1
          ? noteIndex / (section.pad.length - 1) - 0.5
          : 0;

      addVoice(buffer, {
        start: section.start,
        duration: padDuration,
        freq: noteFreq(note),
        type: "triangle",
        gain: 0.05,
        pan: spread * 0.5,
        attack: 0.12,
        decay: 0.2,
        sustain: 0.7,
        release: 0.5,
        detuneCents: noteIndex % 2 === 0 ? -3 : 3,
        cutoff: 1800,
      });

      addVoice(buffer, {
        start: section.start,
        duration: padDuration,
        freq: noteFreq(note),
        type: "saw",
        gain: 0.018,
        pan: spread * -0.4,
        attack: 0.2,
        decay: 0.3,
        sustain: 0.65,
        release: 0.6,
        cutoff: 850,
      });
    });

    const bassPattern = [0, 0, 1, 0, 2, 0, 1, 0];
    const arpPattern = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 1, 3];

    for (let barIndex = 0; barIndex < section.bars; barIndex++) {
      const barStart = section.start + barIndex * bar;

      for (let step = 0; step < 8; step++) {
        addVoice(buffer, {
          start: barStart + step * (beat / 2),
          duration: beat / 2 - 0.02,
          freq: noteFreq(section.bass[bassPattern[step]]),
          type: "triangle",
          gain: 0.16,
          attack: 0.004,
          decay: 0.08,
          sustain: 0.45,
          release: 0.04,
          cutoff: 1300,
        });
      }

      for (let step = 0; step < 16; step++) {
        addVoice(buffer, {
          start: barStart + step * (beat / 4),
          duration: beat / 4 - 0.01,
          freq: noteFreq(
            section.arp[arpPattern[step % arpPattern.length]],
          ),
          type: "square",
          duty: 0.25,
          gain: 0.024,
          pan: step % 2 === 0 ? -0.5 : 0.5,
          attack: 0.002,
          decay: 0.05,
          sustain: 0.15,
          release: 0.03,
          cutoff: 5200,
        });
      }
    }
  }

  const melody = [
    [4, "E5", 0.5],
    [4.5, "G5", 0.5],
    [5, "C6", 1],
    [6, "B5", 0.5],
    [6.5, "G5", 0.5],
    [7, "E5", 1],
    [8, "D5", 0.5],
    [8.5, "E5", 0.5],
    [9, "G5", 1.5],
    [10.5, "E5", 0.5],
    [11, "D5", 1],
    [12, "D5", 0.5],
    [12.5, "G5", 0.5],
    [13, "B5", 1],
    [14, "A5", 0.5],
    [14.5, "G5", 0.5],
    [15, "D5", 1],
    [16, "E5", 0.5],
    [16.5, "G5", 0.5],
    [17, "B5", 1.5],
    [18.5, "A5", 0.5],
    [19, "G5", 1],
    [20, "C5", 0.5],
    [20.5, "E5", 0.5],
    [21, "A5", 1],
    [22, "G5", 0.5],
    [22.5, "E5", 0.5],
    [23, "C5", 1],
    [24, "D5", 0.5],
    [24.5, "E5", 0.5],
    [25, "A5", 1.5],
    [26.5, "G5", 0.5],
    [27, "E5", 1],
    [28, "A5", 0.5],
    [28.5, "C6", 0.5],
    [29, "A5", 1],
    [30, "G5", 0.5],
    [30.5, "F5", 0.5],
    [31, "E5", 1],
    [32, "F5", 0.5],
    [32.5, "A5", 0.5],
    [33, "C6", 1.5],
    [34.5, "A5", 0.5],
    [35, "G5", 1],
    [36, "E5", 0.5],
    [36.5, "G5", 0.5],
    [37, "C6", 2.5],
  ];

  for (const [startBeat, note, lengthBeats] of melody) {
    const noteDuration = lengthBeats * beat;

    addVoice(buffer, {
      start: startBeat * beat,
      duration: noteDuration,
      freq: noteFreq(note),
      type: "square",
      duty: 0.5,
      gain: 0.072,
      attack: 0.004,
      decay: 0.08,
      sustain: 0.55,
      release: Math.min(0.12, noteDuration * 0.3),
      vibratoDepth: lengthBeats >= 1 ? 0.0025 : 0,
      vibratoRate: 5.2,
      cutoff: 4600,
    });

    addVoice(buffer, {
      start: startBeat * beat,
      duration: noteDuration,
      freq: noteFreq(note),
      type: "square",
      duty: 0.5,
      gain: 0.016,
      pan: 0.18,
      attack: 0.004,
      decay: 0.08,
      sustain: 0.55,
      release: Math.min(0.12, noteDuration * 0.3),
      detuneCents: 6,
      cutoff: 4600,
    });
  }

  // Drum groove.
  for (let barIndex = 1; barIndex < 9; barIndex++) {
    const barStart = barIndex * bar;
    addKick(buffer, barStart, 0.5);
    addKick(buffer, barStart + 2 * beat, 0.45);

    if (barIndex % 2 === 1) {
      addKick(buffer, barStart + 3.5 * beat, 0.32);
    }

    addSnare(buffer, barStart + 1 * beat, 0.2, 0, barIndex * 10 + 1);
    addSnare(buffer, barStart + 3 * beat, 0.2, 0, barIndex * 10 + 2);

    for (let step = 0; step < 8; step++) {
      addHat(
        buffer,
        barStart + step * (beat / 2),
        step % 2 === 1 ? 0.045 : 0.026,
        step === 7,
        step % 2 === 0 ? -0.15 : 0.2,
      );
    }

    if ([1, 5, 7].includes(barIndex)) {
      addCrash(buffer, barStart, 0.1);
    }
  }

  // Outro chord + crash.
  for (const [noteIndex, note] of ["C4", "E4", "G4", "C5"].entries()) {
    addVoice(buffer, {
      start: 18,
      duration: 1.85,
      freq: noteFreq(note),
      type: "triangle",
      gain: noteIndex === 0 ? 0.075 : 0.05,
      pan: (noteIndex / 3 - 0.5) * 0.6,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.45,
      release: 0.9,
      cutoff: 1700,
      detuneCents: noteIndex % 2 === 0 ? -3 : 3,
    });
  }

  addCrash(buffer, 18, 0.12);

  addDelay(buffer, {
    delay: 0.17,
    feedback: 0.24,
    mix: 0.09,
    damp: 0.4,
  });
  fade(buffer, duration, 0.1, 1.4);
  normalize(buffer, 0.86);

  return buffer;
};

/* ------------------------------- Ambience --------------------------------- */

const renderWaves = () => {
  const duration = 7.2;
  const buffer = createBuffer(duration, 1);
  const noise = mulberry32(101);
  const alphaLow = 1 - Math.exp((-TAU * 420) / SR);
  const alphaHigh = 1 - Math.exp((-TAU * 1100) / SR);
  let brown = 0;
  let low = 0;
  let high = 0;

  for (let i = 0; i < buffer[0].length; i++) {
    const t = i / SR;
    const white = noise() * 2 - 1;
    brown = brown * 0.996 + white * 0.004;
    low += alphaLow * (white - low);
    high += alphaHigh * (white - high);

    const swell =
      0.45 +
      0.28 * Math.sin(TAU * 0.12 * t + 0.4) +
      0.12 * Math.sin(TAU * 0.31 * t + 1.1);
    const foam = Math.pow(
      Math.max(0, Math.sin(TAU * 0.12 * t + 0.4)),
      3,
    );

    buffer[0][i] = (brown * 2.2 + low * 0.55 + high * foam * 0.3) * swell * 0.42;
  }

  addGull(buffer, 1.5, -0.2, 0.045);
  addGull(buffer, 4.9, 0.35, 0.035);
  fade(buffer, duration, 0.35, 0.5);
  normalize(buffer, 0.6);

  return buffer;
};

const renderNight = () => {
  const duration = 7;
  const buffer = createBuffer(duration, 1);
  const noise = mulberry32(202);
  const alpha = 1 - Math.exp((-TAU * 260) / SR);
  let brown = 0;
  let low = 0;

  for (let i = 0; i < buffer[0].length; i++) {
    const t = i / SR;
    const white = noise() * 2 - 1;
    brown = brown * 0.995 + white * 0.005;
    low += alpha * (white - low);

    const flicker =
      0.6 +
      0.22 * Math.sin(TAU * 0.9 * t) +
      0.18 * Math.sin(TAU * 2.7 * t + 1.2);

    buffer[0][i] = (brown * 1.6 + low * 0.8) * flicker * 0.32;
  }

  const crackle = mulberry32(203);

  for (let i = 0; i < 55; i++) {
    addNoiseBurst(buffer, {
      start: crackle() * duration,
      duration: 0.012 + crackle() * 0.05,
      gain: 0.06 + crackle() * 0.12,
      highpass: 1800,
      seed: 1000 + i,
    });
  }

  const cricket = mulberry32(204);

  for (let voice = 0; voice < 3; voice++) {
    let t = 0.2 + voice * 0.18;

    while (t < duration - 0.4) {
      const base = 3600 + voice * 420 + cricket() * 250;

      for (let pulse = 0; pulse < 3; pulse++) {
        addCricket(buffer, t + pulse * 0.05, base, 0.03 + cricket() * 0.012);
      }

      t += 0.55 + cricket() * 0.25;
    }
  }

  fade(buffer, duration, 0.3, 0.5);
  normalize(buffer, 0.55);

  return buffer;
};

const renderDawn = () => {
  const duration = 7;
  const buffer = createBuffer(duration, 1);
  const noise = mulberry32(301);
  const alpha = 1 - Math.exp((-TAU * 600) / SR);
  let brown = 0;
  let low = 0;

  for (let i = 0; i < buffer[0].length; i++) {
    const t = i / SR;
    const white = noise() * 2 - 1;
    brown = brown * 0.997 + white * 0.003;
    low += alpha * (white - low);

    const wind =
      0.35 +
      0.3 * Math.sin(TAU * 0.08 * t) +
      0.15 * Math.sin(TAU * 0.21 * t + 0.8);

    buffer[0][i] = (low * 0.9 + brown * 1.2) * wind * 0.18;
  }

  const birds = mulberry32(302);

  for (let i = 0; i < 10; i++) {
    const start = 0.2 + birds() * 6.4;
    const notes = 2 + Math.floor(birds() * 4);
    const base = 2200 + birds() * 1300;

    for (let note = 0; note < notes; note++) {
      const from = base + (birds() - 0.5) * 700;
      const to =
        from + (birds() > 0.5 ? 1 : -1) * (200 + birds() * 600);

      addBirdNote(
        buffer,
        start + note * (0.07 + birds() * 0.05),
        from,
        to,
        0.05 + birds() * 0.08,
        0.035 + birds() * 0.02,
      );
    }
  }

  addBirdNote(buffer, 2.2, 720, 760, 0.14, 0.03);
  addBirdNote(buffer, 2.42, 620, 650, 0.16, 0.028);

  fade(buffer, duration, 0.4, 0.6);
  normalize(buffer, 0.55);

  return buffer;
};

const renderWhoosh = () => {
  const duration = 1;
  const buffer = createBuffer(duration, 1);
  const noise = mulberry32(401);
  let low = 0;
  let phase = 0;

  for (let i = 0; i < buffer[0].length; i++) {
    const t = i / SR;
    const p = t / duration;
    const cutoff = 250 + 5500 * Math.pow(Math.sin(Math.PI * p), 2);
    const alpha = 1 - Math.exp((-TAU * cutoff) / SR);
    const white = noise() * 2 - 1;
    low += alpha * (white - low);

    phase += (180 - 120 * p) / SR;

    const env = Math.pow(Math.sin(Math.PI * p), 1.4);
    buffer[0][i] = (low * 0.9 + Math.sin(TAU * phase) * 0.12) * env * 0.9;
  }

  fade(buffer, duration, 0.03, 0.12);
  normalize(buffer, 0.65);

  return buffer;
};

/* --------------------------------- Output --------------------------------- */

const outputs = [
  ["public/videos/video-10-detik/audio/musik.wav", renderAmbient()],
  ["public/videos/pixel-vlog-20-detik/audio/musik.wav", renderChiptune()],
  ["public/videos/pixel-vlog-20-detik/audio/sunset-waves.wav", renderWaves()],
  ["public/videos/pixel-vlog-20-detik/audio/night-campfire.wav", renderNight()],
  ["public/videos/pixel-vlog-20-detik/audio/dawn-birds.wav", renderDawn()],
  ["public/audio/whoosh.wav", renderWhoosh()],
];

console.log("Membuat audio...");

for (const [path, buffer] of outputs) {
  writeWav(path, buffer);
}

console.log(`Selesai. ${outputs.length} file WAV dibuat.`);
