'use strict';
const $ = id => document.getElementById(id);
const TURN_MS = 30000, K = 32;
const AVATARS = ['😎','😀','🤖','🦊','🐱','🐼','🐯','🦄','🐲','👾','🎯','🔥'];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
};
const me = {
  name: store.get('name', 'Player' + Math.floor(100 + Math.random() * 900)),
  avatar: store.get('avatar', AVATARS[0])
};
let OFFSET = 0, FB = null, G = null, lobby = null, pendingNext = null;
const LEVELS = [null, { n: 'Dễ', a: '🐣' }, { n: 'Trung bình', a: '🙂' }, { n: 'Khó', a: '🤖' }, { n: 'Rất khó', a: '👹' }, { n: 'Siêu khó', a: '💀' }];
const now = () => Date.now() + OFFSET;
const other = p => p === 'X' ? 'O' : 'X';
const kk = (r, c) => r + ',' + c;

/* ---------- Màn hình & menu ---------- */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  if (id === 'game') requestAnimationFrame(() => { resize(); center(); });
}
function msg(t) { $('menuMsg').textContent = t || '' }
function cleanName() { return ($('nameIn').value.trim().slice(0, 16)) || 'Player' }
function saveProfileLocal() {
  me.name = cleanName(); me.avatar = $('avBtn').textContent;
  store.set('name', me.name); store.set('avatar', me.avatar);
}
$('nameIn').value = me.name; $('avBtn').textContent = me.avatar;
$('nameIn').addEventListener('change', saveProfileLocal);
AVATARS.forEach(a => {
  const b = document.createElement('button'); b.textContent = a;
  b.onclick = () => { $('avBtn').textContent = a; $('avPick').hidden = true; saveProfileLocal() };
  $('avPick').appendChild(b);
});
$('avBtn').onclick = () => { $('avPick').hidden = !$('avPick').hidden };
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { pendingNext = null; show('menu') });
$('bOffline').onclick = () => { saveProfileLocal(); show('offline') };
$('bAI').onclick = () => show('levels');
document.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => startOffline('ai', +b.dataset.lv));
$('lvBack').onclick = () => show('offline');
$('bPVP').onclick = () => startOffline('pvp');
async function goOnline(next) {
  saveProfileLocal(); msg('Đang kết nối…');
  try { await initFirebase() } catch (e) { msg(errText(e)); return }
  msg('');
  if (!FB.auth.currentUser) { pendingNext = next; showAcct(); return }
  try { await next() } catch (e) { msg(errText(e)) }
}
$('bOnline').onclick = () => goOnline(findMatch);
$('bLb').onclick = () => goOnline(async () => { await ensureProfile(); await showLeaderboard() });
$('bAcct').onclick = async () => {
  saveProfileLocal(); msg('Đang kết nối…');
  try { await initFirebase() } catch (e) { msg(errText(e)); return }
  msg(''); pendingNext = null; showAcct();
};
function errText(e) {
  if (e && e.message === 'config') return 'Chưa cấu hình Firebase. Xem README.md, phần "Bật chơi Online".';
  return 'Không kết nối được. Kiểm tra mạng và cấu hình Firebase.';
}

