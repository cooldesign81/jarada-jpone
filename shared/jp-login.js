/* =====================================================================
   자라다 JP 공통 로그인 화면 (jp-login.js) — 시안 3안: 좌우 나눔
     왼쪽 검정 패널: 앱 아이콘 · 앱 이름 · 한 줄 설명 · "JP ONE · 자라다 직원 앱 모음"
     오른쪽: 로그인 — [구글 계정] 기본, 원 공용 계정은 칩을 눌러야 펼쳐짐
   화면만 그리고, 실제 로그인은 각 앱이 넘겨준 함수가 함 (앱마다 Firebase 프로젝트가 달라서)
   쓰는 법:
     <script src="https://cooldesign81.github.io/jarada-jpone/shared/jp-login.js?v=1"></script>
     const lg = JPLogin.show({ app:"schedule",
        google: async () => { await signInWithPopup(auth, new GoogleAuthProvider()); },
        common: async (email, pw) => { await signInWithEmailAndPassword(auth, email, pw); },   // 없으면 칩이 안 보임
        commonLabel: "원 공용 계정" });
     lg.update({ loading:true }) / lg.update({ error:"..." })
     lg.update({ denied:{ email, msg }, onSwitch: async () => {...} })   // 명단에 없는 계정
     JPLogin.hide()   // 로그인되면 닫기
     links:[{ label:"다른 원으로 변경", fn(){...} }]   // 아래쪽 작은 글자 링크
   ── 구글 로그인 이어받기 (v2) ──
     sso: t => signInWithCredential(auth, GoogleAuthProvider.credential(null, t))   // 넘기면: JP ONE(또는 다른 자라다 앱)에서
        한 시간 안에 구글로 로그인했을 때 받은 토큰으로 창 없이 같은 계정으로 들어옴. 안 되면 평소 로그인 화면
     google 함수는 signInWithPopup 결과를 돌려줘야 함(그래야 토큰을 다른 앱에 넘김)
     JPLogin.guard(user, () => signOut(auth))   // 로그인된 사용자마다 부름. JP ONE에서 '로그아웃'하면 다른 앱도 같이 나감
     JPLogin.logoutAll()                        // JP ONE 로그아웃 때
   학부모용 화면(주차 쿠폰 학부모 페이지)과 주차 관리자 화면에는 쓰지 않음
   ===================================================================== */
