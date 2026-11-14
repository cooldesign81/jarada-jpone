/* =====================================================================
   자라다 JP 공통 상단 (jp-header.js)
   모든 업무 앱이 같은 3단 상단을 쓰도록 코드로 강제 (프로젝트 지침 8-3, 8-9)
     ① 다크바   : JP ONE으로 · 앱 ▾ (다른 앱 바로 가기) · 날짜 · 로그인한 사람 · 로그아웃
     ② 노랑 앱바: 앱 아이콘 + 앱 이름 · 메뉴 탭 · 원 선택      ← 버튼은 두지 않음
     ③ 도구줄   : 앱 쪽에서 <div class="jp-tool"> 로 만듦. 주 버튼(.jp-tool .p)은 한 화면에 하나
   쓰는 법 (각 앱):
     <script src="https://cooldesign81.github.io/jarada-jpone/shared/jp-header.js?v=1"></script>
     const hd = JPHeader.mount("#jpHeader", { app:"material", tabs:[{id,label}], active, onTab,
                 branches:[{value,label}], branch, onBranch, user, onLogout, admin });
     hd.update({ active:"..." , user:"..." , branch:"..." })   // 바뀐 것만 넘기면 됨
   이 파일을 고치면 모든 앱 상단이 같이 바뀜 → 고친 뒤 각 앱의 ?v= 숫자를 올려서 배포
   학부모용 화면(주차 쿠폰 학부모 페이지 등)에는 쓰지 않음 — 직원용 링크가 보이면 안 됨
   직원이 아닌 사람이 잠깐 들어오는 화면(신규 입사자 등록 링크 등)은 external:true → JP ONE·앱 메뉴를 숨김
   ===================================================================== */
