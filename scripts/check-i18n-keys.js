// check-i18n.sh のチェック2で使う補助スクリプト。
// renderer/i18n.js を実際にrequireし、全ロケールのキー集合がdict.enと一致するか検証する。
// 対応言語数に依存しない(グリフ数の"2回出現"前提だった旧実装の代替)。

const path = require('path');

const i18nFile = process.argv[2];
if (!i18nFile) {
  console.error('  ✗ FAIL: i18n.js のパスが指定されていません');
  process.exit(1);
}

const i18n = require(path.resolve(i18nFile));

if (!i18n || !i18n.dict || !i18n.dict.en) {
  console.error('  ✗ FAIL: dict.en が見つかりません');
  process.exit(1);
}

const enKeys = Object.keys(i18n.dict.en).sort();
let ok = true;

for (const locale of Object.keys(i18n.dict)) {
  const keys = Object.keys(i18n.dict[locale]).sort();
  if (JSON.stringify(keys) !== JSON.stringify(enKeys)) {
    const missing = enKeys.filter(k => !keys.includes(k));
    const extra = keys.filter(k => !enKeys.includes(k));
    console.error(`  ✗ dict.${locale} のキー集合が dict.en と一致しません`);
    if (missing.length) console.error(`    不足: ${missing.join(', ')}`);
    if (extra.length) console.error(`    余分: ${extra.join(', ')}`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log(`  ✓ ${Object.keys(i18n.dict).length}ロケール全てでキー集合が一致`);
process.exit(0);