(function () {
  const BASE = "https://cooldesign81.github.io/jarada-jpone/";
  const APPS = {
    jpone:    { name: "JP ONE",        icon: "apple-touch-icon.png?v=4",            desc: "자라다 직원 시작 페이지.<br>공지·일정·할 일·자료실·대시보드를 한곳에서 봐요." },
    schedule: { name: "스케줄 매니저", icon: "icons/apps/jp-management.png?v=3",   desc: "오늘 등원·결석·보강을 한 화면에서.<br>원의 출결을 여러 기기에서 실시간으로 함께 봐요." },
    payment:  { name: "결제 매니저",   icon: "icons/apps/jarada-payment.png?v=3",  desc: "결제 확인과 매출 장부.<br>미납 확인과 결제 안내 문자를 원별로 관리해요." },
    material: { name: "재료 요청",     icon: "icons/apps/material.png?v=4",        desc: "수업 재료 요청과 구매.<br>교사 요청부터 장바구니·결제까지 한 흐름으로." },
    people:   { name: "JP People",     icon: "icons/apps/jarada-people.png?v=3",   desc: "직원 정보·서류·교사 성장 기록을<br>한곳에서 관리해요." },
    doc:      { name: "JP DOC STUDIO", icon: "icons/apps/jarada-payslip-doc.png?v=3", desc: "급여명세서와 인센티브 내역을<br>직원별 PDF·이미지로 만들어요." }
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ERR = {
    "auth/invalid-credential": "이메일이나 비밀번호가 맞지 않아요.",
    "auth/wrong-password": "이메일이나 비밀번호가 맞지 않아요.",
    "auth/user-not-found": "이메일이나 비밀번호가 맞지 않아요.",
    "auth/invalid-email": "이메일 형식이 맞지 않아요.",
    "auth/too-many-requests": "여러 번 틀려서 잠시 막혔어요. 조금 뒤에 다시 해 주세요.",
    "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
    "auth/popup-blocked": "팝업이 막혔어요. 주소창 오른쪽에서 팝업을 허용해 주세요.",
    "auth/user-disabled": "사용이 중지된 계정이에요. 대표님께 문의해 주세요."
  };
  const errText = e => e?.userMessage || ERR[e?.code] || "로그인하지 못했어요. 다시 해 주세요.";
  const quiet = e => e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request";

  const CSS = `
  :host{all:initial;position:fixed;inset:0;z-index:2147483000;display:block;background:#F5F5F5;overflow:auto;
    font-family:'Pretendard',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#4E4E4E;line-height:1.5;-webkit-font-smoothing:antialiased}
  *{box-sizing:border-box}
  button,input{font:inherit}
  .wrap{display:flex;min-height:100%}
  .left{width:44%;max-width:560px;background:#222;color:#BDBDBD;display:flex;flex-direction:column;justify-content:space-between;padding:48px 44px}
  .left img{width:72px;height:72px;border-radius:16px;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.12)}
  .left h1{font-size:34px;line-height:1.25;font-weight:800;color:#fff;margin:20px 0 10px;letter-spacing:-.02em}
  .left p{font-size:15px;margin:0;line-height:1.7}
  .brand{font-size:12.5px;color:#8A8A8A;margin-top:32px}
  .brand a{color:#FECD3F;font-weight:800;text-decoration:none}
  .right{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 24px}
  .box{width:100%;max-width:360px}
  h2{font-size:24px;font-weight:800;color:#222;margin:0 0 4px}
  .lead{font-size:14px;color:#767676;margin:0 0 20px}
  .chips{display:flex;gap:6px;margin:0 0 16px}
  .chips button{border:1px solid #E3E3E3;background:#fff;color:#4E4E4E;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer}
  .chips button[aria-pressed="true"]{background:#222;color:#FECD3F;border-color:#222}
  .chips button:focus-visible,.g:focus-visible,.pb:focus-visible,.sb:focus-visible,input:focus-visible{outline:2px solid #DE8619;outline-offset:2px}
  .g{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;border:1px solid #DADCE0;border-radius:6px;
    padding:12px;font-size:15px;font-weight:700;color:#222;cursor:pointer}
  .g:hover{background:#F8F9FA}
  .g svg{width:18px;height:18px;flex:none}
  form{display:grid;gap:8px}
  label{font-size:12.5px;font-weight:700;color:#4E4E4E;margin-top:4px}
  input{width:100%;border:1px solid #E3E3E3;border-radius:6px;padding:11px 12px;font-size:15px;color:#222;background:#fff}
  .pb{margin-top:8px;width:100%;background:#DE8619;color:#fff;border:0;border-radius:6px;padding:12px;font-size:15px;font-weight:700;cursor:pointer}
  .pb:hover{opacity:.92}
  .sb{width:100%;background:#fff;color:#4E4E4E;border:1px solid #EEEEEE;border-radius:6px;padding:11px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px}
  button:disabled{opacity:.55;cursor:default}
  .note{font-size:12.5px;color:#999;margin:14px 0 0;line-height:1.6}
  .err{font-size:13.5px;color:#C62828;margin:12px 0 0;line-height:1.5}
  .links{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:22px;padding-top:14px;border-top:1px solid #EEE}
  .links button{background:none;border:0;padding:4px 0;font-size:13px;color:#767676;text-decoration:underline;cursor:pointer}
  .links button:hover{color:#222}
  .deny{background:#fff;border:1px solid #EEE;border-left:4px solid #C62828;border-radius:8px;padding:14px 16px;margin:16px 0 12px;font-size:14px;line-height:1.6;color:#4E4E4E}
  .deny b{color:#222}
  .wait{font-size:14px;color:#767676;display:flex;align-items:center;gap:10px}
  .wait i{width:16px;height:16px;border:2px solid #DDD;border-top-color:#DE8619;border-radius:50%;animation:r .8s linear infinite}
  @keyframes r{to{transform:rotate(360deg)}}
  @media (max-width:768px){
    .wrap{flex-direction:column}
    .left{width:auto;max-width:none;padding:24px 20px 22px}
    .left img{width:48px;height:48px;border-radius:11px}
    .left h1{font-size:24px;margin:12px 0 4px}
    .left p{font-size:13px}
    .brand{display:none}
    .right{align-items:flex-start;padding:24px 20px 40px}
  }
  @media print{:host{display:none}}`;
  const G_LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>`;

  let host = null, root = null, o = {}, mode = "google", busy = false;

  /* 구글 로그인 이어받기: 같은 주소(cooldesign81.github.io)의 자라다 앱끼리 한 시간짜리 구글 토큰을 나눠 씀 */
  const SSO = "jp.sso", OUT = "jp.sso.out", HINT = "jp.sso.email";
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };
  const tokenOf = r => r?.credential?.accessToken || r?._tokenResponse?.oauthAccessToken || "";
  function save(r) {
    const em = String(r?.user?.email || "").toLowerCase(), t = tokenOf(r);
    if (em) ls.set(HINT, em);
    if (em && t) ls.set(SSO, JSON.stringify({ t, em, exp: Date.now() + 50 * 60e3 }));
  }
  function token(email) {
    try { const x = JSON.parse(ls.get(SSO) || "null"); if (!x || x.exp < Date.now()) return ""; if (email && x.em !== String(email).toLowerCase()) return ""; return x.t; } catch { return ""; }
  }
  const hint = () => ls.get(HINT) || "";
  function logoutAll() { ls.set(OUT, String(Date.now())); ls.del(SSO); }
  let guardFn = null;
  // JP ONE에서 로그아웃한 뒤에 남은 다른 앱 로그인은 끊음. 열려 있는 탭도 바로
  function guard(user, signOutFn) {
    // 원 공용 계정(비밀번호)은 데스크에서 여러 사람이 쓰므로 같이 로그아웃하지 않음
    if (!(user?.providerData || []).some(p => p && p.providerId === "google.com")) { guardFn = null; return true; }
    guardFn = signOutFn;
    const out = +(ls.get(OUT) || 0), last = Date.parse(user?.metadata?.lastSignInTime || "") || 0;
    if (out && last && out > last + 5000) { try { signOutFn(); } catch {} return false; }
    return true;
  }
  window.addEventListener("storage", e => { if (e.key === OUT && e.newValue && guardFn) { try { guardFn(); } catch {} } });
  let ssoTried = false;

  function render() {
    const a = APPS[o.app] || { name: o.title || "자라다", icon: "", desc: "" };
    const name = o.title || a.name, desc = o.desc || a.desc;
    const hasCommon = typeof o.common === "function";
    if (!hasCommon) mode = "google";
    let body;
    if (o.loading) body = `<div class="wait"><i></i>${esc(o.loadingText || "로그인 확인 중…")}</div>`;
    else if (o.denied) body = `<div class="deny"><b>${esc(o.denied.email || "이 계정")}</b> 계정으로는 들어올 수 없어요.<br>${esc(o.denied.msg || "대표님께 JP ONE 직원 명단에 등록해 달라고 요청해 주세요.")}</div>
        ${o.onSwitch ? `<button type="button" class="g" data-a="switch">${G_LOGO}다른 구글 계정으로 로그인</button>` : ""}
        ${hasCommon ? `<button type="button" class="sb" data-a="to-common">${esc(o.commonLabel || "원 공용 계정")}으로 로그인</button>` : ""}
        ${o.app !== "jpone" ? `<button type="button" class="sb" data-a="home">JP ONE으로 가기</button>` : ""}`;
    else body = `${hasCommon ? `<div class="chips" role="group" aria-label="로그인 방법">
          <button type="button" data-a="mode" data-m="google" aria-pressed="${mode === "google"}">구글 계정</button>
          <button type="button" data-a="mode" data-m="common" aria-pressed="${mode === "common"}">${esc(o.commonLabel || "원 공용 계정")}</button></div>` : ""}
        ${mode === "google" ? `<button type="button" class="g" data-a="google" ${busy ? "disabled" : ""}>${G_LOGO}${hint() && o.app !== "jpone" ? `구글로 계속 <small style="font-weight:500;color:#767676">${esc(hint())}</small>` : "구글로 로그인"}</button>
          <p class="note">${esc(o.note || (o.app === "jpone" ? "한 번 로그인하면 다른 자라다 앱도 바로 열려요." : "JP ONE에 로그인돼 있으면 바로 열려요."))}</p>`
        : `<form autocomplete="on" novalidate>
          <label for="em">이메일</label><input id="em" name="email" type="email" autocomplete="username" required value="${esc(o.commonEmail || "")}">
          <label for="pw">비밀번호</label><input id="pw" name="password" type="password" autocomplete="current-password" required>
          <button class="pb" type="submit" ${busy ? "disabled" : ""}>${busy ? "확인 중…" : "로그인"}</button>
          ${o.commonHint ? `<p class="note">${esc(o.commonHint)}</p>` : ""}</form>`}`;
    root.innerHTML = `<style>${CSS}</style>
      <div class="wrap">
        <section class="left"><div>${a.icon ? `<img src="${BASE + a.icon}" alt="">` : ""}<h1>${esc(name)}</h1><p>${desc}</p></div>
          <div class="brand">${o.app === "jpone" ? "<a>JP ONE</a> · 자라다 직원 앱 모음" : `<a href="${BASE}">JP ONE</a> · 자라다 직원 앱 모음`}</div></section>
        <main class="right"><div class="box">
          <h2>${o.denied ? "들어갈 수 없는 계정이에요" : "로그인"}</h2>
          ${o.denied || o.loading ? "" : `<p class="lead">${esc(o.lead || "자라다 직원 계정으로 들어와요")}</p>`}
          ${body}
          ${o.error ? `<p class="err" role="alert">${esc(o.error)}</p>` : ""}
          ${(o.links || []).length && !o.loading ? `<div class="links">${o.links.map((l, i) => `<button type="button" data-a="link" data-i="${i}">${esc(l.label)}</button>`).join("")}</div>` : ""}
        </div></main>
      </div>`;
  }
  async function run(fn) {
    if (busy) return;
    busy = true; o.error = ""; render();
    try { await fn(); }
    catch (e) { if (!quiet(e)) o.error = errText(e); }
    finally { busy = false; if (host && host.isConnected) render(); }
  }
  function onClick(e) {
    const b = e.target.closest("[data-a]"); if (!b) return;
    const a = b.dataset.a;
    if (a === "mode") { mode = b.dataset.m; o.error = ""; render(); if (mode === "common") root.getElementById("em")?.focus(); }
    else if (a === "google") run(() => o.google());
    else if (a === "switch") run(async () => { await o.onSwitch(); });
    else if (a === "to-common") { o.denied = null; mode = "common"; o.error = ""; render(); root.getElementById("em")?.focus(); }
    else if (a === "home") location.href = BASE;
    else if (a === "link") o.links?.[+b.dataset.i]?.fn?.();
  }
  function onSubmit(e) {
    e.preventDefault();
    const em = root.getElementById("em").value.trim(), pw = root.getElementById("pw").value;
    if (!em || !pw) { o.error = "이메일과 비밀번호를 넣어 주세요."; render(); return; }
    o.commonEmail = em;
    run(() => o.common(em, pw));
  }
  function show(opts) {
    o = { ...opts }; mode = opts.mode || "google"; busy = false;
    if (typeof opts.google === "function") { const g = opts.google; o.google = async () => { const r = await g(); save(r); return r; }; }
    if (typeof opts.onSwitch === "function") { const g = opts.onSwitch; o.onSwitch = async () => { const r = await g(); save(r); return r; }; }
    // 이어받기: 토큰이 있으면 화면 대신 '들어가는 중'을 보여주고 조용히 로그인 (한 화면에서 한 번만 시도)
    const t = !ssoTried && !opts.denied && typeof opts.sso === "function" ? token() : "";
    if (t) {
      ssoTried = true; o.loading = true; o.loadingText = "JP ONE 계정으로 들어가는 중…";
      Promise.resolve().then(() => opts.sso(t)).catch(() => { ls.del(SSO); if (host && host.isConnected && o.loading) { o.loading = false; render(); } });
    }
    if (!host || !host.isConnected) {
      host = document.createElement("jp-login");
      host.setAttribute("role", "dialog"); host.setAttribute("aria-label", "로그인");
      document.body.appendChild(host);
      root = host.attachShadow({ mode: "open" });
      root.addEventListener("click", onClick);
      root.addEventListener("submit", onSubmit);
    }
    document.documentElement.style.overflow = "hidden";
    render();
    return ctl;
  }
  const ctl = {
    update(p) { if (!host) return ctl; o = { ...o, ...p }; if (p.mode) mode = p.mode; render(); return ctl; },
    hide() { JPLogin.hide(); }
  };
  function hide() { if (host) { host.remove(); host = null; root = null; } document.documentElement.style.overflow = ""; }
  window.JPLogin = { show, hide, update: p => ctl.update(p), get open() { return !!host; }, errText, save, token, hint, guard, logoutAll, version: 2 };
})();
