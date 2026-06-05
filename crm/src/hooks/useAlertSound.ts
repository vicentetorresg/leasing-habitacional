import { useCallback, useEffect, useRef, useState } from 'react';

// Harsh alarm beep for inactivity
function createAlarmBuffer(audioCtx: AudioContext): AudioBuffer {
  // ... keep existing code
  const sampleRate = audioCtx.sampleRate;
  const duration = 0.3;
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, (length - i) / (sampleRate * 0.05)) * Math.min(1, i / (sampleRate * 0.01));
    data[i] = env * 0.5 * (
      Math.sin(2 * Math.PI * 880 * t) * 0.5 +
      Math.sin(2 * Math.PI * 1760 * t) * 0.3 +
      Math.sin(2 * Math.PI * 660 * t) * 0.2
    );
  }
  
  return buffer;
}

// Friendly motivational chime for new leads (ascending notes)
function createChimeBuffer(audioCtx: AudioContext): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const noteCount = 3;
  const noteDuration = 0.2;
  const totalDuration = noteCount * noteDuration + 0.3;
  const length = Math.floor(sampleRate * totalDuration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const frequencies = [523.25, 659.25, 783.99];

  for (let n = 0; n < noteCount; n++) {
    const startSample = Math.floor(n * noteDuration * sampleRate);
    const noteLength = Math.floor((noteDuration + 0.15) * sampleRate);
    const freq = frequencies[n];

    for (let i = 0; i < noteLength && (startSample + i) < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / (sampleRate * 0.01));
      const decay = Math.pow(Math.max(0, 1 - (i / noteLength)), 1.5);
      const env = attack * decay;
      const sample = env * 0.4 * (
        Math.sin(2 * Math.PI * freq * t) * 0.7 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
      );
      data[startSample + i] += sample;
    }
  }

  return buffer;
}

// Short "call start" sound
function createCallStartBuffer(audioCtx: AudioContext): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const totalDuration = 0.25;
  const length = Math.floor(sampleRate * totalDuration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const tones = [
    { freq: 1174.66, start: 0, dur: 0.1 },
    { freq: 880, start: 0.12, dur: 0.12 },
  ];

  for (const tone of tones) {
    const startSample = Math.floor(tone.start * sampleRate);
    const toneLen = Math.floor(tone.dur * sampleRate);
    for (let i = 0; i < toneLen && (startSample + i) < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / (sampleRate * 0.005));
      const decay = Math.pow(Math.max(0, 1 - (i / toneLen)), 2);
      data[startSample + i] += attack * decay * 0.3 * Math.sin(2 * Math.PI * tone.freq * t);
    }
  }

  return buffer;
}

// Airport-style "ding-dong" chime for 2-min idle — plays twice
function createUrgentAlarmBuffer(audioCtx: AudioContext): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  // Two ding-dongs with a pause between them
  const chimeLen = 0.9; // each ding-dong
  const pause = 0.6;
  const totalDuration = chimeLen * 2 + pause;
  const length = Math.floor(sampleRate * totalDuration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Airport chime: "ding" (high) then "dong" (lower, longer)
  const renderChime = (offset: number) => {
    const startSample = Math.floor(offset * sampleRate);
    // Ding — bright, short
    const dingFreq = 830; // ~G#5
    const dingDur = 0.35;
    const dingLen = Math.floor(dingDur * sampleRate);
    for (let i = 0; i < dingLen; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / (sampleRate * 0.005));
      const decay = Math.exp(-3.5 * t / dingDur);
      const idx = startSample + i;
      if (idx < length) {
        data[idx] += attack * decay * 0.45 * (
          Math.sin(2 * Math.PI * dingFreq * t) * 0.65 +
          Math.sin(2 * Math.PI * dingFreq * 2 * t) * 0.2 +
          Math.sin(2 * Math.PI * dingFreq * 3 * t) * 0.1 +
          Math.sin(2 * Math.PI * dingFreq * 4 * t) * 0.05
        );
      }
    }
    // Dong — warm, lower, longer decay
    const dongFreq = 622; // ~Eb5 (a musical fourth below)
    const dongStart = startSample + Math.floor(0.3 * sampleRate);
    const dongDur = 0.6;
    const dongLen = Math.floor(dongDur * sampleRate);
    for (let i = 0; i < dongLen; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / (sampleRate * 0.005));
      const decay = Math.exp(-2.5 * t / dongDur);
      const idx = dongStart + i;
      if (idx < length) {
        data[idx] += attack * decay * 0.4 * (
          Math.sin(2 * Math.PI * dongFreq * t) * 0.7 +
          Math.sin(2 * Math.PI * dongFreq * 2 * t) * 0.18 +
          Math.sin(2 * Math.PI * dongFreq * 3 * t) * 0.08 +
          Math.sin(2 * Math.PI * dongFreq * 4 * t) * 0.04
        );
      }
    }
  };

  renderChime(0);
  renderChime(chimeLen + pause);

  return buffer;
}

