/* 자라다 JP ONE — NAS 커넥터
   하는 일: JP ONE에서 교사가 미션을 제출하면 생기는 'portalNasJobs' 작업을 30초마다 가져와서
     ① Firebase Storage에서 파일을 내려받고 ② 학원 NAS 교사 폴더에 저장하고 ③ 다시 읽어 SHA-256으로 같은지 확인한 뒤
     ④ JP ONE에 'NAS 보관 완료'를 표시해요. 실패하면 1분·5분·15분·1시간…으로 다시 시도해요.
   - 원본은 Firebase Storage에 그대로 남아요(지우지 않음). NAS는 교사별 보관함 역할.
   - NAS를 인터넷에 열지 않아요. 이 PC가 바깥(Firebase)으로만 연결해요.
   - 비밀번호·서비스 키는 이 PC의 config.json / service-account.json 에만 있어요(깃허브에 올리지 않음). */
const fs = require("fs"), fsp = fs.promises, path = require("path"), crypto = require("crypto"), { execFile } = require("child_process");
const admin = require("firebase-admin");

const DIR = __dirname, cfg = JSON.parse(fs.readFileSync(path.join(DIR, "config.json"), "utf8"));
const VERSION = "1.0.0";
admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(DIR, cfg.serviceAccount))), storageBucket: cfg.bucket });
const db = admin.firestore(), bucket = admin.storage().bucket();
const BACKOFF = [1, 5, 15, 60, 60, 120, 240, 360, 360, 360]; // 분
const MAX_TRY = BACKOFF.length;

const logDir = path.join(DIR, "logs"); fs.mkdirSync(logDir, { recursive: true });
function log(...a){ const line = `[${new Date().toLocaleString("ko-KR")}] ${a.join(" ")}`; console.log(line);
  fs.appendFileSync(path.join(logDir, new Date().toISOString().slice(0, 7) + ".log"), line + "\n"); }

// 폴더·파일 이름에 쓸 수 없는 글자 정리 (경로 이동 ../ 도 막음)
const safe = s => String(s || "").replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/\.\.+/g, ".").trim().slice(0, 80) || "_";
const sha = buf => crypto.createHash("sha256").update(buf).digest("hex");

