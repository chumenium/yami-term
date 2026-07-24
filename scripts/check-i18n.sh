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

# チェック2: dict.ja と dict.en のキー一覧が完全に一致することを確認
echo "✓ チェック2: i18n.jsキー整合チェック"
EN_KEYS=$(grep -oE "'settings\.[a-zA-Z.]+'" "$I18N_FILE" | sort -u | sed -n '/dict\.en/,/^}/p' | grep -oE "'settings\.[a-zA-Z.]+'" | sort -u || true)
JA_KEYS=$(grep -oE "'settings\.[a-zA-Z.]+'" "$I18N_FILE" | sort -u | sed -n '/dict\.ja/,/^}/p' | grep -oE "'settings\.[a-zA-Z.]+'" | sort -u || true)

# より簡単なチェック：全体のユニークキーを抽出
TOTAL_KEYS=$(grep -oE "'settings\.[a-zA-Z.]+'" "$I18N_FILE" | sort | uniq -c | awk '{print $1}')
EN_COUNT=$(echo "$TOTAL_KEYS" | head -1 | tr -d ' ')

# キーの重複チェック（2ずつ出現すればOK）
KEY_MISMATCH=0
while IFS= read -r key; do
  COUNT=$(grep -c "$key" "$I18N_FILE" || echo 0)
  if [ "$COUNT" -ne 2 ]; then
    if [ "$KEY_MISMATCH" -eq 0 ]; then
      echo "  ✗ キーペアの不一致を検出:"
    fi
    echo "    - $key (出現回数: $COUNT 回、期待: 2回)"
    KEY_MISMATCH=1
  fi
done < <(grep -oE "'settings\.[a-zA-Z.]+'" "$I18N_FILE" | sort -u)

if [ "$KEY_MISMATCH" -eq 1 ]; then
  echo "  ✗ FAIL: en/ja間でキーが一致しません"
  exit 1
fi
echo "  ✓ PASS: dict.en と dict.ja のキーが完全に一致"
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
