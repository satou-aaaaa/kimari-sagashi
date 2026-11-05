# AGENTS.md

きまり探し：並んだ数・ひらがな・曜日・時計・形のきまりを見つけて、「？」に入るものを4つから選ぶ1日5問のゲーム（高齢の人も遊べるように）。`index.html` と `gen.js`（問題の作り方）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 問題（19種類×2000問を別の数え方で解き直す）・今日の5問と上級（3年分）・通しで遊ぶ・続きから・とことん・あとから・文字の大きさ・言い方・スマホ幅・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- 高齢の人向け：文字は3段（`html.fs1〜3`、はじめは fs2＝21px。記録とは別の `kimari-fs`）・押すだけ（なぞる操作を入れない）・選び肢は高さ72px以上・時間制限なし・まちがえても選び直せる。一画面一問、文字は少なめ。
- 言い方：「認知症を予防できる」「脳が若返る」などと言い切らない（QA が見る）。「考える力を使う習慣づくりに」と書き、「このゲームについて」に医療機器ではないこと・WHO 2019 は頭の訓練を「勧めてもよい」程度・ACTIVE 試験（Willis 2006・Rebok 2014）の出典を置く。言い方の決まりは satou-aaaaa/otsukai-memo とそろえる。
- 問題は `gen.js` の `KINDS`（やさしい5・ふつう7・むずかしい7）が種から作る。1つの並びに答えは1つ：QA が数の並びを等差・等比・階差・交互、形をくり返しの長さで解き直し、どの決まりでも同じ答えになり、まちがいの選び肢がほかの決まりの答えにならないことを見る。種類を足したら QA の数（19・5,7,7）も直す。
- 今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）・上級（むずかしい3、今日のむずかしいと別）は日本時間の日付から作る種（`dailyTags`・`hardTags`）で決まり、だれでも同じ。`Math.random()` は練習・とことんの種だけ（QA が数を見る）。`KINDS` の作り方・並びを変えると過去の日の問題も変わる。変えた PR に一言書く。
- ★はまちがい＋ヒントの数（0で★3・1で★2・2以上で★1）。ヒントは1回目が「見るところ」（`look`、答えは言わない）、2回目がまちがいの選び肢を消して2つにしぼる。上級はヒントなし。正解したら必ず「きまり：」の説明（`why`）を出す。
- 今日の5問・上級は1日1回で、途中で閉じてもまちがえた印とヒントのまま続きから。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`）、答えを入れる前に保存した進み具合が画面と同じ問題か確かめる（`same`）。途中の保存（`keep`）は、別のタブで使ったヒント・まちがいを減らさない。記録は保存の前に読み直す。`load` は合わせる前に両方を `fresh()` で補う（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- とことん（`runs.e`）：やさしい5→ふつう10→むずかしい85問を毎回ちがう種で出す。まちがい・ヒント1回で🌸1つ（3つ）、🌸が無いときにまちがえると終わり、「ここでやめる」でも終わり、自己ベスト `ebest`。今日の記録・連続・Ko-fi・シェアには数えない（きまり帳には載る）。他の人との順位は出さない。
- 毎日「今日の見つけ方」（`TIPS` 7つ。ACTIVE 試験の推論の練習で教えた、並びのきまりの見つけ方の型）を1つ出す。
- 実績（`ACH` 13個）は記録から毎回数え、新しく残すのは知らせ終えた印 `ach` だけ。続けるは連続でなく合わせた日数（`playedDays`）。連続の日は1以上のときだけ出す（休んだ日を責めない）。取りこぼした日（きのう〜7日前、`EPOCH` より後）はカレンダーから「あとから」遊べる（`runs["a:日付"]`・記録は `adays`。連続・今日の記録・Ko-fi・シェアには数えない）。
- 色だけで分けない：形は形そのものでちがい（丸・三角・四角・ひし形・星）、色はカラーユニバーサルデザインの組。正解は「✓ 正解」、まちがいは「✕ ちがう」の文字も出す。シェアの印も 🟢🔶🔺 で形がちがう。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文に問題と答えを出さない。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`）を開くだけ。名前・メールは聞かない。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の5問・上級を初めて終えて全部まちがいなしのときだけ、結果の画面の下に1行。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 見やすさ：`</head>` の前の見やすさの設定（`<!-- a11y:begin -->`〜`end`）は shared-workflows `template/a11y/a11y.html` の写し、`qa/a11y.mjs` は `template/qa/a11y.mjs` の写しで、ここでは直さない。
- 引き継ぎ：`transfer.js` と `qa/transfer-check.mjs` は shared-workflows `template/` の写しで、ここでは直さない。`data-keys` は `kimari-v1,kimari-fs`（見やすさの a11y-v1 は全部のゲームで分け合うので入れない）。記録の形を変えたら QA の `sample` も合わせる。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。
- 機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何百〜何千回も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の問題を入れない）。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