(function () {
  const BASE = "https://cooldesign81.github.io/jarada-jpone/";
  // 앱 목록 = JP ONE 왼쪽 메뉴와 같은 순서·아이콘 (8-10)
  const APPS = {
    jpone:    { name: "JP ONE",        url: BASE,                                                icon: "favicon-32.png?v=4" },
    schedule: { name: "스케줄 매니저", url: "https://cooldesign81.github.io/jp-management/",     icon: "icons/apps/jp-management.png?v=3" },
    payment:  { name: "결제 매니저",   url: "https://cooldesign81.github.io/jarada-payment/",    icon: "icons/apps/jarada-payment.png?v=3" },
    booking:  { name: "보강 예약",     url: "https://jarada-makeup-booking.hisin0822.chatgpt.site/", glyph: "보" },
    material: { name: "재료 요청",     url: "https://cooldesign81.github.io/material/",          icon: "icons/apps/material.png?v=4" },
    jarvis:   { name: "자비스 업로더", url: "https://jarvis-webapp-8yim.onrender.com/",          icon: "icons/apps/jarvis.png?v=1" },
    parking:  { name: "주차 쿠폰",     url: "https://cooldesign81.github.io/iparking-web/admin/", icon: "icons/apps/iparking.png?v=3", note: "평촌 관리자" },
    people:   { name: "JP People",     url: "https://cooldesign81.github.io/jarada-people/",     icon: "icons/apps/jarada-people.png?v=3" },
    doc:      { name: "JP DOC STUDIO", url: "https://cooldesign81.github.io/jarada-payslip-doc/", icon: "icons/apps/jarada-payslip-doc.png?v=3", adminOnly: true }
  };
  const MENU = ["schedule", "payment", "booking", "material", "jarvis", "parking", "people", "doc"];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const iconSrc = a => a.icon ? (/^https?:/.test(a.icon) ? a.icon : BASE + a.icon) : "";
  const today = () => { const d = new Date(); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}`; };

  const CSS = `
  :host{display:block;font-family:'Pretendard',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;
    --y:#FECD3F;--ink:#222222;--deep:#161616;--line:#EEEEEE;--sub:#767676;line-height:1.4;-webkit-font-smoothing:antialiased}
  *{box-sizing:border-box}
  a{color:inherit;text-decoration:none}
  button{font:inherit;cursor:pointer}
  .top{height:36px;background:var(--deep);color:#CFCFCF;display:flex;align-items:center;gap:12px;padding:0 20px;font-size:12.5px}
  .home{display:flex;align-items:center;gap:6px;color:#fff;font-weight:700;white-space:nowrap}
  .home img{width:18px;height:18px;border-radius:4px}
  .home:hover,.home:focus-visible{color:var(--y)}
  .apps{position:relative}
  .apps>button{background:none;border:1px solid #474747;color:#E6E6E6;border-radius:6px;padding:3px 9px;font-size:12px;font-weight:600}
  .apps>button:hover,.apps>button[aria-expanded="true"]{border-color:var(--y);color:var(--y)}
  .menu{position:absolute;top:calc(100% + 6px);left:0;z-index:1000;background:#fff;color:var(--ink);border:1px solid #DDD;border-radius:8px;
    box-shadow:0 8px 24px rgba(0,0,0,.18);padding:6px;min-width:220px;display:grid;gap:2px}
  .menu[hidden]{display:none}
  .menu a{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;font-size:14px;font-weight:600}
  .menu a:hover,.menu a:focus-visible{background:#F5F5F5;outline:none}
  .menu a.cur{background:#FFF6D6}
  .menu img,.menu .gl{width:24px;height:24px;border-radius:6px;flex:none}
  .menu .gl{background:var(--y);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
  .menu small{margin-left:auto;font-size:11px;color:var(--sub);font-weight:500}
  .sp{flex:1}
  .date{white-space:nowrap}
  .who{color:#fff;font-weight:600;white-space:nowrap;max-width:280px;overflow:hidden;text-overflow:ellipsis}
  .who small{color:#AFAFAF;font-weight:400;margin-left:6px}
  .out{background:none;border:0;color:#fff;text-decoration:underline;text-underline-offset:3px;padding:0;font-size:12.5px;white-space:nowrap}
  .out:hover{color:var(--y)}
  .bar{min-height:60px;background:var(--y);color:var(--ink);display:flex;align-items:center;gap:20px;padding:0 20px}
  .app{display:flex;align-items:center;gap:10px;white-space:nowrap}
  .app img{width:34px;height:34px;border-radius:8px}
  .app b{font-size:19px;font-weight:800;letter-spacing:-.02em}
  .app small{font-size:12px;font-weight:600;color:#6B5A1E}
  .tabs{display:flex;gap:4px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}
  .tabs::-webkit-scrollbar{display:none}
  .tabs button{background:none;border:0;padding:8px 12px;border-radius:6px;font-weight:700;font-size:14.5px;color:var(--ink);white-space:nowrap}
  .tabs button:hover{background:rgba(0,0,0,.07)}
  .tabs button[aria-current="page"]{background:var(--ink);color:var(--y)}
  .tabs .bd{display:inline-block;min-width:18px;padding:0 5px;margin-left:5px;border-radius:9px;background:#D1182A;color:#fff;font-size:11px;line-height:18px;text-align:center;vertical-align:1px}
  .tabs button:focus-visible,.apps>button:focus-visible,.out:focus-visible,select:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
  .br{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;white-space:nowrap}
  .br select{font:inherit;font-weight:700;color:var(--ink);background:#fff;border:2px solid var(--ink);border-radius:6px;padding:6px 10px;cursor:pointer}
  .br select option{color:#222;background:#fff}
  .slot{display:flex;align-items:center;gap:8px}
  @media (max-width:768px){
    .top{padding:0 12px;gap:10px}
    .date,.who small{display:none}
    .who{max-width:120px}
    .bar{flex-wrap:wrap;padding:10px 12px 0;gap:8px 10px}
    .app b{font-size:17px}.app img{width:28px;height:28px}.app small{display:none}
    .br{margin-left:auto}.br>span{display:none}
    .tabs{flex-basis:100%;order:3;padding-bottom:8px}
    .tabs button{padding:7px 10px;font-size:14px}
  }
  @media print{ :host{display:none} }`;

  // 도구줄(③)은 앱 쪽 화면에 두므로 일반 CSS로 한 번만 넣음
  const TOOL_CSS = `
  .jp-tool{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 20px;font-family:'Pretendard',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif}
  .jp-tool .sp{flex:1}
  .jp-tool>button,.jp-tool>label.jp-b,.jp-tool>a.jp-b,.jp-tool>input,.jp-tool>select{font:inherit;font-size:13.5px;font-weight:600;color:#4E4E4E;background:#fff;border:1px solid #E2E2E2;
    border-radius:6px;padding:8px 12px;cursor:pointer;line-height:1.2;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
  .jp-tool>button:hover,.jp-tool>label.jp-b:hover{border-color:#BDBDBD}
  .jp-tool>button.p{background:#DE8619;border-color:#DE8619;color:#fff}
  .jp-tool>button.p:hover{filter:brightness(.95)}
  .jp-tool>button:disabled{opacity:.5;cursor:default}
  @media (max-width:768px){ .jp-tool{padding:10px 12px} }
  @media print{ .jp-tool{display:none} }`;

  function injectToolCss(){
    if (document.getElementById("jp-tool-css")) return;
    const st = document.createElement("style"); st.id = "jp-tool-css"; st.textContent = TOOL_CSS; document.head.appendChild(st);
  }

  function mount(target, opts) {
    const host = typeof target === "string" ? document.querySelector(target) : target;
    if (!host) throw new Error("JPHeader: 상단을 넣을 자리를 찾지 못했어요 " + target);
    injectToolCss();
    const root = host.shadowRoot || host.attachShadow({ mode: "open" });
    let o = { tabs: [], branches: [], ...opts };
    let open = false;

    function render() {
      const a = APPS[o.app] || { name: o.title || "자라다" };
      const title = o.title || a.name;
      const items = MENU.filter(k => !APPS[k].adminOnly || o.admin);
      root.innerHTML = `<style>${CSS}</style>
        <div class="top" role="navigation" aria-label="자라다 앱">
          ${o.external ? `<span class="home">자라다</span>` : `<a class="home" href="${APPS.jpone.url}" title="JP ONE으로"><img src="${iconSrc(APPS.jpone)}" alt="">JP ONE</a>
          <div class="apps"><button type="button" aria-haspopup="true" aria-expanded="${open}">앱 ▾</button>
            <div class="menu" ${open ? "" : "hidden"} role="menu">${items.map(k => { const x = APPS[k];
              return `<a role="menuitem" href="${esc(x.url)}" class="${k === o.app ? "cur" : ""}">${x.icon ? `<img src="${esc(iconSrc(x))}" alt="">` : `<span class="gl">${esc(x.glyph || "")}</span>`}${esc(x.name)}${x.note ? `<small>${esc(x.note)}</small>` : ""}</a>`; }).join("")}</div></div>`}
          <span class="sp"></span>
          <span class="date">${today()}</span>
          ${o.user ? `<span class="who" title="${esc(o.email || o.user)}">${esc(o.user)}${o.email && o.email !== o.user ? `<small>${esc(o.email)}</small>` : ""}</span>` : ""}
          ${o.onLogout && o.user ? `<button type="button" class="out">로그아웃</button>` : ""}
        </div>
        <div class="bar">
          <div class="app">${a.icon ? `<img src="${esc(iconSrc(a))}" alt="">` : ""}<b>${esc(title)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</div>
          <nav class="tabs" aria-label="${esc(title)} 메뉴">${o.tabs.map(t => `<button type="button" data-tab="${esc(t.id)}" ${t.id === o.active ? 'aria-current="page"' : ""}>${esc(t.label)}${t.badge ? `<span class="bd">${esc(t.badge)}</span>` : ""}</button>`).join("")}</nav>
          ${o.branches.length ? `<label class="br"><span>${esc(o.branchLabel || "원")}</span><select aria-label="${esc(o.branchLabel || "원")} 선택">${o.branches.map(b => `<option value="${esc(b.value)}" ${b.value === o.branch ? "selected" : ""}>${esc(b.label)}</option>`).join("")}</select></label>` : ""}
          <div class="slot"><slot name="right"></slot></div>
        </div>`;
    }
    root.addEventListener("click", e => {
      const ap = e.target.closest(".apps>button");
      if (ap) { open = !open; render(); if (open) root.querySelector(".menu a")?.focus(); return; }
      const tb = e.target.closest(".tabs button");
      if (tb) { o.active = tb.dataset.tab; render(); o.onTab?.(tb.dataset.tab); return; }
      if (e.target.closest(".out")) { o.onLogout?.(); return; }
    });
    root.addEventListener("change", e => { if (e.target.matches(".br select")) { o.branch = e.target.value; o.onBranch?.(e.target.value); } });
    root.addEventListener("keydown", e => { if (e.key === "Escape" && open) { open = false; render(); root.querySelector(".apps>button")?.focus(); } });
    document.addEventListener("click", e => { if (open && !e.composedPath().includes(host)) { open = false; render(); } });
    render();
    return { update(p) { o = { ...o, ...p }; render(); }, get options() { return o; } };
  }
  window.JPHeader = { mount, APPS, version: 1 };
})();