export function useAlertSound() {
  const [enabled, setEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const autoActivatedRef = useRef(false);
  const alarmBufferRef = useRef<AudioBuffer | null>(null);
  const chimeBufferRef = useRef<AudioBuffer | null>(null);
  const callStartBufferRef = useRef<AudioBuffer | null>(null);
  const urgentAlarmBufferRef = useRef<AudioBuffer | null>(null);

  const activate = useCallback(async () => {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    audioCtxRef.current = ctx;
    alarmBufferRef.current = createAlarmBuffer(ctx);
    chimeBufferRef.current = createChimeBuffer(ctx);
    callStartBufferRef.current = createCallStartBuffer(ctx);
    urgentAlarmBufferRef.current = createUrgentAlarmBuffer(ctx);
    console.log('[Alerts] AudioContext activated, state:', ctx.state);
    localStorage.setItem('alertsEnabled', 'true');
    setEnabled(true);
  }, []);

  // Auto-activate on first user interaction if previously enabled
  useEffect(() => {
    if (localStorage.getItem('alertsEnabled') !== 'true') return;
    const handler = () => {
      if (autoActivatedRef.current) return;
      autoActivatedRef.current = true;
      activate();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activate]);

  const deactivate = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
      alarmBufferRef.current = null;
      chimeBufferRef.current = null;
      callStartBufferRef.current = null;
      urgentAlarmBufferRef.current = null;
    }
    localStorage.removeItem('alertsEnabled');
    setEnabled(false);
  }, []);

  const playAlert = useCallback(async (times = 3) => {
    const ctx = audioCtxRef.current;
    const buffer = alarmBufferRef.current;
    if (!ctx || !buffer || !enabled) return;
    if (ctx.state === 'suspended') await ctx.resume();

    for (let i = 0; i < times; i++) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(ctx.currentTime + i * 0.5);
    }
  }, [enabled]);

  const playNewLeadChime = useCallback(async () => {
    const ctx = audioCtxRef.current;
    const buffer = chimeBufferRef.current;
    if (!ctx || !buffer || !enabled) return;
    if (ctx.state === 'suspended') await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
  }, [enabled]);

  const playReminderNudge = useCallback(async () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !enabled) return;

    const sampleRate = ctx.sampleRate;
    const duration = 0.4;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    const freq = 440;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, i / (sampleRate * 0.01));
      const decay = Math.pow(Math.max(0, 1 - (i / length)), 2);
      data[i] = attack * decay * 0.25 * Math.sin(2 * Math.PI * freq * t);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
  }, [enabled]);

  const playCallStart = useCallback(async () => {
    const ctx = audioCtxRef.current;
    const buffer = callStartBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'suspended') await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
  }, []);

  // LOUD urgent alarm for 2-min idle
  const playUrgentAlarm = useCallback(async () => {
    const ctx = audioCtxRef.current;
    const buffer = urgentAlarmBufferRef.current;
    if (!ctx || !buffer || !enabled) return;
    if (ctx.state === 'suspended') await ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(ctx.currentTime);
  }, [enabled]);

  return { enabled, activate, deactivate, playAlert, playNewLeadChime, playReminderNudge, playCallStart, playUrgentAlarm };
}