/* ---------- Firebase ---------- */
async function initFirebase() {
  if (FB) return FB;
  let cfg;
  try { cfg = (await import('./firebase-config.js')).firebaseConfig } catch (e) { throw new Error('config') }
  if (!cfg || String(cfg.apiKey).startsWith('PASTE')) throw new Error('config');
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [A, Au, D] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')
  ]);
  const app = A.initializeApp(cfg), auth = Au.getAuth(app), db = D.getDatabase(app);
  await auth.authStateReady();
  D.onValue(D.ref(db, '.info/serverTimeOffset'), s => { OFFSET = s.val() || 0 });
  FB = { D, db, Au, auth, profile: null, get uid() { return auth.currentUser && auth.currentUser.uid } };
  return FB;
}
async function ensureProfile(adopt) {
  const { D, db, uid } = FB, r = D.ref(db, 'users/' + uid);
  let p = (await D.get(r)).val();
  if (!p) { p = { name: me.name, avatar: me.avatar, elo: 1000, games: 0, wins: 0 }; await D.set(r, p) }
  else if (adopt) {
    me.name = p.name || me.name; me.avatar = p.avatar || me.avatar;
    $('nameIn').value = me.name; $('avBtn').textContent = me.avatar;
    store.set('name', me.name); store.set('avatar', me.avatar);
  } else if (p.name !== me.name || p.avatar !== me.avatar) {
    await D.update(r, { name: me.name, avatar: me.avatar }); p.name = me.name; p.avatar = me.avatar;
  }
  FB.profile = p; updateAccLine();
}
function updateAccLine() {
  let t = 'Chưa đăng nhập';
  const u = FB && FB.auth.currentUser;
  if (u) t = (u.isAnonymous ? 'Khách' : (u.email || 'Tài khoản')) + (FB.profile ? ' · Elo ' + FB.profile.elo : '');
  $('eloLine').textContent = t;
}
function authErr(e) {
  const c = (e && e.code) || '';
  if (c.includes('email-already-in-use') || c.includes('credential-already-in-use')) return 'Email này đã được đăng ký. Hãy bấm Đăng nhập.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login')) return 'Sai email hoặc mật khẩu.';
  if (c.includes('weak-password')) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (c.includes('invalid-email')) return 'Email không hợp lệ.';
  if (c.includes('operation-not-allowed')) return 'Chưa bật Email/Password trong Firebase (xem README).';
  if (c.includes('too-many-requests')) return 'Thử quá nhiều lần, hãy đợi một lúc.';
  return 'Có lỗi, hãy kiểm tra mạng và thử lại.';
}
function showAcct(note) {
  const u = FB.auth.currentUser, anon = u && u.isAnonymous;
  $('acStatus').textContent = !u ? 'Bạn chưa đăng nhập. Chọn một cách để vào Online.'
    : anon ? 'Đang chơi với tư cách khách. Đăng ký để giữ Elo khi đổi máy.' : 'Đã đăng nhập: ' + u.email;
  $('acForm').hidden = !!u && !anon; $('acGuest').hidden = !!u; $('acOut').hidden = !u || !!anon; $('acCont').hidden = !u;
  $('acMsg').textContent = note || '';
  show('acct');
}
async function finishAuth() {
  const n = pendingNext; pendingNext = null; updateAccLine();
  if (n) { try { await n() } catch (e) { msg(errText(e)); show('menu') } } else show('menu');
}
async function authDo(fn, adopt) {
  $('acMsg').textContent = 'Đang xử lý…';
  try { await fn(); FB.profile = null; await ensureProfile(adopt); await finishAuth() } catch (e) { $('acMsg').textContent = authErr(e) }
}
const cred = () => ({ email: $('acEmail').value.trim(), pw: $('acPass').value });
$('acLogin').onclick = () => {
  const { email, pw } = cred(); if (!email || !pw) { $('acMsg').textContent = 'Nhập email và mật khẩu.'; return }
  const u = FB.auth.currentUser;
  if (u && u.isAnonymous && !confirm('Đăng nhập sẽ rời tài khoản khách hiện tại (Elo của khách sẽ không được giữ). Tiếp tục?')) return;
  authDo(() => FB.Au.signInWithEmailAndPassword(FB.auth, email, pw), true);
};
$('acReg').onclick = () => {
  const { email, pw } = cred(); if (!email || !pw) { $('acMsg').textContent = 'Nhập email và mật khẩu.'; return }
  const u = FB.auth.currentUser;
  authDo(() => u && u.isAnonymous ? FB.Au.linkWithCredential(u, FB.Au.EmailAuthProvider.credential(email, pw)) : FB.Au.createUserWithEmailAndPassword(FB.auth, email, pw), false);
};
$('acGuest').onclick = () => authDo(() => FB.Au.signInAnonymously(FB.auth), false);
$('acOut').onclick = async () => { await FB.Au.signOut(FB.auth); FB.profile = null; updateAccLine(); showAcct('Đã đăng xuất.') };
$('acCont').onclick = finishAuth;
initFirebase().then(async () => {
  if (FB.auth.currentUser) { try { await ensureProfile() } catch (e) {} }
  updateAccLine();
}).catch(() => {});
async function adjustElo(delta, wins, games) {
  const { D, db, uid } = FB;
  const r = await D.runTransaction(D.ref(db, 'users/' + uid), cur => {
    if (cur === null) return cur;
    cur.elo = (cur.elo || 1000) + delta; cur.wins = (cur.wins || 0) + wins; cur.games = (cur.games || 0) + games;
    return cur;
  });
  const v = r.snapshot.val();
  if (v) { FB.profile = v; updateAccLine() }
}
const expected = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
function eloDeltas(a, b) {
  const E = expected(a, b);
  return { win: Math.max(1, Math.round(K * (1 - E))), loss: Math.min(-1, Math.round(K * (0 - E))) };
}
async function showLeaderboard() {
  const { D, db, uid } = FB;
  const snap = await D.get(D.query(D.ref(db, 'users'), D.orderByChild('elo'), D.limitToLast(50)));
  const rows = []; snap.forEach(c => { rows.push({ id: c.key, ...c.val() }) }); rows.reverse();
  const ul = $('lbList'); ul.textContent = '';
  rows.forEach((u, i) => {
    const li = document.createElement('li'); if (u.id === uid) li.className = 'me';
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = i + 1;
    const av = document.createElement('div'); av.className = 'av'; av.textContent = u.avatar || '😎';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = u.name || 'Player';
    const el = document.createElement('b'); el.textContent = u.elo;
    li.append(rk, av, nm, el); ul.appendChild(li);
  });
  $('lbMsg').textContent = rows.length ? '' : 'Chưa có ai trên bảng xếp hạng.';
  show('lb');
}

