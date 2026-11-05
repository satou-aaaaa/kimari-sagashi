// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題（答え）は入れず、遊び方の例（2・4・6・8・？）だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const tile = (t, ask) => `<div style="width:130px;height:130px;display:grid;place-items:center;border-radius:18px;background:${ask ? "#fff6f2" : "#fff"};border:${ask ? "6px dashed #b8402a" : "5px solid #1f2a44"};font-size:76px;font-weight:900;color:${ask ? "#b8402a" : "#1f2a44"}">${t}</div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:64px 80px;background:#f5efe2;background-image:linear-gradient(#dbe4ef 2px,transparent 2px),linear-gradient(90deg,#dbe4ef 2px,transparent 2px);background-size:40px 40px;color:#1f2a44">
    <div style="font-size:34px;color:#86291a;letter-spacing:.1em">大きな文字・押すだけ・時間制限なし</div>
    <div style="font-size:108px;font-weight:900;margin-top:10px;letter-spacing:.1em;color:#142a52">きまり<span style="color:#b8402a">探し</span></div>
    <div style="font-size:40px;margin-top:6px">並びのきまりを見つけて「？」を当てる</div>
    <div style="display:flex;gap:26px;margin-top:44px">${["2", "4", "6", "8"].map((t) => tile(t)).join("")}${tile("？", 1)}</div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
