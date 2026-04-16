// Micro sound effects via Web Audio API — no external files needed.
// Each function creates a short, satisfying sound.

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Satisfying "pop" — task checked / completed */
export function playCheck() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(1320, c.currentTime + 0.06);
  g.gain.setValueAtTime(0.18, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.15);
}

/** Light "blip" — task added / note added */
export function playAdd() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(660, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(990, c.currentTime + 0.08);
  g.gain.setValueAtTime(0.12, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.12);
}

/** Soft "swoosh" — task deleted / archived */
export function playDelete() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(520, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.18);
  g.gain.setValueAtTime(0.13, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.18);
}

/** Subtle "thud" — drag-and-drop landed */
export function playDrop() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(180, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.1);
  g.gain.setValueAtTime(0.15, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.12);
}

/** Double-tone chime — pomodoro session ended */
export function playChime() {
  const c = getCtx();
  [0, 0.15].forEach((delay, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(i === 0 ? 880 : 1108, c.currentTime + delay);
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(0.2, c.currentTime + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + 0.4);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + 0.4);
  });
}

/** Short low tone — error / warning */
export function playError() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(220, c.currentTime);
  o.frequency.linearRampToValueAtTime(180, c.currentTime + 0.15);
  g.gain.setValueAtTime(0.08, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.2);
}

/** Quick rising tone — status cycle (todo→doing→done) */
export function playStatusChange() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(440, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.1);
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.13);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.13);
}

/** Gentle "undo" — descending tone */
export function playUndo() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(700, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(440, c.currentTime + 0.12);
  g.gain.setValueAtTime(0.1, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.15);
}