/* ---------- Ghép trận ---------- */
async function findMatch() {
  const { D, db, uid } = FB;
  await ensureProfile();
  show('lobby');
  const L = { claiming: false, u: [] }; lobby = L;
  const qRef = D.ref(db, 'queue/' + uid), mRef = D.ref(db, 'match/' + uid);
  L.qRef = qRef;
  await D.set(qRef, { name: me.name, avatar: me.avatar, elo: FB.profile.elo, ts: Date.now() });
  D.onDisconnect(qRef).remove();
  L.u.push(D.onValue(mRef, s => {
    const gid = s.val();
    if (gid && lobby === L) { endLobby(); D.remove(mRef); startOnline(gid) }
  }));
  L.u.push(D.onValue(D.ref(db, 'queue'), async s => {
    if (lobby !== L || L.claiming) return;
    const q = s.val() || {};
    const c = Object.entries(q).filter(([id]) => id > uid)
      .sort((a, b) => Math.abs(a[1].elo - FB.profile.elo) - Math.abs(b[1].elo - FB.profile.elo));
    if (!c.length) return;
    L.claiming = true;
    const [oid, o] = c[0];
    try {
      const tr = await D.runTransaction(D.ref(db, 'queue/' + oid), cur => cur ? null : undefined);
      if (!tr.committed || lobby !== L) { L.claiming = false; return }
      const gid = D.push(D.ref(db, 'games')).key;
      const mine = { uid, name: me.name, avatar: me.avatar, elo: FB.profile.elo };
      const theirs = { uid: oid, name: o.name, avatar: o.avatar, elo: o.elo };
      const flip = Math.random() < .5;
      await D.set(D.ref(db, 'games/' + gid), { players: flip ? { X: mine, O: theirs } : { X: theirs, O: mine }, created: now() });
      await D.set(D.ref(db, 'match/' + oid), gid);
      await D.set(mRef, gid);
    } catch (e) { L.claiming = false }
  }));
}
function endLobby() {
  const L = lobby; if (!L) return; lobby = null;
  L.u.forEach(f => f());
  try { FB.D.remove(L.qRef); FB.D.onDisconnect(L.qRef).cancel() } catch (e) {}
}
$('bCancel').onclick = () => { endLobby(); show('menu') };

