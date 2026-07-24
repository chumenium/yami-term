#!/bin/bash

# check-wiring.sh: UI配線の静的検査スクリプト
# 用途: renderer/index.html と renderer/*.js 間の配線漏れを検出

set -u

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RENDERER_DIR="${PROJECT_ROOT}/renderer"
HTML_FILE="${RENDERER_DIR}/index.html"

# 終了コード
EXIT_OK=0
EXIT_FAIL=1

# エラーハンドラ
errors=""
add_error() {
  if [ -z "$errors" ]; then
    errors="$1"
  else
    errors="${errors}"$'\n'"$1"
  fi
}

# === Check 1: HTML の全 id="..." を抽出し、各idが renderer/*.js に参照されているか ===
echo "[Check 1] HTML id参照チェック..."

# allowlist: 純粋な構造用id（JS参照不要）
declare -a ALLOWLIST=("drag-region" "suggest-layer")

# id を grep で抽出
ids=$(grep -oE 'id="[^"]*"' "$HTML_FILE" | sed 's/id="//; s/"//' | sort -u)

for id in $ids; do
  # allowlist に含まれていればスキップ
  if [[ " ${ALLOWLIST[@]} " =~ " ${id} " ]]; then
    echo "  ✓ $id (allowlist)"
    continue
  fi

  # renderer/*.js の中にこの id の文字列参照があるか
  if grep -r "'$id'\|\"$id\"\|getElementById.*$id" \
    "$RENDERER_DIR"/*.js >/dev/null 2>&1; then
    echo "  ✓ $id"
  else
    msg="FAIL: id='$id' が renderer/*.js のどのファイルにも参照されていません"
    echo "  ✗ $id"
    add_error "$msg"
  fi
done

# === Check 2: 必須配線の存在検査 ===
echo ""
echo "[Check 2] 必須配線検査..."

# new-tab-btn が tabs.js または renderer.js に存在
if grep -E "new-tab-btn" "$RENDERER_DIR"/{tabs,renderer}.js >/dev/null 2>&1; then
  echo "  ✓ 'new-tab-btn' found in tabs.js or renderer.js"
else
  msg="FAIL: 'new-tab-btn' が tabs.js/renderer.js に見つかりません"
  echo "  ✗ 'new-tab-btn'"
  add_error "$msg"
fi

# settings-btn が settings.js に存在
if grep -E "settings-btn" "$RENDERER_DIR"/settings.js >/dev/null 2>&1; then
  echo "  ✓ 'settings-btn' found in settings.js"
else
  msg="FAIL: 'settings-btn' が settings.js に見つかりません"
  echo "  ✗ 'settings-btn'"
  add_error "$msg"
fi

# addEventListener が new-tab-btn の近傍にある（grep -A3 で確認）
if grep -A 3 "getElementById('new-tab-btn')" "$RENDERER_DIR"/tabs.js | grep -q "addEventListener"; then
  echo "  ✓ addEventListener registered for new-tab-btn"
else
  msg="FAIL: new-tab-btn の近傍に addEventListener が見つかりません"
  echo "  ✗ addEventListener for new-tab-btn"
  add_error "$msg"
fi

# === Check 3: JSが参照するクラス名が CSS に定義されているか ===
echo ""
echo "[Check 3] CSS クラス定義チェック..."

CSS_FILE="${RENDERER_DIR}/style.css"

# 確認するクラス名
declare -a REQUIRED_CLASSES=(
  "suggest-ghost-inline"
  "suggest-popup"
  "suggest-popup-item"
  "selected"
  "suggest-icon"
)

for class_name in "${REQUIRED_CLASSES[@]}"; do
  # CSS ファイルにクラス定義があるか
  if grep -q "\.${class_name}" "$CSS_FILE"; then
    echo "  ✓ .${class_name}"
  else
    msg="FAIL: .${class_name} が style.css に定義されていません"
    echo "  ✗ .${class_name}"
    add_error "$msg"
  fi
done

# === Check 4: renderer.js が init 呼び出しをしているか ===
echo ""
echo "[Check 4] モジュール初期化呼び出しチェック..."

RENDERER_JS="${RENDERER_DIR}/renderer.js"

declare -a INIT_CALLS=(
  "YamiTabs.init"
  "YamiSuggest.init"
  "YamiSettings.init"
  "YamiShortcuts.init"
)

for init_call in "${INIT_CALLS[@]}"; do
  if grep -q "$init_call" "$RENDERER_JS"; then
    echo "  ✓ $init_call"
  else
    msg="FAIL: $init_call が renderer.js で呼ばれていません"
    echo "  ✗ $init_call"
    add_error "$msg"
  fi
done

# === Check 5: index.html の script 順序確認 ===
echo ""
echo "[Check 5] スクリプト読み込み順序チェック..."

# suggest-view-state.js が suggest.js より前に存在するか
suggest_view_state_line=$(grep -n 'src="suggest-view-state.js"' "$HTML_FILE" | cut -d: -f1 | tr -d ' ')
suggest_line=$(grep -n 'src="suggest.js"' "$HTML_FILE" | cut -d: -f1 | tr -d ' ')

if [ -n "$suggest_view_state_line" ] && [ -n "$suggest_line" ]; then
  if [ "$suggest_view_state_line" -lt "$suggest_line" ]; then
    echo "  ✓ suggest-view-state.js (line $suggest_view_state_line) < suggest.js (line $suggest_line)"
  else
    msg="FAIL: suggest-view-state.js が suggest.js より後ろにあります"
    echo "  ✗ suggest-view-state.js is after suggest.js"
    add_error "$msg"
  fi
elif [ -n "$suggest_view_state_line" ] || [ -n "$suggest_line" ]; then
  # 片方だけ存在する場合は警告
  if [ -n "$suggest_view_state_line" ]; then
    echo "  ⚠ suggest-view-state.js が存在しますが suggest.js が見つかりません"
  else
    echo "  ⚠ suggest.js が存在しますが suggest-view-state.js が見つかりません"
  fi
else
  echo "  ⚠ suggest-view-state.js と suggest.js の両方が見つかりません"
fi

# === 最終結果出力 ===
echo ""
echo "=================================================="
if [ -z "$errors" ]; then
  echo "✅ 全てのチェックに合格しました"
  exit $EXIT_OK
else
  echo "❌ 以下のエラーが見つかりました:"
  echo ""
  echo "$errors"
  echo ""
  exit $EXIT_FAIL
fi
