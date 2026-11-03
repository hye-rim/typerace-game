'use strict';
// 타자 레이스 규칙 시험. 실행: node --test
const test = require('node:test');
const assert = require('node:assert');
const L = require('../logic.js');

// ---- 두벌식 한글 입력기(IME)를 흉내 내어 키를 하나씩 누를 때의 입력창 글을 만든다 ----
const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const VCOMB = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
const JCOMB = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
const isV = (k) => JUNG.includes(k);
function* typeStates(keys) {
  let committed = '', cho = null, jung = null, jong = null;
  const syl = () => {
    if (cho !== null && jung === null) return cho;
    if (cho === null && jung !== null) return jung;
    if (cho === null) return '';
    return String.fromCharCode(0xac00 + (CHO.indexOf(cho) * 21 + JUNG.indexOf(jung)) * 28 + (jong ? JONG.indexOf(jong) : 0));
  };
  const commit = () => { committed += syl(); cho = jung = jong = null; };
  const show = (composing) => ({ input: committed + syl(), composing });
  for (const k of keys) {
    if (k === ' ') { commit(); committed += ' '; yield show(false); continue; }
    if (isV(k)) {
      if (cho === null && jung === null) { jung = k; }
      else if (cho !== null && jung === null) { jung = k; }
      else if (jung !== null && jong === null && VCOMB[jung + k] && cho !== null) { jung = VCOMB[jung + k]; }
      else if (jong !== null) {
        // 받침이 다음 글자의 첫소리로 넘어감 (겹받침이면 뒤쪽만)
        const split = Object.entries(JCOMB).find(([, v]) => v === jong);
        if (split) { const keep = split[0][0], moved = split[0][1]; jong = keep; commit(); cho = moved; }
        else { const moved = jong; jong = null; commit(); cho = moved; }
        jung = k;
      } else { commit(); jung = k; }
    } else {
      if (cho === null && jung === null) { cho = k; }
      else if (jung === null) { commit(); cho = k; }
      else if (cho === null) { commit(); cho = k; }
      else if (jong === null) { if (JONG.includes(k) && k !== 'ㄸ' && k !== 'ㅃ' && k !== 'ㅉ') jong = k; else { commit(); cho = k; } }
      else if (JCOMB[jong + k]) { jong = JCOMB[jong + k]; }
      else { commit(); cho = k; }
    }
    yield show(true);
  }
  yield { input: committed + syl(), composing: false };
}
const keysOfText = (text) => [...text].flatMap((ch) => (ch === ' ' ? [' '] : L.keysOf(ch)));

const fresh = (opts = {}) => L.newRace(L.rng(4), Object.assign({ level: 'easy', noCount: true }, opts));
const clearEv = (st) => { const e = st.events.slice(); st.events.length = 0; return e; };

test('keysOf splits syllables into typed keys', () => {
  assert.deepStrictEqual(L.keysOf('과'), ['ㄱ', 'ㅗ', 'ㅏ']);
  assert.deepStrictEqual(L.keysOf('닭'), ['ㄷ', 'ㅏ', 'ㄹ', 'ㄱ']);
  assert.deepStrictEqual(L.keysOf('ㅂ'), ['ㅂ']);
  assert.deepStrictEqual(L.keysOf('a'), ['a']);
});

test('couldBecome: in-progress syllable shapes', () => {
  assert.ok(L.couldBecome('ㅂ', '반'));
  assert.ok(L.couldBecome('바', '반'));
  assert.ok(!L.couldBecome('밥', '반'));
  assert.ok(L.couldBecome('고', '과'));
  assert.ok(L.couldBecome('달', '닭'));
  assert.ok(L.couldBecome('한', '하', '나'), 'final consonant that belongs to the next syllable');
  assert.ok(!L.couldBecome('한', '하'));
  assert.ok(!L.couldBecome('ㅂ', '가'));
  assert.ok(!L.couldBecome('닭', '달'));
});

test('compare: prefix, wrong, extra, done', () => {
  assert.deepStrictEqual(L.compare('가나다', '', false), { ok: 0, wrong: false, pending: false, done: false });
  assert.strictEqual(L.compare('가나다', '가나', false).ok, 2);
  const w = L.compare('가나다', '가라', false); assert.ok(w.wrong && w.ok === 1);
  assert.ok(L.compare('가나다', '가나다라', false).wrong, 'extra characters');
  assert.ok(L.compare('가나다', '가나다', false).done);
  assert.ok(L.compare('가나다', '가나ㄷ', true).pending);
  assert.ok(L.compare('가나다', '가나ㄷ', false).wrong, 'a lone consonant left after composition ended');
});

test('typing every sentence with a real-like IME never counts a false mistake', () => {
  for (const sentence of L.SENTENCES) {
    const st = L.newRace(L.rng(1), { level: 'normal', noCount: true, sentences: [sentence], rivals: 0 });
    for (const s of typeStates(keysOfText(sentence))) L.setInput(st, s.input, s.composing);
    assert.strictEqual(st.mistakes, 0, `mistakes in "${sentence}"`);
    assert.strictEqual(st.runners[0].finishT !== null, true, `finished "${sentence}"`);
  }
});