/* ---------- Trận đấu ---------- */
function newGame(o) {
  G = Object.assign({ board: new Map(), moves: [], turn: 'X', over: false, last: null, winCells: null, unsubs: [] }, o);
  if (!G.deadline) G.deadline = now() + TURN_MS;
  $('modal').classList.remove('on');
  show('game');
}
function startOffline(mode, level) {
  saveProfileLocal();
  level = level || 3;
  newGame({ mode, level });
  if (mode === 'ai') setPlayers({ name: me.name, avatar: me.avatar, elo: 'Offline', side: 'X' }, { name: 'Máy · ' + LEVELS[level].n, avatar: LEVELS[level].a, elo: 'Offline', side: 'O' });
  else setPlayers({ name: 'Người chơi 1', avatar: me.avatar, elo: 'Offline', side: 'X' }, { name: 'Người chơi 2', avatar: '🙂', elo: 'Offline', side: 'O' });
}
async function startOnline(gid) {
  const { D, db, uid } = FB;
  const g = (await D.get(D.ref(db, 'games/' + gid))).val();
  if (!g) { show('menu'); return }
  const side = g.players.X.uid === uid ? 'X' : 'O', opp = other(side);
  const dl = eloDeltas(g.players[side].elo, g.players[opp].elo);
  newGame({ mode: 'online', gid, mySide: side, elo: dl, base: g.players[side].elo, deadline: g.created + TURN_MS + 4000 });
  setPlayers({ ...g.players[side], side }, { ...g.players[opp], side: opp });
  adjustElo(dl.loss, 0, 1);
  G.unsubs.push(D.onChildAdded(D.ref(db, 'games/' + gid + '/moves'), s => {
    const m = s.val(); if (!G || G.gid !== gid || G.board.has(kk(m.r, m.c))) return;
    if (applyMove(m.r, m.c, m.p, m.t)) writeResult(m.p, 'five');
  }));
  G.unsubs.push(D.onValue(D.ref(db, 'games/' + gid + '/result'), s => {
    const v = s.val(); if (v && G && G.gid === gid && !G.over) onlineOver(v);
  }));
}
function setPlayers(L, R) {
  G.sideL = L.side; G.sideR = R.side;
  for (const [s, p] of [['L', L], ['R', R]]) {
    $('av' + s).textContent = p.avatar || '😎'; $('n' + s).textContent = p.name || 'Player';
    $('e' + s).textContent = typeof p.elo === 'number' ? 'Elo ' + p.elo : p.elo;
    const sy = $('sy' + s); sy.textContent = p.side; sy.style.color = p.side === 'X' ? 'var(--x)' : 'var(--o)';
    $('p' + s).querySelector('u').style.background = p.side === 'X' ? 'var(--x)' : 'var(--o)';
  }
  updateTop();
}
function updateTop() {
  if (!G) return;
  $('pL').classList.toggle('act', G.turn === G.sideL && !G.over);
  $('pR').classList.toggle('act', G.turn === G.sideR && !G.over);
}
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const gp = (r, c) => G.board.get(kk(r, c)) || '';
function line(r, c, p) {
  for (const [dr, dc] of DIRS) {
    const l = [[r, c]];
    for (const s of [1, -1]) { let y = r + dr * s, x = c + dc * s; while (gp(y, x) === p) { l.push([y, x]); y += dr * s; x += dc * s } }
    if (l.length >= 5) return l;
  }
  return null;
}
function applyMove(r, c, p, t) {
  G.board.set(kk(r, c), p); G.moves.push([r, c, p]); G.last = [r, c];
  const w = line(r, c, p);
  if (w) G.winCells = w;
  G.turn = other(p); G.deadline = (t || now()) + TURN_MS;
  updateTop(); draw();
  return w;
}
function place(r, c) {
  if (!G || G.over || G.board.has(kk(r, c))) return;
  if (G.mode === 'ai' && G.turn !== 'X') return;
  if (G.mode === 'online') {
    if (G.turn !== G.mySide) return;
    const { D, db } = FB, n = G.moves.length, side = G.mySide;
    D.runTransaction(D.ref(db, 'games/' + G.gid + '/moves/' + n), cur => cur === null ? { r, c, p: side, t: now() } : undefined).catch(() => {});
    return;
  }
  const p = G.turn;
  if (applyMove(r, c, p, now())) { finishLocal(p, 'five'); return }
  if (G.mode === 'ai') setTimeout(aiMove, 300);
}
function aiMove() {
  if (!G || G.over || G.mode !== 'ai' || G.turn !== 'O') return;
  const [r, c] = aiPick();
  if (applyMove(r, c, 'O', now())) finishLocal('O', 'five');
}
function sc(r, c, p) {
  let t = 0;
  for (const [dr, dc] of DIRS) {
    let n = 1, open = 0;
    for (const s of [1, -1]) {
      let y = r + dr * s, x = c + dc * s;
      while (gp(y, x) === p) { n++; y += dr * s; x += dc * s }
      if (!gp(y, x)) open++;
    }
    if (n >= 5) t += 1e6;
    else if (n === 4) t += open === 2 ? 20000 : open ? 2000 : 0;
    else if (n === 3) t += open === 2 ? 1500 : open ? 150 : 0;
    else if (n === 2) t += open === 2 ? 100 : open ? 10 : 0;
    else t += open;
  }
  return t;
}
function candidates(d) {
  const set = new Set(), out = [];
  for (const [r, c] of G.moves) for (let y = -d; y <= d; y++) for (let x = -d; x <= d; x++) {
    const rr = r + y, cc = c + x, key = kk(rr, cc);
    if (!set.has(key) && !gp(rr, cc)) { set.add(key); out.push([rr, cc]) }
  }
  return out;
}
function heur(defW) {
  let best = -1, pick = [0, 0];
  for (const [r, c] of candidates(2)) {
    const v = sc(r, c, 'O') * 1.1 + sc(r, c, 'X') * defW + Math.random();
    if (v > best) { best = v; pick = [r, c] }
  }
  return pick;
}
function genCands(S, turn, K) {
  const set = new Set(), list = [];
  for (const [r, c] of S) for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
    const rr = r + y, cc = c + x, key = kk(rr, cc);
    if (!set.has(key) && !gp(rr, cc)) { set.add(key); list.push([rr, cc, sc(rr, cc, turn) * 1.1 + sc(rr, cc, other(turn))]) }
  }
  list.sort((a, b) => b[2] - a[2]);
  return list.slice(0, K);
}
function pat(n, open) {
  if (n >= 5) return 1e6;
  if (n === 4) return open === 2 ? 300000 : open ? 8000 : 0;
  if (n === 3) return open === 2 ? 5000 : open ? 300 : 0;
  if (n === 2) return open === 2 ? 200 : open ? 20 : 0;
  return 0;
}
function evalBoard(S) {
  let t = 0;
  for (const [r, c, p] of S) for (const [dr, dc] of DIRS) {
    if (gp(r - dr, c - dc) === p) continue;
    let n = 1, y = r + dr, x = c + dc;
    while (gp(y, x) === p) { n++; y += dr; x += dc }
    const v = pat(n, (gp(r - dr, c - dc) === '' ? 1 : 0) + (gp(y, x) === '' ? 1 : 0));
    t += p === 'O' ? v : -v * 1.05;
  }
  return t;
}
function search(S, d, alpha, beta, turn) {
  if (d === 0) return evalBoard(S);
  const cs = genCands(S, turn, d >= 3 ? 10 : 7);
  if (!cs.length) return evalBoard(S);
  let best = turn === 'O' ? -Infinity : Infinity;
  for (const [r, c] of cs) {
    G.board.set(kk(r, c), turn); S.push([r, c, turn]);
    const v = line(r, c, turn) ? (turn === 'O' ? 1 : -1) * (1e7 + d) : search(S, d - 1, alpha, beta, other(turn));
    S.pop(); G.board.delete(kk(r, c));
    if (turn === 'O') { if (v > best) best = v; if (v > alpha) alpha = v }
    else { if (v < best) best = v; if (v < beta) beta = v }
    if (beta <= alpha) break;
  }
  return best;
}
function searchPick(depth) {
  const S = G.moves.slice(), cs = genCands(S, 'O', 12);
  let best = -Infinity, pick = [cs[0][0], cs[0][1]];
  for (const [r, c] of cs) {
    G.board.set(kk(r, c), 'O'); S.push([r, c, 'O']);
    let v = line(r, c, 'O') ? 1e9 : search(S, depth - 1, -Infinity, Infinity, 'X');
    S.pop(); G.board.delete(kk(r, c));
    v += (sc(r, c, 'O') * 1.1 + sc(r, c, 'X')) * 0.3 + Math.random();
    if (v > best) { best = v; pick = [r, c] }
  }
  return pick;
}
function aiPick() {
  const L = G.level || 3;
  if (!G.moves.length) return [0, 0];
  if (L <= 2) {
    if (Math.random() < (L === 1 ? .5 : .15)) {
      const c = candidates(1); return c[Math.floor(Math.random() * c.length)];
    }
    return heur(L === 1 ? .6 : .9);
  }
  if (L === 3) return heur(1);
  return searchPick(L === 4 ? 2 : 4);
}

