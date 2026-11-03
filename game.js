'use strict';
// 오락실 튜토리얼이 '진짜로 일어난 일'을 알아채는 신호 (튜토리얼이 아니면 아무도 안 듣는다)
const tutorialSignal = (type) => window.dispatchEvent(new CustomEvent('arcade:tutorial', { detail: { type } }));

// 타자 레이스: 화면·입력·소리. 규칙은 logic.js (LOGIC_TYPE).
const L = LOGIC_TYPE;
const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
};

// ---------- 소리 ----------
let audio = null;
let muted = store.get('typeraceMuted') === '1';
function tone(freq, dur, type = 'triangle', vol = 0.04, slide = 0) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
  } catch (_) {}
}
let lastKey = 0;
const sfx = {
  key: () => { const n = performance.now(); if (n - lastKey < 40) return; lastKey = n; tone(700 + Math.random() * 120, 0.03, 'square', 0.012); },
  bad: () => tone(150, 0.12, 'sawtooth', 0.04, -50),
  sentence: () => { tone(784, 0.08, 'triangle', 0.05); setTimeout(() => tone(1047, 0.12, 'triangle', 0.05), 70); },
  beep: (go) => tone(go ? 880 : 520, go ? 0.45 : 0.15, 'square', 0.05),
  finish: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.06), i * 100)),
  best: () => [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.06), i * 90)),
};

// ---------- 상태 ----------
let G = null;
let state = 'title';                    // title · play · over
let level = 'normal', tut = false, composing = false, typedSig = false, lastCount = 4;
let best = Number(store.get('typeraceBest')) || 0;
const input = $('typing'), passage = $('passage'), lanes = $('lanes');

/* @test-hooks:start */
window.__tr = { get G() { return G; }, get state() { return state; }, L, step: (dt) => tick(dt), type: (v, comp) => onInput(v, comp) };
/* @test-hooks:end */

// ---------- 흐름 ----------
function showOverlay(html) { const o = $('overlay'); o.innerHTML = html; o.classList.remove('hidden'); o.querySelectorAll('button[data-level]').forEach((b) => { b.onclick = () => start(b.dataset.level); }); }
function hideOverlay() { $('overlay').classList.add('hidden'); }
const lvButtons = () => `<div class="lv"><button data-level="easy">쉬움<small>짧은 글 · 느린 상대</small></button><button data-level="normal">보통<small>긴 글 · 기록 저장</small></button></div>`;
function showTitle() {
  state = 'title'; input.blur();
  showOverlay(`<h1>타자 레이스</h1><p>위에 나오는 글을 <b>똑같이 쳐서</b> 달려요!<br>맞게 친 글자만큼 앞으로 나가요.</p>
    <p class="help">틀리면 빨갛게 표시되고, 지우고 다시 쳐야 해요.<br>컴퓨터 주자들보다 먼저 결승선에 들어오세요!</p>
    ${best ? `<div class="big">최고 ${best} 글자/분</div>` : ''}${lvButtons()}<p class="note">키보드(한글)가 나오면 바로 따라 치면 돼요</p>`);
}
function start(lv) {
  tut = /[?&]tutorial=1/.test(location.search);
  if (tut) lv = 'easy';
  level = lv === 'normal' ? 'normal' : 'easy';
  G = L.newRace(Math.random, tut ? { level, sentences: ['가는 말이 고우면 오는 말이 곱다', '티끌 모아 태산'], rivals: 1, slow: 0.12 } : { level });
  input.value = ''; composing = false; typedSig = false; lastCount = 4;
  buildLanes(); buildPassage();
  state = 'play'; hideOverlay();
  try { input.focus(); } catch (_) {}
  $('hint').textContent = '카운트다운이 끝나면 입력창에 따라 치세요';
  render();
}
function finishRace() {
  state = 'over'; input.blur(); sfx.finish();
  const st = L.stats(G), rank = L.rankOf(G, 0);
  const newBest = level === 'normal' && !tut && G.runners[0].finishT !== null && st.cpm > best;
  if (newBest) { best = st.cpm; store.set('typeraceBest', String(best)); setTimeout(sfx.best, 500); }
  const rows = L.rankOrder(G).map((r, i) => `<div class="row${r.me ? ' me' : ''}"><span>${i + 1}</span><span>${r.icon} ${r.name}</span><span>${r.finishT !== null ? r.finishT.toFixed(1) + '초' : '못 들어옴'}</span></div>`).join('');
  setTimeout(() => {
    if (state !== 'over') return;
    showOverlay(`<h2>${rank === 1 ? '🏆 1등!' : `${rank}등`}</h2><div class="rank">${rows}</div>
      <div class="stats"><div><b>${st.cpm}</b>글자/분</div><div><b>${st.accuracy === null ? '-' : st.accuracy + '%'}</b>정확도</div><div><b>${st.mistakes}</b>틀린 횟수</div></div>
      <p>${newBest ? '🎉 새 최고 속도!' : level === 'normal' ? `최고 ${best} 글자/분` : '쉬움에서는 기록이 저장되지 않아요'}</p>${lvButtons()}`);
  }, 800);
}
function toggleMute() { muted = !muted; store.set('typeraceMuted', muted ? '1' : '0'); $('muteBtn').textContent = muted ? '🔇' : '🔊'; }

