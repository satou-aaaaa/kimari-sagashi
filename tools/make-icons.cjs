// アプリのアイコン（icon-192.png・icon-512.png）を作る。生成りの方眼に、丸・三角・朱の「？」。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f5efe2"/>
      <rect x="12" y="30" width="22" height="22" rx="4" fill="#fff" stroke="#1f2a44" stroke-width="2"/><circle cx="23" cy="41" r="7" fill="#0072b2" stroke="#1f2a44" stroke-width="1.2"/>
      <rect x="39" y="30" width="22" height="22" rx="4" fill="#fff" stroke="#1f2a44" stroke-width="2"/><path d="M50 34 L57 48 L43 48 Z" fill="#d55e00" stroke="#1f2a44" stroke-width="1.2"/>
      <rect x="66" y="30" width="22" height="22" rx="4" fill="#fff6f2" stroke="#b8402a" stroke-width="2.4" stroke-dasharray="4 3"/>
      <text x="77" y="49" font-size="19" text-anchor="middle" fill="#b8402a" font-family="sans-serif" font-weight="900">?</text>
      <text x="50" y="80" font-size="15" text-anchor="middle" fill="#1f2a44" font-family="'Noto Sans CJK JP',sans-serif" font-weight="900">きまり</text></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