/* ---------- Kết thúc ---------- */
const WHY = { five: '', timeout: ' (đối thủ hết giờ)', resign: ' (đối thủ đầu hàng)' };
function openModal(title, html, again) {
  $('mt').textContent = title; $('mp').textContent = html;
  $('mAgain').textContent = again; $('modal').classList.add('on');
}
function finishLocal(winner, reason) {
  G.over = true; updateTop();
  let t;
  if (G.mode === 'ai') t = winner === 'X' ? 'Bạn thắng! 🎉' : (reason === 'timeout' ? 'Bạn hết giờ, máy thắng' : 'Máy thắng');
  else t = (winner === 'X' ? 'Người chơi 1 (X)' : 'Người chơi 2 (O)') + ' thắng! 🎉';
  openModal(t, reason === 'timeout' ? 'Hết thời gian suy nghĩ.' : '', 'Chơi lại');
}
async function writeResult(winner, reason) {
  if (!G || G.mode !== 'online') return;
  if (G.resAt && Date.now() - G.resAt < 2500) return;
  G.resAt = Date.now();
  try { await FB.D.runTransaction(FB.D.ref(FB.db, 'games/' + G.gid + '/result'), cur => cur === null ? { winner, reason } : undefined) } catch (e) {}
}
function onlineOver(v) {
  G.over = true; updateTop();
  const won = v.winner === G.mySide, d = G.elo;
  if (won) adjustElo(d.win - d.loss, 1, 0);
  const delta = won ? d.win : d.loss, nowElo = G.base + delta;
  $('eL').textContent = 'Elo ' + nowElo;
  const why = won ? WHY[v.reason] || '' : (v.reason === 'timeout' ? ' (bạn hết giờ)' : v.reason === 'resign' ? ' (bạn đầu hàng)' : '');
  openModal(won ? 'Bạn thắng! 🎉' : 'Bạn thua', 'Elo ' + (delta > 0 ? '+' : '') + delta + ' → ' + nowElo + why, 'Tìm trận mới');
}
function leaveGame() {
  if (G) G.unsubs.forEach(f => f());
  G = null; $('modal').classList.remove('on'); show('menu');
}
$('bLeave').onclick = () => {
  if (G && G.mode === 'online' && !G.over) {
    if (!confirm('Thoát sẽ tính là đầu hàng. Bạn chắc chứ?')) return;
    writeResult(other(G.mySide), 'resign').then(leaveGame);
  } else leaveGame();
};
$('mMenu').onclick = leaveGame;
$('mAgain').onclick = async () => {
  const mode = G && G.mode;
  if (mode === 'online') { leaveGame(); try { await findMatch() } catch (e) { msg(errText(e)) } }
  else if (mode) { const lv = G.level; G.unsubs.forEach(f => f()); startOffline(mode, lv) }
};