test('a wrong key counts one mistake until fixed, and fixing works', () => {
  const st = fresh({ sentences: ['가나다'] });
  L.setInput(st, '가', false);
  L.setInput(st, '가라', false); assert.strictEqual(st.mistakes, 1);
  L.setInput(st, '가라다', false); assert.strictEqual(st.mistakes, 1, 'same mistake is not counted twice');
  const ev = clearEv(st); assert.ok(ev.some((e) => e.type === 'mistake'));
  L.setInput(st, '가', false); assert.ok(clearEv(st).some((e) => e.type === 'fix'));
  L.setInput(st, '가라', false); assert.strictEqual(st.mistakes, 2, 'a new mistake is counted');
});

test('progress equals correct leading characters and drops when you erase', () => {
  const st = fresh({ sentences: ['가나다라마'] });
  L.setInput(st, '가나다', false); assert.strictEqual(st.runners[0].pos, 3);
  L.setInput(st, '가나', false); assert.strictEqual(st.runners[0].pos, 2);
  L.setInput(st, '가나다라마', false);
  assert.strictEqual(st.runners[0].finishT, 0);
});

test('sentence events fire once per sentence in a multi-sentence passage', () => {
  const st = fresh({ sentences: ['가나', '다라', '마바'] });
  const text = '가나 다라 마바';
  const seen = [];
  for (let i = 1; i <= text.length; i++) { L.setInput(st, text.slice(0, i), false); for (const e of clearEv(st)) if (e.type === 'sentence') seen.push(e.n); }
  assert.deepStrictEqual(seen, [1, 2, 3]);
});

test('input is ignored during the countdown and after the end', () => {
  const st = L.newRace(L.rng(4), { level: 'easy' });
  assert.strictEqual(L.setInput(st, '가', false), null);
  for (let i = 0; i < 4 * 60; i++) L.step(st, 1 / 60);
  assert.strictEqual(st.phase, 'race');
  assert.ok(L.setInput(st, '', false));
});

test('computer runners run at about their speed and finish in order of speed', () => {
  const st = fresh({ sentences: ['가나다라마바사아자차카타파하 가나다라마바사아자차카타파하'], level: 'normal' });
  let f = 0; while (!st.over && f < 60 * 120) { L.step(st, 1 / 60); f++; st.events.length = 0; if (st.runners.slice(1).every((r) => r.finishT !== null)) break; }
  const fin = st.runners.slice(1).map((r) => r.finishT);
  assert.ok(fin.every((t) => t !== null));
  const expected = st.runners.slice(1).map((r) => st.total / (r.cpm / 60));
  fin.forEach((t, i) => assert.ok(Math.abs(t - expected[i]) / expected[i] < 0.3, `runner ${i}: ${t} vs ${expected[i]}`));
  assert.ok(st.runners[4].finishT < st.runners[1].finishT, 'fastest beats slowest');
});

test('the race ends when I finish and the rest finish or the wait runs out', () => {
  const st = fresh({ sentences: ['가나'], level: 'easy' });
  L.setInput(st, '가나', false);
  assert.strictEqual(st.over, false);
  for (let i = 0; i < 9 * 60; i++) L.step(st, 1 / 60);
  assert.strictEqual(st.over, true);
});

test('ranking: finished first by time, others by distance; stats compute speed and accuracy', () => {
  const st = fresh({ sentences: ['가나다라마바사아자차'], level: 'normal' });
  st.t = 10; st.runners[0].pos = 10; st.runners[0].finishT = 10;
  st.runners[1].pos = 4; st.runners[2].pos = 7; st.runners[3].finishT = 8; st.runners[4].pos = 1;
  assert.deepStrictEqual(L.rankOrder(st).map((r) => r.id), [3, 0, 2, 1, 4]);
  assert.strictEqual(L.rankOf(st, 0), 2);
  st.mistakes = 1;
  const s = L.stats(st);
  assert.strictEqual(s.cpm, 60);
  assert.strictEqual(s.accuracy, Math.round(10 / 11 * 100));
});

test('passages respect the level length range and never repeat a sentence', () => {
  for (const level of ['easy', 'normal']) for (let seed = 1; seed <= 20; seed++) {
    const p = L.pickPassage(L.rng(seed), level, 3), lv = L.LEVELS[level];
    assert.strictEqual(new Set(p).size, 3);
    p.forEach((s) => assert.ok(s.length >= lv.minLen && s.length <= lv.maxLen, `${level}: ${s}`));
  }
});

test('the sentence bank has no double spaces or stray characters', () => {
  for (const s of L.SENTENCES) { assert.ok(!/ {2}/.test(s) && s === s.trim(), s); assert.ok(/^[가-힣 ]+$/.test(s), 'only hangul and spaces: ' + s); }
});
