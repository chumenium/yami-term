#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_ROOT/assets"

mkdir -p "$ASSETS_DIR"

# Step 1: Generate SVG icon
cat > "$ASSETS_DIR/icon.svg" << 'SVG_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d0d12;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1626;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff79c6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#bd93f9;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background with rounded corners -->
  <rect x="32" y="32" width="960" height="960" rx="180" ry="180" fill="url(#bgGradient)"/>

  <!-- Border with gradient stroke -->
  <rect x="32" y="32" width="960" height="960" rx="180" ry="180" fill="none" stroke="url(#strokeGradient)" stroke-width="2" filter="url(#glow)"/>

  <!-- Terminal prompt text: ❯_ -->
  <text x="512" y="600" font-family="'Monaco', 'Menlo', 'Courier New', monospace" font-size="340" font-weight="bold" fill="#ff79c6" text-anchor="middle" dominant-baseline="middle" filter="url(#glow)">❯</text>

  <!-- Cursor (underscore replacement) -->
  <rect x="535" y="560" width="35" height="60" fill="#bd93f9" filter="url(#glow)"/>
</svg>
SVG_EOF

echo "✓ Generated $ASSETS_DIR/icon.svg"

# Step 2: Convert SVG to PNG using qlmanage
if ! qlmanage -t -s 1024 -o "$ASSETS_DIR/" "$ASSETS_DIR/icon.svg" 2>/dev/null; then
    echo "✗ Failed to convert SVG to PNG using qlmanage"
    exit 1
fi

# Check if PNG was created and has reasonable size
PNG_FILE="$ASSETS_DIR/icon.svg.png"
if [ ! -f "$PNG_FILE" ]; then
    echo "✗ PNG file not created"
    exit 1
fi

PNG_SIZE=$(stat -f%z "$PNG_FILE" 2>/dev/null || stat -c%s "$PNG_FILE" 2>/dev/null || echo 0)
if [ "$PNG_SIZE" -lt 10240 ]; then
    echo "✗ PNG file too small ($PNG_SIZE bytes) - rendering may have failed"
    exit 1
fi

echo "✓ Generated $PNG_FILE ($(numfmt --to=iec $PNG_SIZE 2>/dev/null || echo "$PNG_SIZE bytes"))"

# Step 3: Create iconset directory
ICONSET_DIR="$ASSETS_DIR/icon.iconset"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Step 4: Generate PNG files for each size
# Using sips to convert PNG to PNG at different scales
declare -a SIZES=(16 32 128 256 512)
declare -a SCALES=(1 2)

for size in "${SIZES[@]}"; do
    for scale in "${SCALES[@]}"; do
        output_size=$((size * scale))
        output_file="$ICONSET_DIR/icon_${size}x${size}"
        if [ $scale -eq 2 ]; then
            output_file="${output_file}@2x"
        fi
        output_file="${output_file}.png"

        sips -z "$output_size" "$output_size" "$PNG_FILE" --out "$output_file" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✓ Generated $(basename "$output_file")"
        else
            echo "✗ Failed to generate $(basename "$output_file")"
            exit 1
        fi
    done
done

# Step 5: Create icns file
ICNS_FILE="$ASSETS_DIR/icon.icns"
rm -f "$ICNS_FILE"

if ! iconutil -c icns "$ICONSET_DIR" -o "$ICNS_FILE" 2>/dev/null; then
    echo "✗ Failed to create icns file"
    exit 1
fi

# Step 6: Validate icns
if [ ! -f "$ICNS_FILE" ]; then
    echo "✗ icns file not created"
    exit 1
fi

ICNS_SIZE=$(stat -f%z "$ICNS_FILE" 2>/dev/null || stat -c%s "$ICNS_FILE" 2>/dev/null || echo 0)
if [ "$ICNS_SIZE" -eq 0 ]; then
    echo "✗ icns file is empty"
    exit 1
fi

FILE_TYPE=$(file "$ICNS_FILE" 2>/dev/null | grep -i "mac os" || echo "")
if [ -z "$FILE_TYPE" ]; then
    echo "⚠ Warning: file command doesn't show 'Mac OS X icon' format"
fi

echo "✓ Generated $ICNS_FILE ($(numfmt --to=iec $ICNS_SIZE 2>/dev/null || echo "$ICNS_SIZE bytes"))"
echo "✓ Icon generation complete!"