/* ---------- Đồng hồ ---------- */
setInterval(() => {
  if (!G || G.over) return;
  const rem = G.deadline - now(), s = Math.max(0, Math.ceil(rem / 1000));
  $('tm').textContent = s; $('tm').classList.toggle('low', s <= 5);
  const pct = Math.max(0, Math.min(100, rem / TURN_MS * 100));
  for (const k of ['L', 'R']) $('p' + k).querySelector('u').style.width = (G.turn === (k === 'L' ? G.sideL : G.sideR) ? pct : 0) + '%';
  if (rem <= 0) {
    const winner = other(G.turn);
    if (G.mode === 'online') writeResult(winner, 'timeout'); else finishLocal(winner, 'timeout');
  }
}, 200);

/* ---------- Bàn cờ vô hạn: vẽ, kéo, zoom ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
const V = { ox: 0, oy: 0, s: 36 };
let W = 0, H = 0, dpr = 1;
function resize() {
  const r = $('cw').getBoundingClientRect(); if (!r.width) return;
  dpr = window.devicePixelRatio || 1; W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw();
}
new ResizeObserver(resize).observe($('cw'));
function center() {
  const [r, c] = G && G.last ? G.last : [0, 0];
  V.ox = W / 2 - (c + .5) * V.s; V.oy = H / 2 - (r + .5) * V.s; draw();
}
function zoomAt(px, py, f) {
  const ns = Math.max(12, Math.min(90, V.s * f)), k = ns / V.s;
  V.ox = px - (px - V.ox) * k; V.oy = py - (py - V.oy) * k; V.s = ns; draw();
}
function draw() {
  if (!W) return;
  const cs = getComputedStyle(document.documentElement), col = n => cs.getPropertyValue(n).trim(), s = V.s;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = col('--panel'); ctx.fillRect(0, 0, W, H);
  const cell = (r, c) => [V.ox + c * s, V.oy + r * s];
  if (G) {
    if (G.last) { ctx.fillStyle = col('--last'); const [x, y] = cell(G.last[0], G.last[1]); ctx.fillRect(x, y, s, s) }
    if (G.winCells) { ctx.fillStyle = col('--win'); for (const [r, c] of G.winCells) { const [x, y] = cell(r, c); ctx.fillRect(x, y, s, s) } }
  }
  ctx.strokeStyle = col('--line'); ctx.lineWidth = 1; ctx.beginPath();
  for (let x = V.ox % s; x < W; x += s) { const a = Math.round(x) + .5; ctx.moveTo(a, 0); ctx.lineTo(a, H) }
  for (let y = V.oy % s; y < H; y += s) { const a = Math.round(y) + .5; ctx.moveTo(0, a); ctx.lineTo(W, a) }
  ctx.stroke();
  if (!G) return;
  ctx.lineWidth = Math.max(2, s * .09); ctx.lineCap = 'round';
  for (const [r, c, p] of G.moves) {
    const [x, y] = cell(r, c); if (x < -s || y < -s || x > W || y > H) continue;
    const cx = x + s / 2, cy = y + s / 2;
    if (p === 'X') {
      const d = s * .27; ctx.strokeStyle = col('--x'); ctx.beginPath();
      ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.moveTo(cx - d, cy + d); ctx.lineTo(cx + d, cy - d); ctx.stroke();
    } else { ctx.strokeStyle = col('--o'); ctx.beginPath(); ctx.arc(cx, cy, s * .3, 0, 7); ctx.stroke() }
  }
}
const ptrs = new Map(); let moved = false, startPt = null, pinch = null;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (ptrs.size === 1) { moved = false; startPt = { x: e.offsetX, y: e.offsetY } } else { moved = true; pinch = null }
});
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const nx = e.offsetX, ny = e.offsetY;
  if (ptrs.size === 1) {
    if (!moved && Math.hypot(nx - startPt.x, ny - startPt.y) > 6) moved = true;
    if (moved) { V.ox += nx - p.x; V.oy += ny - p.y; draw() }
    p.x = nx; p.y = ny;
  } else if (ptrs.size === 2) {
    p.x = nx; p.y = ny;
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (pinch) { zoomAt(mx, my, d / pinch.d); V.ox += mx - pinch.mx; V.oy += my - pinch.my; draw() }
    pinch = { d, mx, my };
  }
});
function endPtr(e, tap) {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (tap && ptrs.size === 1 && !moved) place(Math.floor((p.y - V.oy) / V.s), Math.floor((p.x - V.ox) / V.s));
  ptrs.delete(e.pointerId); pinch = null; if (ptrs.size) moved = true;
}
cv.addEventListener('pointerup', e => endPtr(e, true));
cv.addEventListener('pointercancel', e => endPtr(e, false));
cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.12 : 1 / 1.12) }, { passive: false });
$('zIn').onclick = () => zoomAt(W / 2, H / 2, 1.25);
$('zOut').onclick = () => zoomAt(W / 2, H / 2, 1 / 1.25);
$('zCen').onclick = center;

/* ---------- Cập nhật PWA ---------- */
if ('serviceWorker' in navigator) {
  const had = navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').then(r => r.update()).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) return;
    const u = $('upd'); u.style.display = 'block'; u.onclick = () => location.reload();
  });
}
