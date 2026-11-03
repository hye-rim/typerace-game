'use strict';
// 타자 레이스: 규칙만 (DOM 없음). 화면·입력·소리는 game.js.
// 한글 문장을 따라 쳐서 컴퓨터 주자들과 달리기 경주를 한다. 맞게 친 글자 수가 곧 달린 거리.
(function (root) {
  const COUNTDOWN = 3;
  // 컴퓨터 주자의 평균 속도(글자/분). 사람이 한글을 칠 때 PC 는 대략 150~300, 폰은 80~160 글자/분.
  const LEVELS = {
    easy: { label: '쉬움', cpm: [48, 68, 90], minLen: 8, maxLen: 20, count: 3, wobble: 0.22, stumble: 0.12 },
    normal: { label: '보통', cpm: [85, 120, 155, 195], minLen: 16, maxLen: 34, count: 3, wobble: 0.18, stumble: 0.08 },
  };
  const NAMES = ['토끼', '거북이', '여우', '다람쥐', '펭귄', '곰돌이'];
  const ICONS = ['🐇', '🐢', '🦊', '🐿️', '🐧', '🐻'];
  const END_WAIT = 8;                    // 내가 들어온 뒤 나머지를 기다려 주는 시간(초)

  // 문장 모음: 속담과 일상 문장
  const SENTENCES = [
    '가는 말이 고우면 오는 말이 곱다', '낮말은 새가 듣고 밤말은 쥐가 듣는다', '티끌 모아 태산', '세 살 버릇 여든까지 간다',
    '아는 길도 물어 가라', '원숭이도 나무에서 떨어진다', '호랑이도 제 말 하면 온다', '천 리 길도 한 걸음부터',
    '소 잃고 외양간 고친다', '백지장도 맞들면 낫다', '로마는 하루아침에 이루어지지 않았다', '공든 탑이 무너지랴',
    '하늘이 무너져도 솟아날 구멍이 있다', '빈 수레가 요란하다', '우물 안 개구리', '고래 싸움에 새우 등 터진다',
    '누워서 침 뱉기', '될성부른 나무는 떡잎부터 알아본다', '윗물이 맑아야 아랫물이 맑다', '가랑비에 옷 젖는 줄 모른다',
    '말 한마디로 천 냥 빚을 갚는다', '지렁이도 밟으면 꿈틀한다', '못 먹는 감 찔러나 본다', '꿩 먹고 알 먹기',
    '닭 쫓던 개 지붕 쳐다본다', '엎친 데 덮친 격', '사공이 많으면 배가 산으로 간다', '쇠귀에 경 읽기',
    '모르는 것이 약이다', '첫술에 배부르랴', '오늘은 날씨가 참 맑고 하늘이 높습니다', '주말에는 친구들과 함께 공원에서 자전거를 탈 거예요',
    '따뜻한 커피 한 잔과 좋아하는 책 한 권이면 충분해요', '아침에 일어나서 창문을 열고 시원한 바람을 맞았다', '비 오는 날에는 따뜻한 국물이 생각난다',
    '작은 습관이 모여서 큰 변화를 만든다', '천천히 가더라도 멈추지 않으면 반드시 도착한다', '가을 하늘 아래에서 낙엽이 바람에 흩날리고 있었다',
    '맛있는 저녁을 먹고 나서 가족과 함께 산책을 했다', '밤하늘에 반짝이는 별을 보며 소원을 빌었다', '도서관 창가 자리에서 조용히 책을 읽는 시간이 좋다',
    '바닷가에서 파도 소리를 들으며 모래성을 쌓았어요',
  ];

  const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

  // ---------- 한글 입력 판정 ----------
  // 한글을 자판으로 누르는 낱글자(자음·모음) 순서로 풀기: '과' → ㄱ ㅗ ㅏ, '닭' → ㄷ ㅏ ㄹ ㄱ
  const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const SPLIT = { 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ', 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ' };
  const expand = (j) => (SPLIT[j] ? SPLIT[j].split('') : [j]);
  function keysOf(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) { const o = c - 0xac00; return [CHO[Math.floor(o / 588)], ...expand(JUNG[Math.floor((o % 588) / 28)]), ...(o % 28 ? expand(JONG[o % 28]) : [])]; }
    if (c >= 0x3131 && c <= 0x3163) return expand(ch);
    return [ch];
  }
  const isCons = (k) => CHO.includes(k) || JONG.includes(k);
  const startsWith = (a, b) => b.length <= a.length && b.every((k, i) => a[i] === k);
  // 입력 중인(조합 중인) 마지막 글자가 목표 글자가 될 수 있는 중간 모양인지:
  // 'ㅂ' → '바' → '반' 은 '반' 의 앞부분이고, '한' 은 다음 글자가 'ㄴ' 으로 시작하는 '하' 의 중간 모양('하나' 를 치는 중)
  function couldBecome(partial, targetChar, nextChar) {
    if (!partial || !targetChar) return false;
    const p = keysOf(partial), t = keysOf(targetChar);
    if (startsWith(t, p)) return true;
    if (nextChar) { const n = keysOf(nextChar)[0]; if (isCons(n) && p.length === t.length + 1 && startsWith(p, t) && p[p.length - 1] === n) return true; }
    return false;
  }
  // 목표 글과 입력 글을 비교: ok 는 앞에서부터 맞은 글자 수, wrong 은 틀린 글자가 있음, pending 은 마지막 글자를 조합하는 중
  function compare(target, input, composing) {
    let ok = 0, wrong = false, pending = false;
    for (let i = 0; i < input.length; i++) {
      if (i >= target.length) { wrong = true; break; }
      if (input[i] === target[i]) { ok++; continue; }
      if (composing && i === input.length - 1 && couldBecome(input[i], target[i], target[i + 1])) { pending = true; break; }
      wrong = true; break;
    }
    return { ok, wrong, pending, done: !wrong && !pending && input.length === target.length && ok === target.length };
  }

  // ---------- 경주 ----------
  function pickPassage(rand, level, count) {
    const p = LEVELS[level];
    let pool = SENTENCES.filter((s) => s.length >= p.minLen && s.length <= p.maxLen);
    if (pool.length < count) pool = SENTENCES.slice();
    const out = [];
    while (out.length < count && pool.length) { const i = Math.floor(rand() * pool.length); out.push(pool.splice(i, 1)[0]); }
    return out;
  }

  function newRace(rand, opts = {}) {
    rand = rand || Math.random;
    const lv = LEVELS[opts.level] ? opts.level : 'normal';
    const params = Object.assign({}, LEVELS[lv]);
    const sentences = opts.sentences || pickPassage(rand, lv, params.count);
    const text = sentences.join(' ');
    const slow = opts.slow === undefined ? 1 : opts.slow;
    const names = NAMES.map((n, i) => [n, ICONS[i]]).sort(() => rand() - 0.5);
    const runners = [{ id: 0, name: '나', icon: '🐱', me: true, pos: 0, cpm: 0, finishT: null, phase: 0, stun: 0 }];
    const cpms = opts.rivals === undefined ? params.cpm : params.cpm.slice(0, opts.rivals);
    cpms.forEach((c, i) => runners.push({ id: i + 1, name: names[i][0], icon: names[i][1], me: false, pos: 0, cpm: c * slow * (0.93 + rand() * 0.14), finishT: null, phase: rand() * 6.28, stun: 0 }));
    return { rand, level: lv, params, sentences, text, total: text.length, phase: opts.noCount ? 'race' : 'count', countT: opts.noCount ? 0 : COUNTDOWN, t: 0, runners, mistakes: 0, wrongNow: false,
      input: '', over: false, doneT: 0, events: [], typed: 0, sentenceEnds: sentenceEnds(sentences), sentencesDone: 0 };
  }
  function sentenceEnds(sentences) { const ends = []; let n = 0; sentences.forEach((s, i) => { n += s.length; ends.push(n); n += 1; }); return ends; }

  // 입력창의 글이 바뀔 때마다 부른다
  function setInput(st, input, composing) {
    if (st.over || st.phase !== 'race') return null;
    st.input = input;
    const me = st.runners[0], c = compare(st.text, input, composing);
    const wasWrong = st.wrongNow;
    st.wrongNow = c.wrong;
    if (c.wrong && !wasWrong) { st.mistakes++; st.events.push({ type: 'mistake' }); }
    if (!c.wrong && wasWrong) st.events.push({ type: 'fix' });
    const before = me.pos;
    me.pos = c.ok;
    if (c.ok > before) { st.typed += c.ok - before; st.events.push({ type: 'char', ok: c.ok }); }
    while (st.sentencesDone < st.sentenceEnds.length && me.pos >= st.sentenceEnds[st.sentencesDone]) { st.sentencesDone++; st.events.push({ type: 'sentence', n: st.sentencesDone }); }
    if (c.done && me.finishT === null) { me.finishT = st.t; st.events.push({ type: 'finish', runner: 0, t: st.t }); }
    return c;
  }

  function step(st, dt) {
    if (st.over) return;
    if (st.phase === 'count') { st.countT -= dt; if (st.countT <= 0) { st.phase = 'race'; st.events.push({ type: 'go' }); } return; }
    st.t += dt;
    for (const r of st.runners) {
      if (r.me || r.finishT !== null) continue;
      // 사람처럼 빨랐다 느렸다 하고, 가끔 멈칫한다
      if (r.stun > 0) r.stun -= dt;
      else if (st.rand() < st.params.stumble * dt) r.stun = 0.4 + st.rand() * 0.8;
      if (r.stun > 0) continue;
      const wob = 1 + st.params.wobble * Math.sin(st.t * 0.9 + r.phase) * Math.sin(st.t * 0.37 + r.phase * 2);
      r.pos = Math.min(st.total, r.pos + (r.cpm / 60) * wob * dt);
      if (r.pos >= st.total) { r.finishT = st.t; st.events.push({ type: 'finish', runner: r.id, t: st.t }); }
    }
    const me = st.runners[0];
    if (me.finishT !== null) { st.doneT += dt; if (st.runners.every((r) => r.finishT !== null) || st.doneT > END_WAIT) { st.over = true; st.events.push({ type: 'over' }); } }
  }

  const rankOrder = (st) => st.runners.slice().sort((a, b) => (a.finishT !== null && b.finishT !== null ? a.finishT - b.finishT : a.finishT !== null ? -1 : b.finishT !== null ? 1 : b.pos - a.pos) || a.id - b.id);
  const rankOf = (st, id) => rankOrder(st).findIndex((r) => r.id === id) + 1;
  // 내 속도(글자/분)와 정확도(%)
  function stats(st) {
    const me = st.runners[0], t = me.finishT !== null ? me.finishT : st.t;
    const cpm = t > 0 ? Math.round((Math.floor(me.pos) / t) * 60) : 0;
    const accuracy = Math.round((st.total / (st.total + st.mistakes)) * 100);
    return { cpm, accuracy: me.finishT !== null ? accuracy : null, mistakes: st.mistakes, time: t };
  }

  const api = { COUNTDOWN, LEVELS, SENTENCES, NAMES, rng, keysOf, couldBecome, compare, pickPassage, newRace, setInput, step, rankOrder, rankOf, stats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LOGIC_TYPE = api;
})(typeof window !== 'undefined' ? window : globalThis);
