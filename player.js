const DURATION = 91;
const BPM = 84;
let players = {};
let isPlaying = false;
let startTime = 0;
let elapsed = 0;
let rafId = null;
let initialized = false;
let dragging = false;

const playBtn = document.getElementById("play");
const playIcon = document.getElementById("play-icon");
const backBtn = document.getElementById("back");
const fwdBtn = document.getElementById("forward");
const fill = document.getElementById("fill");
const thumb = document.getElementById("thumb");
const currentEl = document.getElementById("current");
const track = document.getElementById("track");

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ":" + sec.toString().padStart(2, "0");
}

function updateBar(t) {
  const pct = Math.min((t % DURATION) / DURATION * 100, 100);
  fill.style.width = pct + "%";
  thumb.style.left = pct + "%";
  currentEl.textContent = fmt(t % DURATION);
}

function tick() {
  if (!dragging) {
    const now = Tone.now();
    const t = elapsed + (now - startTime);
    updateBar(t);
  }
  rafId = requestAnimationFrame(tick);
}

function getPct(e, rect) {
  return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
}

function seekTo(pct) {
  const newPos = pct * DURATION;
  Tone.Transport.seconds = newPos;
  elapsed = newPos;
  startTime = Tone.now();
  updateBar(newPos);
}

async function init() {
  const response = await fetch("song.frax");
  const frax = await response.json();

  Tone.Transport.bpm.value = BPM;

  for (const group in frax.groups) {
    players[group] = [];
    for (const file of frax.groups[group]) {
      const p = new Tone.Player({ url: file, loop: true }).toDestination();
      players[group].push(p);
    }
  }

  await Tone.loaded();

  for (const group in players) {
    for (const p of players[group]) {
      p.sync().start(0);
      p.volume.value = -999;
    }
  }

  for (const group in players) {
    const pick = Math.floor(Math.random() * players[group].length);
    players[group][pick].volume.value = 0;
  }

  for (let i = 1; i < 500; i++) {
    Tone.Transport.schedule(() => {
      for (const group in players) {
        const pick = Math.floor(Math.random() * players[group].length);
        for (let j = 0; j < players[group].length; j++) {
          players[group][j].volume.value = j === pick ? 0 : -999;
        }
      }
    }, i + "m");
  }

  initialized = true;
}

playBtn.addEventListener("click", async () => {
  await Tone.start();
  if (!initialized) await init();
  if (!isPlaying) {
    Tone.Transport.start();
    startTime = Tone.now();
    isPlaying = true;
    playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    tick();
  } else {
    Tone.Transport.pause();
    elapsed += Tone.now() - startTime;
    isPlaying = false;
    playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    cancelAnimationFrame(rafId);
  }
});

backBtn.addEventListener("click", () => {
  const newPos = Math.max(0, Tone.Transport.seconds - 3);
  Tone.Transport.seconds = newPos;
  elapsed = newPos;
  startTime = Tone.now();
  updateBar(newPos);
});

fwdBtn.addEventListener("click", () => {
  const newPos = Tone.Transport.seconds + 3;
  Tone.Transport.seconds = newPos;
  elapsed = newPos;
  startTime = Tone.now();
  updateBar(newPos);
});

track.addEventListener("mousedown", (e) => {
  dragging = true;
  const rect = track.getBoundingClientRect();
  seekTo(getPct(e, rect));
});

document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const rect = track.getBoundingClientRect();
  const pct = getPct(e, rect);
  const pos = pct * DURATION;
  fill.style.width = pct * 100 + "%";
  thumb.style.left = pct * 100 + "%";
  currentEl.textContent = fmt(pos);
});

document.addEventListener("mouseup", (e) => {
  if (!dragging) return;
  dragging = false;
  const rect = track.getBoundingClientRect();
  seekTo(getPct(e, rect));
});

window.addEventListener("load", () => { init(); });