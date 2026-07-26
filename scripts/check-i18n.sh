#!/bin/bash
# i18n整合チェックスクリプト
# renderer/i18n.js と renderer/settings.js の整合を静的チェック

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
I18N_FILE="$PROJECT_ROOT/renderer/i18n.js"
SETTINGS_FILE="$PROJECT_ROOT/renderer/settings.js"

echo "=== i18n整合チェック開始 ==="
echo ""

# チェック1: i18n.jsが存在し、window.YamiI18nを含むことを確認
echo "✓ チェック1: i18n.jsの存在確認"
if [ ! -f "$I18N_FILE" ]; then
  echo "  ✗ FAIL: $I18N_FILE が見つかりません"
  exit 1
fi

if ! grep -q "window.YamiI18n" "$I18N_FILE"; then
  echo "  ✗ FAIL: $I18N_FILE に window.YamiI18n の定義がありません"
  exit 1
fi
echo "  ✓ PASS: i18n.js存在・window.YamiI18n定義あり"
echo ""

# チェック2: dict内の全ロケールのキー一覧がdict.enと完全に一致することを確認
# (対応言語数が増減してもキー数固定の"2回出現"前提が崩れないよう、実際にrequireして検証する)
echo "✓ チェック2: i18n.jsキー整合チェック"
if ! node "$SCRIPT_DIR/check-i18n-keys.js" "$I18N_FILE"; then
  echo "  ✗ FAIL: 全ロケール間でキーが一致しません"
  exit 1
fi
echo "  ✓ PASS: 全ロケールのキーが dict.en と完全に一致"
echo ""

# チェック3: renderer/settings.js が labelKey を使っていることを確認
echo "✓ チェック3: settings.jsの labelKey使用確認"
if ! grep -q "labelKey" "$SETTINGS_FILE"; then
  echo "  ✗ FAIL: $SETTINGS_FILE に labelKey の使用がありません"
  exit 1
fi
echo "  ✓ PASS: settings.js で labelKey を使用"
echo ""

# チェック4: settings.js内で参照されているi18nキーがi18n.jsで定義されていることを確認
echo "✓ チェック4: settings.jsの参照キー定義確認"
REFERENCED_KEYS=$(grep -oE "'settings\.[a-zA-Z.]+'" "$SETTINGS_FILE" | sort -u)
MISSING_KEYS=0

while IFS= read -r key; do
  if ! grep -q "$key" "$I18N_FILE"; then
    if [ "$MISSING_KEYS" -eq 0 ]; then
      echo "  ✗ i18n.jsで定義されていないキーを検出:"
    fi
    echo "    - $key"
    MISSING_KEYS=1
  fi
done < <(echo "$REFERENCED_KEYS")

if [ "$MISSING_KEYS" -eq 1 ]; then
  echo "  ✗ FAIL: settings.jsで参照されているキーがi18n.jsで定義されていません"
  exit 1
fi
echo "  ✓ PASS: settings.jsで参照されているキーが全て定義されています"
echo ""

echo "=== 全チェック完了: PASS ==="
exit 0
