// きまり探しの問題を作る（ブラウザと node の両方で使う）。
// 並び（items）のきまりを1つ決めて、次に来るもの（ans）と、きまりに合わない選び肢3つを作る。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ種なら、どの端末でも同じ問題になる。
// 並びの1つ1つは文字列で表す：
//   "n:12" 数　"k:あ" ひらがな　"w:0" 曜日（0=月〜6=日）　"s:形:数" 形（0丸 1三角 2四角 3ひし形 4星）と個数
//   "a:90" 矢印の向き（0=上、時計回りの度）　"c:3" 時計（3時）
(function (root) {
  "use strict";
  const KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ"; // や行・わ行は今の書き方（やゆよ・わ）で並べる
  const KANA_FULL = 35; // 「も」まで（や行より前）は、5字ずつの行がそろっている
  const WEEK = "月火水木金土日";
  const SHAPES = ["丸", "三角", "四角", "ひし形", "星"];
  const SHAPE_COLOR = ["青い", "朱色の", "緑の", "黄色い", "むらさきの"];
  const DAN = ["あ", "い", "う", "え", "お"];
  const LV = ["やさしい", "ふつう", "むずかしい"];

  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const shuffle = (R, arr) => pickN(R, arr, arr.length);
  const mod = (x, m) => ((x % m) + m) % m;
  const N = (v) => "n:" + v, K = (i) => "k:" + KANA[i], W = (i) => "w:" + mod(i, 7), S = (sh, n) => "s:" + sh + ":" + n, A = (d) => "a:" + mod(d, 360), C = (h) => "c:" + (mod(h - 1, 12) + 1);

  // まちがいの選び肢：答えと重ならず、同じものが2つ無いよう、候補の順に3つ取る（足りなければ予備から）
  function opts(R, ans, cands, spare) {
    const out = [];
    for (const c of [...cands, ...spare]) { if (c && c !== ans && !out.includes(c)) out.push(c); if (out.length === 3) break; }
    return shuffle(R, [ans, ...out]);
  }
  const numSpare = (ans) => [ans + 1, ans - 1, ans + 2, ans - 2, ans + 3, ans + 10].filter((v) => v > 0).map(N);

  // 種類：id・難しさ・帳に出す名前・見るところ（ヒント1）・作り方
  const KINDS = [
    // ---- やさしい ----
    { id: "add", lv: 0, name: "同じ数ずつふえる", look: "となりどうしで、いくつふえたかを見てみましょう。", make(R) {
      const d = ri(R, 1, 5), a = ri(R, 1, 9), it = [0, 1, 2, 3, 4].map((i) => a + i * d), ans = a + 5 * d;
      return { items: it.map(N), ans: N(ans), opts: opts(R, N(ans), [N(ans + 1), N(ans - 1), N(it[4]), N(ans + d)], numSpare(ans)), why: `${d}ずつふえています。` }; } },
    { id: "rep2", lv: 0, name: "2つのくり返し", look: "同じ形が出てくる所で、区切ってみましょう。", make(R) {
      const [a, b, c, d] = pickN(R, [0, 1, 2, 3, 4], 4), it = [a, b, a, b, a].map((x) => S(x, 1));
      return { items: it, ans: S(b, 1), opts: opts(R, S(b, 1), [S(a, 1), S(c, 1), S(d, 1)], []), why: `${SHAPES[a]}と${SHAPES[b]}が、かわりばんこに出ています。` }; } },
    { id: "dots", lv: 0, name: "1つずつふえる形", look: "形がいくつあるか、左から数えてみましょう。", make(R) {
      const sh = ri(R, 0, 4), c0 = ri(R, 1, 2), it = [0, 1, 2, 3].map((i) => S(sh, c0 + i)), ans = S(sh, c0 + 4), o = (sh + 1 + ri(R, 0, 3)) % 5;
      return { items: it, ans, opts: opts(R, ans, [S(sh, c0 + 3), S(sh, c0 + 5), S(o, c0 + 4)], [S(sh, c0 + 2)]), why: `${SHAPES[sh]}が1つずつふえています。` }; } },
    { id: "week", lv: 0, name: "曜日の順", look: "カレンダーの曜日の順を思い出してみましょう。", make(R) {
      const s = ri(R, 0, 6), it = [0, 1, 2, 3].map((i) => W(s + i)), ans = W(s + 4);
      return { items: it, ans, opts: opts(R, ans, [W(s + 5), W(s + 3), W(s + 6)], []), why: "月・火・水・木・金・土・日の順です。" }; } },
    { id: "kana", lv: 0, name: "五十音の順", look: "「あいうえお」の歌のように、声に出して読んでみましょう。", make(R) {
      const s = ri(R, 0, KANA.length - 6), it = [0, 1, 2, 3].map((i) => K(s + i)), ans = K(s + 4);
      return { items: it, ans, opts: opts(R, ans, [K(s + 5), K(s + 3), K(s + 6 < KANA.length ? s + 6 : s + 1)], [K(s + 2)]), why: "五十音の順に1字ずつ進んでいます。" }; } },
    // ---- ふつう ----
    { id: "sub", lv: 1, name: "同じ数ずつへる", look: "となりどうしで、いくつへったかを見てみましょう。", make(R) {
      const d = ri(R, 2, 9), ans = ri(R, 1, 12), a = ans + 5 * d, it = [0, 1, 2, 3, 4].map((i) => a - i * d);
      return { items: it.map(N), ans: N(ans), opts: opts(R, N(ans), [N(ans + 1), ans > 1 ? N(ans - 1) : null, N(it[4]), N(ans + 2 * d)], numSpare(ans)), why: `${d}ずつへっています。` }; } },
    { id: "rep3", lv: 1, name: "3つのくり返し", look: "はじめの3つが、そのあとどこでまた出てくるか探してみましょう。", make(R) {
      const [a, b, c, d] = pickN(R, [0, 1, 2, 3, 4], 4), p = [a, b, c], it = [0, 1, 2, 3, 4, 5, 6].map((i) => S(p[i % 3], 1)), ans = S(b, 1);
      return { items: it, ans, opts: opts(R, ans, [S(a, 1), S(c, 1), S(d, 1)], []), why: `${SHAPES[a]}・${SHAPES[b]}・${SHAPES[c]}の3つが、同じ順にくり返しています。` }; } },
    { id: "mul2", lv: 1, name: "2倍ずつ", look: "ふえ方がだんだん大きくなっています。前の数と比べてみましょう。", make(R) {
      const a = ri(R, 1, 9), it = [0, 1, 2, 3, 4].map((i) => a * 2 ** i), ans = a * 32;
      return { items: it.map(N), ans: N(ans), opts: opts(R, N(ans), [N(it[4] + (it[4] - it[3])), N(ans + 2), N(ans - 2), N(it[4] * 3)], numSpare(ans)), why: "前の数の2倍になっています。" }; } },
    { id: "kana2", lv: 1, name: "1字とばしの五十音", look: "読むとき、1字とばしになっていないか見てみましょう。", make(R) {
      const s = ri(R, 0, 24), it = [0, 1, 2, 3, 4].map((i) => K(s + 2 * i)), ans = K(s + 10);
      return { items: it, ans, opts: opts(R, ans, [K(s + 9), K(s + 11), K(s + 12)], [K(s + 8)]), why: "五十音の順に、1字とばしで進んでいます。" }; } },
    { id: "arrow", lv: 1, name: "4分の1回ずつ回る", look: "矢印の先が、どちらへ回っているか見てみましょう。", make(R) {
      const cw = R() < 0.5, st = cw ? 90 : -90, s = ri(R, 0, 3) * 90, it = [0, 1, 2, 3, 4].map((i) => A(s + st * i)), ans = A(s + st * 5);
      return { items: it, ans, opts: opts(R, ans, [A(s + st * 5 + 90), A(s + st * 5 + 180), A(s + st * 5 + 270)], []), why: `${cw ? "時計の針と同じ向き" : "時計の針と反対の向き"}に、4分の1回（90度）ずつ回っています。` }; } },
    { id: "clock", lv: 1, name: "同じ時間ずつ進む時計", look: "短い針が、何時から何時へ進んだか読んでみましょう。", make(R) {
      const st = ri(R, 2, 3), s = ri(R, 1, 12), it = [0, 1, 2, 3, 4].map((i) => C(s + st * i)), ans = C(s + st * 5);
      return { items: it, ans, opts: opts(R, ans, [C(s + st * 5 + 1), C(s + st * 5 - 1), C(s + st * 6)], [C(s + st * 5 + 6)]), why: `${st}時間ずつ進んでいます。` }; } },
    { id: "week2", lv: 1, name: "1日おきの曜日", look: "曜日を声に出して、とばした曜日が無いか見てみましょう。", make(R) {
      const s = ri(R, 0, 6), it = [0, 1, 2, 3, 4].map((i) => W(s + 2 * i)), ans = W(s + 10);
      return { items: it, ans, opts: opts(R, ans, [W(s + 9), W(s + 11), W(s + 12)], []), why: "曜日が1日おきに進んでいます（7日で1回り）。" }; } },
    // ---- むずかしい ----
    { id: "alt", lv: 2, name: "2つの並びが交互", look: "1つおきに指でたどってみましょう。並びが2つかくれています。", make(R) {
      const x0 = ri(R, 1, 9), dx = ri(R, 1, 4), y0 = x0 + ri(R, 6, 15), dy = ri(R, 1, 4), it = [x0, y0, x0 + dx, y0 + dy, x0 + 2 * dx, y0 + 2 * dy], ans = x0 + 3 * dx;
      return { items: it.map(N), ans: N(ans), opts: opts(R, N(ans), [N(y0 + 3 * dy), N(ans + 1), N(ans - 1), N(it[5] + 1)], numSpare(ans)), why: `1つおきに見ると、${x0}から${dx}ずつふえる並びと、${y0}から${dy}ずつふえる並びが交互に出ています。` }; } },
    { id: "grow", lv: 2, name: "ふえ方がふえる", look: "となりどうしの差を書き出して、その差どうしも比べてみましょう。", make(R) {
      const a = ri(R, 1, 9), d0 = ri(R, 1, 3), it = [a]; for (let i = 0; i < 4; i++) it.push(it[i] + d0 + i); const ans = it[4] + d0 + 4;
      return { items: it.map(N), ans: N(ans), opts: opts(R, N(ans), [N(it[4] + d0 + 3), N(ans + 1), N(ans - 2), N(ans + 2)], numSpare(ans)), why: `ふえ方が +${d0}、+${d0 + 1}、+${d0 + 2}、+${d0 + 3} と1つずつ大きくなっています。次は +${d0 + 4}。` }; } },
    { id: "rep4", lv: 2, name: "組のくり返し", look: "同じ形が2つ続く所に気をつけて、区切りを探してみましょう。", make(R) {
      const pats = ["AAB", "ABB", "AABB", "ABAC"], pat = pats[ri(R, 0, 3)], L = pat.length, r = ri(R, 1, L - 1), sh = pickN(R, [0, 1, 2, 3, 4], 4);
      const m = { A: sh[0], B: sh[1], C: sh[2] }, used = [...new Set(pat)].map((c) => m[c]), out = sh.filter((x) => !used.includes(x));
      const it = []; for (let i = 0; i < 2 * L + r; i++) it.push(S(m[pat[i % L]], 1)); const ans = S(m[pat[r]], 1);
      const name = [...pat].map((c) => SHAPES[m[c]]).join("・");
      return { items: it, ans, opts: opts(R, ans, [...used.map((x) => S(x, 1)), ...out.map((x) => S(x, 1))], []), why: `「${name}」の組がくり返しています。` }; } },
    { id: "mix", lv: 2, name: "形と数の2つのきまり", look: "まず形だけ、次に数だけを見てみましょう。", make(R) {
      const p = pickN(R, [0, 1, 2, 3, 4], 3), it = [0, 1, 2, 3, 4, 5].map((i) => S(p[i % 3], i + 1)), ans = S(p[0], 7);
      return { items: it, ans, opts: opts(R, ans, [S(p[0], 6), S(p[1], 7), S(p[2], 7), S(p[0], 5)], []), why: `形は${SHAPES[p[0]]}・${SHAPES[p[1]]}・${SHAPES[p[2]]}のくり返し、数は1つずつふえています。` }; } },
    { id: "arrow45", lv: 2, name: "少しずつ回る矢印", look: "矢印の先が、1回にどれだけ回っているか見てみましょう。", make(R) {
      const st = [45, -45, 135][ri(R, 0, 2)], s = ri(R, 0, 7) * 45, it = [0, 1, 2, 3, 4].map((i) => A(s + st * i)), ans = A(s + st * 5);
      return { items: it, ans, opts: opts(R, ans, [A(s + st * 5 + 45), A(s + st * 5 - 45), A(s + st * 5 + 180), A(s + st * 4)], []), why: `${st > 0 ? "時計の針と同じ向き" : "時計の針と反対の向き"}に、${Math.abs(st)}度ずつ回っています。` }; } },
    { id: "mul3", lv: 2, name: "3倍ずつ", look: "前の数の何倍になっているか、かけ算で考えてみましょう。", make(R) {
      const a = ri(R, 1, 9), it = [0, 1, 2, 3].map((i) => a * 3 ** i), ans = a * 81;
      return { items: it.map(N), ans: N(ans), opts: opts(R, N(ans), [N(it[3] + (it[3] - it[2])), N(it[3] * 2), N(ans + 3), N(ans - 3)], numSpare(ans)), why: "前の数の3倍になっています。" }; } },
    { id: "dan", lv: 2, name: "同じ段の字", look: "どの字も、同じ音で終わっていませんか。「あかさたな」を思い出してみましょう。", make(R) {
      const s = ri(R, 0, 4), it = [0, 1, 2, 3, 4].map((i) => K(s + 5 * i)), ans = K(s + 25);
      return { items: it, ans, opts: opts(R, ans, [K(s + 26 - 2 * (s === 4)), K(s + 24 + 2 * (s === 0)), K(s + 30)], [K(s + 20)]), why: `「${DAN[s]}」の段の字が、あ・か・さ・た・な…の行の順に並んでいます。` }; } },
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「種類|種」（例 "add|2026-11-05:0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind, ...rest] = String(tag).split("|"), k = BY[kind];
    if (!k) return null;
    const p = k.make(rng(seedOf(tag)));
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, ...p };
  }

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  // 並びの1つを、読み上げ用の言葉にする
  function sayOf(tok) {
    const [t, a, b] = tok.split(":");
    if (t === "n") return a; if (t === "k") return a; if (t === "w") return WEEK[+a] + "曜";
    if (t === "s") return `${SHAPE_COLOR[+a]}${SHAPES[+a]} ${b}つ`;
    if (t === "c") return a + "時";
    if (t === "a") return "矢印 " + ({ 0: "上", 45: "右上", 90: "右", 135: "右下", 180: "下", 225: "左下", 270: "左", 315: "左上" })[+a] + "向き";
    return tok;
  }

  const KIMARI = { KINDS, BY, LV, KANA, KANA_FULL, WEEK, SHAPES, kindsOf, seedOf, rng, make, dailyTags, hardTags, sayOf, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = KIMARI; else root.KIMARI = KIMARI;
})(typeof self !== "undefined" ? self : this);
