// きまり探しの検査。問題の作り方（19種類×2000問を別の数え方で解き直す・答えが1つ）・今日の5問と上級の組み方（3年分）・
// 通しで遊ぶ・まちがい・ヒント・続きから・上級・練習・とことん・きまり帳・実績・カレンダー・あとから・文字の大きさ・
// 言い方の決まり（予防を言い切らない）・スマホ幅・PWA・引き継ぎコード・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkTransfer } from "./transfer-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const G = createRequire(import.meta.url)(path.join(root, "gen.js"));

// ---- 1. 問題の作り方（ブラウザを使わない）----
// 並びを数にして、ゲームとは別に書いた単純な決まりの候補で解き直す。合う決まりが全部同じ答えを出し、まちがいの選び肢を出す決まりが無いこと
const KANA = G.KANA, WEEKN = 7;
const numOf = (tok) => { const [t, a, b] = tok.split(":"); return t === "n" ? +a : t === "k" ? KANA.indexOf(a) : t === "w" || t === "a" ? +a : t === "c" ? +a % 12 : NaN; };
const MODS = { n: 0, k: 0, w: 7, a: 360, c: 12 };
function predictions(xs, m) {
  const md = (v) => (m ? ((v % m) + m) % m : v), out = [], n = xs.length, d = (i) => (m ? md(xs[i + 1] - xs[i]) : xs[i + 1] - xs[i]);
  // 同じだけ進む
  if (xs.every((_, i) => i === 0 || d(i - 1) === d(0))) out.push(["等差", md(xs[n - 1] + d(0))]);
  if (!m) {
    // 同じ倍ずつ（整数倍）
    if (xs.every((v) => v > 0) && xs.every((v, i) => i === 0 || v === xs[i - 1] * (xs[1] / xs[0])) && Number.isInteger(xs[1] / xs[0])) out.push(["等比", xs[n - 1] * (xs[1] / xs[0])]);
    // ふえ方が同じだけふえる
    const df = xs.slice(1).map((v, i) => v - xs[i]);
    if (df.length >= 3 && df.every((v, i) => i === 0 || v - df[i - 1] === df[1] - df[0])) out.push(["階差", xs[n - 1] + df[df.length - 1] + (df[1] - df[0])]);
    // 1つおきの2つの並び（それぞれ3つ以上あるときだけ）
    const ev = xs.filter((_, i) => i % 2 === 0), od = xs.filter((_, i) => i % 2 === 1), nx = n % 2 === 0 ? ev : od;
    if (ev.length >= 3 && od.length >= 3 && [ev, od].every((s) => s.every((v, i) => i === 0 || v - s[i - 1] === s[1] - s[0]))) out.push(["交互", nx[nx.length - 1] + (nx[1] - nx[0])]);
  }
  return out;
}
// 形のくり返し：いちばん短いくり返し（2回以上見えているもの）で次を決める。数がふえるもの（mix）は形と数を分けて見る
function shapePred(items) {
  const sh = items.map((t) => t.split(":")[1]), ct = items.map((t) => +t.split(":")[2]), n = items.length;
  const per = (a) => { for (let p = 1; p <= Math.floor(a.length / 2); p++) if (a.every((v, i) => i < p || v === a[i - p])) return p; return 0; };
  const ps = per(sh); if (!ps) return null;
  const nextS = sh[n - ps];
  const cs = new Set(ct.slice(1).map((v, i) => v - ct[i]));
  if (cs.size !== 1) return null;
  return `s:${nextS}:${ct[n - 1] + [...cs][0]}`;
}
{
  const bad = {}, seen = {}, N = 2000;
  for (const k of G.KINDS) {
    for (let s = 0; s < N; s++) {
      const P = G.make(`${k.id}|qa${s}`), why = [];
      const t = P.ans.split(":")[0];
      if (P.opts.length !== 4 || new Set(P.opts).size !== 4 || !P.opts.includes(P.ans)) why.push("選び肢が4つちがう・答えを含む");
      if ([...P.items, ...P.opts].some((x) => /undefined|NaN|null/.test(x))) why.push("中身が空");
      if ([...P.items, ...P.opts].some((x) => x.split(":")[0] !== t)) why.push("種類がまざる");
      if (t === "n" && [...P.items, ...P.opts].some((x) => !(numOf(x) > 0) || numOf(x) > 999)) why.push("数が1〜999の外");
      if (t === "k" && [...P.items, ...P.opts].some((x) => numOf(x) < 0)) why.push("ひらがなが表の外");
      if (t === "s" && [...P.items, ...P.opts].some((x) => { const c = +x.split(":")[2]; return !(c >= 1 && c <= 7); })) why.push("形の数が1〜7の外");
      if (t === "s") {
        const pr = shapePred(P.items);
        if (pr !== P.ans) why.push(`形のくり返しで解き直すと ${pr}`);
      } else {
        const xs = P.items.map(numOf), pr = predictions(xs, MODS[t]), want = numOf(P.ans);
        if (!pr.length) why.push("どの決まりにも合わない");
        if (pr.some(([, v]) => v !== want)) why.push("決まりによって答えが変わる：" + pr.map((p) => p.join("=")).join(","));
        if (P.opts.some((o) => o !== P.ans && pr.some(([, v]) => v === numOf(o)))) why.push("まちがいの選び肢が、別の決まりの答えになる");
      }
      if (JSON.stringify(G.make(`${k.id}|qa${s}`)) !== JSON.stringify(P)) why.push("同じ種で同じ問題にならない");
      seen[k.id] = seen[k.id] || new Set(); seen[k.id].add(P.items.join(" ") + ">" + P.ans);
      if (why.length && !(bad[k.id] || []).length) bad[k.id] = [why.join("・") + "：" + P.items.join(" ") + " → " + P.ans + " / " + P.opts.join(" ")];
    }
  }
  check(`問題：${G.KINDS.length}種類×${N}問で、選び肢4つ・答えは別の数え方で解き直しても1つ・まちがいの選び肢は別の決まりの答えにならない`, Object.keys(bad).length === 0, JSON.stringify(bad));
  const few = G.KINDS.filter((k) => seen[k.id].size < 3).map((k) => `${k.id}:${seen[k.id].size}`);
  check("問題：どの種類も3通り以上（曜日は7通りまで）の並びが出る（同じ問題ばかりにならない）", few.length === 0, few.join(","));
  check("問題：種類は19（やさしい5・ふつう7・むずかしい7）", G.KINDS.length === 19 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "5,7,7");
  const longWhy = [], longLook = [];
  for (const k of G.KINDS) { const P = G.make(`${k.id}|len`); if ([...P.why].length > 70) longWhy.push(k.id); if ([...k.look].length > 45) longLook.push(k.id); }
  check("きまりの説明は70字以内・ヒントは45字以内（やさしい日本語。一文を短く）", !longWhy.length && !longLook.length, longWhy.concat(longLook).join(","));
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-05");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map((t) => t.split("|")[0]), hk = hl.map((t) => t.split("|")[0]);
    if (dl.length !== 5 || new Set(dk).size !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2") bad.push(d + " 今日");
    if (hl.length !== 3 || new Set(hk).size !== 3 || hk.some((k) => G.BY[k].lv !== 2) || hk.includes(dk[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if (dk.join() === prev) sameAsPrev++; prev = dk.join();
    if (i < 60) [...dk, ...hk].forEach((k) => cover.add(k));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）と上級（むずかしい3・今日のむずかしいと別）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに19種類が全部出る・前の日と同じ組の日が少ない", cover.size === 19 && sameAsPrev < 20, `${cover.size}種類・前の日と同じ ${sameAsPrev}日`);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "gen.js"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$|^https:\/\/(doi\.org|www\.who\.int)\//.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。gen.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04）", !/;\s*\/\/[^\n]*;\s*\w/.test(gen.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")));
check("言い方：「予防できる」「脳が若返る」などを言い切らない", !/予防でき|予防します|予防になる|防げます|若返|脳年齢|ボケ防止|治りま/.test(html + readFileSync(path.join(root, "README.md"), "utf8")));
check("言い方：「このゲームについて」に医療機器ではないこと・WHO の弱い勧め・相談先がある", /医療機器ではなく/.test(html) && /勧めてもよい/.test(html) && /かかりつけの医師/.test(html) && /doi\.org\/10\.1001\/jama\.296\.23\.2805/.test(html) && /doi\.org\/10\.1111\/jgs\.12607/.test(html));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキーだけで読む", /<script src="transfer\.js" data-game="kimari-sagashi" data-keys="kimari-v1,kimari-fs,a11y-v1"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="gen.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/kimari-sagashi/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(path.join(root, "README.md"), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js も）、外へ何も送らない", ["./index.html", "./gen.js", "./transfer.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "きまり探し" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
async function newPage(w = 390, ctx) {
  const c = ctx || await browser.newContext({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { if (await p.locator("#howto[open]").count()) await p.click("#howto-ok"); };
const ansIdx = (p) => p.evaluate(() => { const c = __km.cur(); return c.P.opts.indexOf(c.P.ans); });
const wrongIdx = (p) => p.evaluate(() => { const c = __km.cur(); return c.P.opts.findIndex((o) => o !== c.P.ans && !c.wrong.includes(o)); });
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("kimari-v1") || "{}"));
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.click(`.ch[data-j="${await ansIdx(p)}"]`);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#howto[open]").count() === 1);
  await p.click("#howto-ok");
  check("文字の大きさ：はじめは「大きい」（21px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "21px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "25px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日の見つけ方（コツ）が出る", (await p.textContent("#tip")).includes("今日の見つけ方"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __km.load().runs.d.list);
  check("今日の5問は日付から決まる（gen.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：並びと「？」と大きな選び肢4つ（高さ72px以上）", await p.locator(".seq .tile").count() >= 5 && await p.locator(".tile.ask").count() === 1 && (await p.$$eval(".ch", (b) => b.map((x) => x.getBoundingClientRect().height))).every((h) => h >= 72) && await p.locator(".ch").count() === 4);
  check("問題の並びには読み上げ用の名前がある", (await p.$$eval(".seq .tile", (t) => t.filter((x) => !x.getAttribute("aria-label")).length)) === 0);
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがえると ✕ の印と「ちがう」の文字（色だけで分けない）・知らせは role=status", await p.locator(".ch.ng").count() === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".ch.ng"), "::after").content)).includes("ちがう") && (await p.textContent("#msg")).includes("ちがいます") && await p.getAttribute("#msg", "role") === "status");
  // 開き直しても、まちがえた選び肢は残る
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがえた印のまま）", await p.locator(".ch.ng").count() === 1 && await p.evaluate(() => __km.cur().i) === 0);
  await solve(p);
  check("正解すると ✓ の印・きまりの説明・★2（まちがい1回）", await p.locator(".ch.ok").count() === 1 && (await p.textContent(".verdict .why")).length > 6 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  await p.click("#next");
  await p.click("#hint");
  check("ヒント1は見るところを言う（答えは言わない）", (await p.textContent("#hintbox")).includes("💡") && await p.locator(".ch.ng").count() === 0);
  await p.click("#hint");
  check("ヒント2はまちがいの選び肢を消し、2つにしぼる・ヒントは2回まで", await p.locator(".ch.ng").count() === 2 && await p.locator("#hint:disabled").count() === 1);
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]");
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !/\d+ずつ|曜|時|[あ-ん]{2}の段/.test(share.replace(/第\d+回|\d+\/\d+|まちがいなし|きまり探し/g, "")), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("きまり帳に解いた種類が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __km.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（きまり帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // きまり帳からそのきまりだけで練習
  await p.click("#back"); await p.click("#go-dex");
  const firstKind = await p.getAttribute(".book button", "data-k");
  await p.click(".book button");
  check("きまり帳の種類を押すと、そのきまりだけで練習", (await p.evaluate(() => __km.load().runs.p.list)).every((t) => t.startsWith(firstKind + "|")));
  // とことん：🌸3つ、4回目のまちがいで終わる
  await p.click("#back"); await p.click("#go-e");
  check("とことんは🌸3つから", await p.evaluate(() => __km.load().runs.e.life) === 3 && (await p.evaluate(() => __km.load().runs.e.list.length)) === 100);
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 2 }); await p.click("#next");
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  check("まちがいのたびに🌸がへる", await p.evaluate(() => __km.load().runs.e.life) === 0);
  check("🌸が無いとヒントは押せない", await p.locator("#hint:disabled").count() === 1);
  await p.click(`.ch[data-j="${await wrongIdx(p)}"]`);
  await p.waitForSelector(".verdict.lose", { timeout: 3000 }).catch(() => {});
  check("🌸が無いときにまちがえると「ここまで」（答えときまりを見せる）", await p.locator(".verdict.lose").count() === 1 && (await p.textContent(".verdict.lose")).includes("きまり"));
  // 「ここまで」のあとに開き直しても、続きからにならず結果へ進む（🌸0のまま続けて自己ベストを水増しさせない。2026-11-05 CodeRabbit）
  await p.reload(); await p.waitForTimeout(250);
  check("とことんの「ここまで」は開き直しても続きからにならない", await p.locator("#eres").count() === 1 && await p.locator(".ch").count() === 0);
  check("とことんの自己ベストが残る（3問）", (await mem(p)).ebest === 3 && (await p.textContent("#eres")).includes("3問"));
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない（2026-11-05 CodeRabbit）
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("kimari-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { add: '"><b id="xss2">' }; s.runs = { e: { mode: "e", id: "x", date: "2026-11-05", list: ["add|1"], res: [], life: '"><i id="xss3">' }, h: { list: "bad", res: [] } }; localStorage.setItem("kimari-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __km.load());
    check("記録の形を直す：数の所の文字は0に・形のちがう途中経過は捨てる", st.ebest === 0 && st.dex.add === 0 && st.runs.e.life === 0 && !("h" in st.runs));
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 3);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：言い切らない説明と出典", (await p.textContent("#about")).includes("医療機器ではなく") && await p.locator("#about a").count() >= 4);
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る
  {
    const q = await newPage();
    await q.evaluate(([d2, d3]) => { localStorage.setItem("kimari-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __km.lateDays(__km.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-05");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (dayBefore(3).slice(0, 7) === TODAY.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator(".ch").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __km.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await b.click(`.ch[data-j="${await ansIdx(b)}"]`);
    await b.waitForTimeout(200);
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    await ctx.close();
  }

  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => localStorage.setItem("kimari-fs", String(fs)), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab と Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const j = await ansIdx(q);
    await q.focus(`.ch[data-j="${j}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    check("キーボードだけで選んで答えられる", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "kimari-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-05": { m: [0, 1, 0, 0, 2], k: ["week", "add", "clock", "kana2", "alt"] } }, hdays: {}, adays: {}, dex: { week: 1, add: 1, clock: 1, kana2: 1, alt: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }), "kimari-fs": "3" };
  await checkTransfer({ browser, url, game: "kimari-sagashi", sample, check, open: async (pg) => { if (await pg.locator("#howto[open]").count()) await pg.click("#howto-ok"); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# きまり探し QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
