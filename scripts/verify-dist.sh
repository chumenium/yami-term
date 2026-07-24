#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJ_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJ_ROOT/dist"

# Helper: fail with error message
fail() {
  echo -e "${RED}✗ $1${NC}" >&2
  exit 1
}

# Helper: warn with message (no exit)
warn() {
  echo -e "${YELLOW}⚠ $1${NC}" >&2
}

# Helper: success message
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Check dist/ exists
if [[ ! -d "$DIST_DIR" ]]; then
  fail "dist/ directory not found. Run 'npm run dist:arm64' first."
fi

# 1. Check DMG exists and is > 10MB
echo "Checking DMG artifact..."
DMG_FILE=$(find "$DIST_DIR" -maxdepth 1 -name "yami-term-*-arm64.dmg" 2>/dev/null | head -1 || true)
if [[ -z "$DMG_FILE" ]]; then
  fail "No yami-term-*-arm64.dmg found in dist/"
fi
DMG_SIZE=$(stat -f%z "$DMG_FILE" 2>/dev/null || stat -c%s "$DMG_FILE" 2>/dev/null)
if (( DMG_SIZE < 10485760 )); then
  fail "DMG file is less than 10MB (size: $(( DMG_SIZE / 1024 / 1024 ))MB)"
fi
success "DMG exists and size is $(( DMG_SIZE / 1024 / 1024 ))MB"

# 2. Check ZIP exists (warn only, don't fail)
echo "Checking ZIP artifact..."
ZIP_FILE=$(find "$DIST_DIR" -maxdepth 1 -name "yami-term-*-arm64.zip" 2>/dev/null | head -1 || true)
if [[ -z "$ZIP_FILE" ]]; then
  # Try fallback pattern
  ZIP_FILE=$(find "$DIST_DIR" -maxdepth 1 -name "*.zip" 2>/dev/null | head -1 || true)
  if [[ -z "$ZIP_FILE" ]]; then
    warn "No ZIP file found in dist/"
  else
    success "ZIP file found: $(basename "$ZIP_FILE")"
  fi
else
  success "ZIP file found: $(basename "$ZIP_FILE")"
fi

# 3. Auto-detect .app directory
echo "Detecting .app directory..."
APP_DIR=""
if [[ -d "$DIST_DIR/mac-arm64/yami-term.app" ]]; then
  APP_DIR="$DIST_DIR/mac-arm64/yami-term.app"
elif [[ -d "$DIST_DIR/mac/yami-term.app" ]]; then
  APP_DIR="$DIST_DIR/mac/yami-term.app"
else
  fail "Cannot find yami-term.app in dist/mac-arm64 or dist/mac"
fi
success "App directory: $APP_DIR"

# 4. Validate Info.plist
echo "Validating Info.plist..."
PLIST="$APP_DIR/Contents/Info.plist"
if [[ ! -f "$PLIST" ]]; then
  fail "Info.plist not found at $PLIST"
fi

# Get CFBundleIdentifier
BUNDLE_ID=""
if command -v plutil &>/dev/null; then
  BUNDLE_ID=$(plutil -extract CFBundleIdentifier raw "$PLIST" 2>/dev/null || true)
elif command -v /usr/libexec/PlistBuddy &>/dev/null; then
  BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print CFBundleIdentifier" "$PLIST" 2>/dev/null || true)
else
  fail "Neither plutil nor PlistBuddy found"
fi

if [[ "$BUNDLE_ID" != "com.chumenium.yamiterm" ]]; then
  fail "CFBundleIdentifier is '$BUNDLE_ID', expected 'com.chumenium.yamiterm'"
fi
success "CFBundleIdentifier is correct"

# Get version from package.json
PKG_VERSION=$(node -p "require('$PROJ_ROOT/package.json').version" 2>/dev/null || echo "")
if [[ -z "$PKG_VERSION" ]]; then
  fail "Cannot read version from package.json"
fi

# Get CFBundleShortVersionString from plist
BUNDLE_VERSION=""
if command -v plutil &>/dev/null; then
  BUNDLE_VERSION=$(plutil -extract CFBundleShortVersionString raw "$PLIST" 2>/dev/null || true)
elif command -v /usr/libexec/PlistBuddy &>/dev/null; then
  BUNDLE_VERSION=$(/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "$PLIST" 2>/dev/null || true)
fi

if [[ "$BUNDLE_VERSION" != "$PKG_VERSION" ]]; then
  fail "CFBundleShortVersionString is '$BUNDLE_VERSION', expected '$PKG_VERSION'"
fi
success "CFBundleShortVersionString matches package.json ($PKG_VERSION)"

# 5. Validate asarUnpack
echo "Validating asarUnpack..."
ASAR_UNPACK_DIR="$APP_DIR/Contents/Resources/app.asar.unpacked/node_modules/node-pty"
if [[ ! -d "$ASAR_UNPACK_DIR" ]]; then
  fail "asarUnpack node-pty directory not found at $ASAR_UNPACK_DIR"
fi
success "asarUnpack node-pty directory exists"

# 6. Check spawn-helper executable permission
echo "Checking spawn-helper executable permission..."
SPAWN_HELPER=$(find "$ASAR_UNPACK_DIR" -name "spawn-helper" 2>/dev/null | head -1 || true)
if [[ -z "$SPAWN_HELPER" ]]; then
  warn "spawn-helper not found in $ASAR_UNPACK_DIR"
elif [[ ! -x "$SPAWN_HELPER" ]]; then
  fail "spawn-helper exists but is not executable: $SPAWN_HELPER"
else
  success "spawn-helper has executable permission"
fi

# 7. Verify code signature
echo "Verifying code signature..."
if ! codesign -dv "$APP_DIR" &>/dev/null; then
  fail "Code signature verification failed for $APP_DIR"
fi
success "Code signature is valid"

# 8. Smoke test
echo "Running smoke test..."
SMOKE_OUTPUT=$(YAMI_TERM_SMOKE=1 "$APP_DIR/Contents/MacOS/yami-term" 2>&1 || true)
if [[ "$SMOKE_OUTPUT" == *"SMOKE_OK"* ]]; then
  success "Smoke test passed"
else
  fail "Smoke test failed: SMOKE_OK not found in output. Got: $SMOKE_OUTPUT"
fi

echo ""
echo -e "${GREEN}✅ ALL OK${NC}"
