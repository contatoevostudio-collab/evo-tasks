let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function masterGain(c: AudioContext, volume = 1): GainNode {
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(c.destination);
  return g;
}

/** Satisfying "pop" com harmônicos — tarefa concluída */
export function playCheck() {
  const c = getCtx();
  const master = masterGain(c, 0.22);
  const now = c.currentTime;

  // Tom principal com sweep para cima
  const o1 = c.createOscillator();
  const g1 = c.createGain();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(740, now);
  o1.frequency.exponentialRampToValueAtTime(1480, now + 0.07);
  g1.gain.setValueAtTime(0.7, now);
  g1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  o1.connect(g1).connect(master);
  o1.start(now); o1.stop(now + 0.18);

  // Harmônico mais suave
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(1480, now);
  o2.frequency.exponentialRampToValueAtTime(2220, now + 0.07);
  g2.gain.setValueAtTime(0.25, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  o2.connect(g2).connect(master);
  o2.start(now); o2.stop(now + 0.14);

  // Click de ataque (noise curto)
  const bufSize = c.sampleRate * 0.015;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const noise = c.createBufferSource();
  const gn = c.createGain();
  noise.buffer = buf;
  gn.gain.setValueAtTime(0.12, now);
  gn.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
  noise.connect(gn).connect(master);
  noise.start(now);
}

/** Blip suave com reverb sintético — tarefa adicionada */
export function playAdd() {
  const c = getCtx();
  const master = masterGain(c, 0.18);
  const now = c.currentTime;

  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(528, now);
  o.frequency.exponentialRampToValueAtTime(880, now + 0.06);
  g.gain.setValueAtTime(0.6, now);
  g.gain.linearRampToValueAtTime(0.8, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  o.connect(g).connect(master);
  o.start(now); o.stop(now + 0.16);

  // Eco leve
  const o2 = c.createOscillator();
  const g2 = c.createGain();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(880, now + 0.05);
  o2.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
  g2.gain.setValueAtTime(0.0, now + 0.05);
  g2.gain.linearRampToValueAtTime(0.25, now + 0.07);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  o2.connect(g2).connect(master);
  o2.start(now + 0.05); o2.stop(now + 0.2);
}

/** Whoosh descendente filtrado — deletar / arquivar */
export function playDelete() {
  const c = getCtx();
  const master = masterGain(c, 0.16);
  const now = c.currentTime;

  // Tom que cai com filtro passa-baixa
  const o = c.createOscillator();
  const filter = c.createBiquadFilter();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(600, now);
  o.frequency.exponentialRampToValueAtTime(120, now + 0.22);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  o.connect(filter).connect(g).connect(master);
  o.start(now); o.stop(now + 0.22);
}

/** Thud com corpo — drag-and-drop */
export function playDrop() {
  const c = getCtx();
  const master = masterGain(c, 0.22);
  const now = c.currentTime;

  // Sub-bass impacto
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(160, now);
  o.frequency.exponentialRampToValueAtTime(55, now + 0.12);
  g.gain.setValueAtTime(0.8, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  o.connect(g).connect(master);
  o.start(now); o.stop(now + 0.14);

  // Transiente de click
  const bufSize = Math.floor(c.sampleRate * 0.02);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
  const noise = c.createBufferSource();
  const gn = c.createGain();
  noise.buffer = buf;
  gn.gain.value = 0.18;
  noise.connect(gn).connect(master);
  noise.start(now);
}

/** Chime triplo estilo notificação premium — pomodoro encerrado */
export function playChime() {
  const c = getCtx();
  const master = masterGain(c, 0.22);

  const notes = [
    { freq: 784, time: 0 },    // G5
    { freq: 1047, time: 0.18 }, // C6
    { freq: 1319, time: 0.36 }, // E6
  ];

  notes.forEach(({ freq, time }) => {
    const now = c.currentTime + time;

    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.7, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    o.connect(g).connect(master);
    o.start(now); o.stop(now + 0.55);

    // Parcial mais brilhante
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.2, now + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o2.connect(g2).connect(master);
    o2.start(now); o2.stop(now + 0.3);
  });
}

/** Tom dissonante duplo — erro / aviso */
export function playError() {
  const c = getCtx();
  const master = masterGain(c, 0.14);
  const now = c.currentTime;

  [220, 233].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.5, now + i * 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    o.connect(g).connect(master);
    o.start(now + i * 0.01); o.stop(now + 0.22);
  });
}

/** Dois tons suaves ascendentes — mudança de status */
export function playStatusChange() {
  const c = getCtx();
  const master = masterGain(c, 0.16);
  const now = c.currentTime;

  [[440, 0], [660, 0.08]].forEach(([freq, delay]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.6, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
    o.connect(g).connect(master);
    o.start(now + delay); o.stop(now + delay + 0.14);
  });
}

/** Dois tons descendentes suaves — undo */
export function playUndo() {
  const c = getCtx();
  const master = masterGain(c, 0.14);
  const now = c.currentTime;

  [[660, 0], [440, 0.1]].forEach(([freq, delay]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.5, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
    o.connect(g).connect(master);
    o.start(now + delay); o.stop(now + delay + 0.15);
  });
}