// ---------- 화면 ----------
function buildLanes() {
  lanes.innerHTML = G.runners.map((r) => `<div class="lane${r.me ? ' me' : ''}" data-id="${r.id}"><div class="fill"></div><div class="flag"></div><div class="ic">${r.icon}</div><div class="nm">${r.name}</div></div>`).join('');
}
function buildPassage() {
  passage.innerHTML = [...G.text].map((ch, i) => `<span class="c${ch === ' ' ? ' sp' : ''}" data-i="${i}">${ch === ' ' ? ' ' : ch}</span>`).join('');
}
let lastSig = '';
function render() {
  // 달리기 줄
  for (const r of G.runners) {
    const el = lanes.querySelector(`[data-id="${r.id}"]`); if (!el) continue;
    const w = el.clientWidth - 40, f = Math.min(1, r.pos / G.total);
    el.querySelector('.ic').style.left = `${6 + f * w}px`;
    el.querySelector('.fill').style.width = `${f * 100}%`;
  }
  // 글자 색 (입력이 바뀔 때만 다시 칠함)
  const me = G.runners[0], c = L.compare(G.text, G.input, composing);
  const sig = `${c.ok}|${c.wrong}|${c.pending}|${G.input.length}`;
  if (sig !== lastSig) {
    lastSig = sig;
    const spans = passage.children, n = spans.length, inputLen = G.input.length;
    for (let i = 0; i < n; i++) {
      let cls = 'c' + (G.text[i] === ' ' ? ' sp' : '');
      if (i < c.ok) cls += ' ok';
      else if (i === c.ok && c.wrong) cls += ' bad';
      else if (i === c.ok && c.pending) cls += ' pend cur';
      else if (i === c.ok) cls += ' cur';
      else if (c.wrong && i < inputLen) cls += ' bad';
      spans[i].className = cls;
    }
    input.classList.toggle('bad', c.wrong);
  }
  const st = L.stats(G);
  $('cpm').textContent = state === 'play' && G.phase === 'race' && G.t > 1.5 ? st.cpm : (me.finishT !== null ? st.cpm : 0);
}

// ---------- 입력 ----------
function onInput(value, comp) {
  composing = !!comp;
  if (state !== 'play') return;
  if (G.phase !== 'race') { input.value = ''; return; }
  const before = G.runners[0].pos;
  L.setInput(G, value, composing);
  for (const ev of G.events) onEvent(ev);
  G.events.length = 0;
  if (G.runners[0].pos > before) { /* 소리는 이벤트에서 */ }
  render();
}
function onEvent(ev) {
  if (ev.type === 'char') { sfx.key(); if (!typedSig && ev.ok >= 3) { typedSig = true; tutorialSignal('typing'); } }
  else if (ev.type === 'mistake') { sfx.bad(); tutorialSignal('mistake'); }
  else if (ev.type === 'fix') tutorialSignal('fix');
  else if (ev.type === 'sentence') { sfx.sentence(); tutorialSignal('sentence'); }
  else if (ev.type === 'finish' && ev.runner === 0) tutorialSignal('finish');
  else if (ev.type === 'go') { sfx.beep(true); $('hint').textContent = ''; try { input.focus(); } catch (_) {} }
}
input.addEventListener('compositionstart', () => { composing = true; });
input.addEventListener('compositionend', () => { composing = false; onInput(input.value, false); });
input.addEventListener('input', (e) => onInput(input.value, e.isComposing || composing));
input.addEventListener('paste', (e) => e.preventDefault());
input.addEventListener('drop', (e) => e.preventDefault());
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
input.addEventListener('blur', () => { if (state === 'play' && G.phase === 'race') $('hint').textContent = '글을 누르면 다시 입력할 수 있어요'; });
input.addEventListener('focus', () => { if (state === 'play') $('hint').textContent = ''; });
passage.addEventListener('pointerdown', () => { if (state === 'play') input.focus(); });
$('muteBtn').onclick = (e) => { e.currentTarget.blur(); toggleMute(); };
$('muteBtn').textContent = muted ? '🔇' : '🔊';
addEventListener('keydown', (e) => { if (state === 'play' && e.target !== input && !e.metaKey && !e.ctrlKey && e.key.length === 1) input.focus(); });

// ---------- 시간 ----------
function tick(dt) {
  if (state !== 'play') return;
  L.step(G, dt);
  for (const ev of G.events) onEvent(ev);
  G.events.length = 0;
  if (G.phase === 'count') {
    const c = Math.ceil(G.countT);
    $('count').classList.remove('hidden'); $('count').textContent = String(Math.max(1, c));
    if (c !== lastCount) { lastCount = c; sfx.beep(false); }
  } else $('count').classList.add('hidden');
  render();
  if (G.over) finishRace();
}
let last = performance.now();
function frame(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now; tick(dt); requestAnimationFrame(frame); }
showTitle();
requestAnimationFrame(frame);