/* ── 저장소: SMB(윈도우 공유 폴더) 또는 WebDAV ── */
let smbReady = false;
function run(cmd, args){ return new Promise((res, rej) => execFile(cmd, args, { windowsHide: true }, (e, out, err) => e ? rej(new Error((err || e.message).trim())) : res(out))); }
async function smbConnect(){
  if (smbReady) return; const { root, user, password } = cfg.smb;
  if (user) { const share = root.split("\\").slice(0, 4).join("\\"); try { await run("net", ["use", share, password, "/user:" + user, "/persistent:no"]); } catch (e) { if (!/1219|이미|already/i.test(e.message)) throw e; } }
  await fsp.access(root); smbReady = true;
}
const store = cfg.mode === "webdav" ? {
  async put(rel, buf){
    const base = cfg.webdav.url.replace(/\/$/, ""), auth = "Basic " + Buffer.from(cfg.webdav.user + ":" + cfg.webdav.password).toString("base64");
    const parts = rel.split("/"); let cur = base;
    for (const p of parts.slice(0, -1)) { cur += "/" + encodeURIComponent(p); const r = await fetch(cur, { method: "MKCOL", headers: { Authorization: auth } }); if (![201, 405, 301].includes(r.status) && !r.ok) throw new Error(`폴더 만들기 실패 ${r.status}`); }
    const url = base + "/" + parts.map(encodeURIComponent).join("/"), tmp = url + ".part";
    let r = await fetch(tmp, { method: "PUT", headers: { Authorization: auth }, body: buf }); if (!r.ok) throw new Error(`올리기 실패 ${r.status}`);
    r = await fetch(tmp, { method: "MOVE", headers: { Authorization: auth, Destination: url, Overwrite: "T" } }); if (!r.ok) throw new Error(`이름 바꾸기 실패 ${r.status}`);
    r = await fetch(url, { headers: { Authorization: auth } }); if (!r.ok) throw new Error(`다시 읽기 실패 ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  },
  async test(){ const b = Buffer.from("jarada test " + Date.now()); const back = await this.put(`${cfg.baseFolder}/_test/connector-test.txt`, b); return sha(back) === sha(b); }
} : {
  async put(rel, buf){
    await smbConnect();
    const full = path.join(cfg.smb.root, ...rel.split("/"));
    if (!path.resolve(full).startsWith(path.resolve(cfg.smb.root))) throw new Error("허용 폴더 밖 경로");
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const tmp = full + ".part"; await fsp.writeFile(tmp, buf); await fsp.rename(tmp, full);
    return fsp.readFile(full);
  },
  async test(){ const b = Buffer.from("jarada test " + Date.now()); const back = await this.put(`${cfg.baseFolder}/_test/connector-test.txt`, b); return sha(back) === sha(b); }
};

/* ── 작업 하나 처리 ── */
async function handle(doc){
  const j = doc.data(), ref = doc.ref;
  // 다른 PC와 겹치지 않게 '처리 중'으로 잡기 (트랜잭션)
  const ok = await db.runTransaction(async tx => { const s = await tx.get(ref); const d = s.data();
    if (!d || !["wait", "retry"].includes(d.status) || (d.nextAt || 0) > Date.now()) return false;
    tx.update(ref, { status: "copying", leaseUntil: Date.now() + 10 * 60e3, connector: VERSION }); return true; });
  if (!ok) return;
  try {
    const [buf] = await bucket.file(j.storagePath).download();
    const srcHash = sha(buf);
    const ext = path.extname(j.name || "") || "";
    const rel = [cfg.baseFolder, "교사", safe(j.teacherName), "미션허브", String(j.year), `${safe(j.missionTitle)}_${j.taskId.slice(0, 6)}`, `v${j.v}`, `${String(j.idx + 1).padStart(2, "0")}_${safe(path.basename(j.name || "file", ext))}${safe(ext)}`].join("/");
    const back = await store.put(rel, buf);
    if (sha(back) !== srcHash || back.length !== buf.length) throw new Error("저장 후 확인 실패(내용이 달라요)");
    await ref.update({ status: "done", nasPath: rel, sha256: srcHash, bytes: buf.length, doneAt: Date.now(), error: admin.firestore.FieldValue.delete() });
    await markTask(j, "done", rel);
    log("저장 완료", rel, `${Math.round(buf.length / 1024)}KB`);
  } catch (e) {
    const n = (j.attempts || 0) + 1, fail = n >= MAX_TRY;
    await ref.update({ status: fail ? "failed" : "retry", attempts: n, error: String(e.message || e).slice(0, 300), nextAt: Date.now() + BACKOFF[Math.min(n - 1, BACKOFF.length - 1)] * 60e3 });
    if (fail) await markTask(j, "fail");
    log(fail ? "실패(관리자 확인 필요)" : `다시 시도 예정 ${BACKOFF[n - 1]}분 뒤`, j.taskId, j.name, "-", e.message);
    if (/1219|53|67|ENOENT|EACCES|EPERM|ENOTFOUND|ECONNREFUSED/.test(e.message)) smbReady = false;
  }
}
// 업무 문서의 제출 버전·파일에 NAS 상태 표시
async function markTask(j, st, rel){
  const tref = db.collection("portalTasks").doc(j.taskId);
  await db.runTransaction(async tx => { const s = await tx.get(tref); if (!s.exists) return; const t = s.data();
    const fix = f => f && f.path === j.storagePath ? { ...f, nas: st, ...(rel ? { nasPath: rel } : {}) } : f;
    tx.update(tref, { versions: (t.versions || []).map(v => ({ ...v, files: (v.files || []).map(fix) })), files: (t.files || []).map(fix) }); });
}

/* ── 상태 보고 + 반복 ── */
async function tick(){
  try {
    const snap = await db.collection("portalNasJobs").where("status", "in", ["wait", "retry"]).limit(50).get();
    // 처리 중에 멈춘 작업(임대 만료) 되살리기
    const stuck = await db.collection("portalNasJobs").where("status", "==", "copying").limit(20).get();
    for (const d of stuck.docs) if ((d.data().leaseUntil || 0) < Date.now()) await d.ref.update({ status: "retry", nextAt: Date.now() });
    for (const d of snap.docs) await handle(d);
    const [w, f] = await Promise.all([db.collection("portalNasJobs").where("status", "in", ["wait", "retry", "copying"]).count().get(), db.collection("portalNasJobs").where("status", "==", "failed").count().get()]);
    await db.collection("portalNasStatus").doc("connector").set({ lastSeen: Date.now(), version: VERSION, mode: cfg.mode, pending: w.data().count, failed: f.data().count, host: require("os").hostname() });
  } catch (e) { log("오류:", e.message); }
}

if (process.argv.includes("--test")) {
  store.test().then(ok => { log(ok ? "NAS 쓰기·읽기 시험 성공" : "NAS 시험 실패: 내용이 달라요"); process.exit(ok ? 0 : 1); })
    .catch(e => { log("NAS 시험 실패:", e.message); process.exit(1); });
} else {
  log(`커넥터 시작 v${VERSION} (${cfg.mode}), ${cfg.pollSeconds || 30}초마다 확인`);
  tick(); setInterval(tick, (cfg.pollSeconds || 30) * 1000);
}
