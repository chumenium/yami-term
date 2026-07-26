🇬🇧 English | [🇯🇵 日本語](README.ja.md)

# yami-term 🖤✨

An AI-focused terminal emulator for macOS / Windows. Liquid Glass UI, a dark theme, a one-click launcher for tools like Claude Code, and a menu bar indicator for when your AI CLI is waiting on you.

<!-- TODO: screenshot -->

## ✨ Features

- **Liquid Glass UI** — a modern dark theme (macOS gets true vibrancy/glass blur; Windows renders with the standard window frame)
- **Multi-tab** — manage multiple shell sessions as tabs, reorderable via drag-and-drop
- **Tool launcher + command palette** 🚀 — launch Claude Code with one click, or add your own custom commands from Settings. `Cmd/Ctrl+Shift+K` opens a searchable command palette for anything you've registered
- **Menu bar approval-wait indicator** 🔔 — the tray icon changes when a running AI tool (e.g. Claude Code) is waiting for your approval in any tab; click it to jump straight there
- **GUI settings modal** — `Cmd/Ctrl+,` opens the settings panel, organized into categories (font, appearance, terminal, language, etc.), auto-saved to `~/.yami-term.json`
- **Command completion v2** — suggests from your shell history and `$PATH`, with inline ghost text and a mini dropdown list
- **Scrollback search** — `Cmd/Ctrl+Shift+F` to search terminal output
- **14 languages** — English and Japanese plus Simplified/Traditional Chinese, Korean, Spanish, French, German, Portuguese, Russian, Italian, Indonesian, Vietnamese, and Hindi

## 📦 Installation

### macOS (Apple Silicon / Intel)

1. Download from the [Releases page](https://github.com/chumenium/yami-term/releases):
   - **Apple Silicon**: `yami-term-<version>-arm64.dmg`
   - **Intel Mac**: `yami-term-<version>-x64.dmg`
2. Open the DMG and drag **yami-term.app** into your Applications folder
3. If you see an "unidentified developer" error on first launch:
   - Right-click the app → **Open**
   - If that doesn't work, run in Terminal:
     ```bash
     xattr -cr /Applications/yami-term.app
     ```

> **Note:** yami-term isn't signed or notarized through Apple's Developer Program. It's ad-hoc signed instead, which means macOS Gatekeeper will show a security warning the first time you open it (see [Troubleshooting](#-troubleshooting) below).

### Windows

1. Download from the [Releases page](https://github.com/chumenium/yami-term/releases):
   - **Installer**: `yami-term-Setup-<version>-x64.exe`
   - **Portable** (no install needed): `yami-term-<version>-x64-portable.exe`
2. If Windows SmartScreen says "Windows protected your PC":
   - Click **More info**
   - Click **Run anyway**

> **Note:** yami-term doesn't have a code-signing certificate yet, so Windows SmartScreen flags it as coming from an unknown publisher. The source is fully public — check it out before running if you'd like.

## ⌨️ Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| New tab | `Cmd+T` | `Ctrl+Shift+T` |
| Close current tab | `Cmd+W` | `Ctrl+Shift+W` |
| Switch to tab N | `Cmd+1-9` | `Ctrl+1-9` |
| Next tab | `Cmd+Shift+]` | `Ctrl+Shift+]` |
| Previous tab | `Cmd+Shift+[` | `Ctrl+Shift+[` |
| Open settings | `Cmd+,` | `Ctrl+,` |
| Open command palette | `Cmd+K` | `Ctrl+Shift+K` |
| Search scrollback | `Cmd+F` | `Ctrl+Shift+F` |
| Zoom font in/out | `Cmd+=` / `Cmd+-` | `Ctrl+=` / `Ctrl+-` |
| Reset font size | `Cmd+0` | `Ctrl+0` |

> On Windows/Linux, plain `Ctrl+T`/`Ctrl+W`/`Ctrl+K` etc. are already bound by the shell's own readline (word delete, kill-to-end-of-line, and so on), so these shortcuts require an extra Shift there — the same layout Windows Terminal uses.

## ⚙️ Settings

### Via the GUI

`Cmd/Ctrl+,` opens the settings window, grouped by category:

- **General** — language, shell
- **Appearance** — theme, accent color, glass opacity, bloom effect
- **Font** — font size/family, letter spacing, line height
- **Terminal** — cursor blink, scrollback lines, command suggestions

There are also sections for **managing launchers** (add/remove commands) and **approval detection** (enable/disable/add patterns).

Changes apply live and are saved to `~/.yami-term.json` automatically (the language setting is the one exception — it takes effect on next launch).

### Config file (`~/.yami-term.json`)

Example of the main keys:

```json
{
  "fontSize": 14,
  "fontFamily": "Menlo",
  "cursorBlink": true,
  "opacity": 0.8,
  "accent": "#ff79c6",
  "shell": "/bin/zsh",
  "suggest": true,
  "theme": "yamikawa",
  "language": "auto"
}
```

| Key | Description | Default |
|-----|-------------|---------|
| `fontSize` | Font size (pt) | 14 |
| `fontFamily` | Font name | Menlo |
| `cursorBlink` | Cursor blink | true |
| `opacity` | Window opacity (0-1) | 0.8 |
| `accent` | Accent color (hex) | #ff79c6 |
| `shell` | Default shell | OS-dependent |
| `suggest` | Command suggestions | true |
| `theme` | Color theme | yamikawa |
| `letterSpacing` | Letter spacing | 0 |
| `lineHeight` | Line height | 1.0 |
| `scrollback` | Scrollback lines | 1000 |
| `bloomEnabled` | Bloom (glow) effect | false |
| `bloomIntensity` | Bloom intensity | 4 |
| `language` | UI language (`auto` detects it) | auto |
| `launchers` | Registered tool launchers | Claude Code (+ Finder on macOS) |
| `approvalPatterns` | Approval-wait detection patterns | Claude Code + a generic y/n one |

## 💡 Using command completion

yami-term suggests commands from two sources:

1. **Shell history** — commands you've actually run (auto-picks zsh or bash history based on your configured shell)
2. **PATH commands** — executables available on your `$PATH`

### Controls

| Key | Action |
|-----|--------|
| **Tab** / **→** | Accept the top suggestion (or ghost text) |
| **↑** / **↓** | Move the selection in the mini list |
| **Esc** | Close the suggestion UI, reset |
| **Mouse click / hover** | Accept / preview a candidate |

> **Note:** Suggestions are suppressed while IME composition (e.g. Japanese input) is active, and resume once you commit the text.

Turn completion off entirely by setting `"suggest": false` in `~/.yami-term.json`.

## 🛠 Building from source

### Requirements

- Node.js 20+
- npm (bundled with Node.js)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio Build Tools (needed to compile node-pty's native module)

### Build

```bash
# Clone the repo
git clone https://github.com/chumenium/yami-term.git
cd yami-term

# Install dependencies
npm install

# Run in dev mode
npm start

# Build a distributable package (output goes to dist/)
npm run dist        # macOS (host arch)
npm run dist:arm64   # macOS (Apple Silicon)
npm run dist:win     # Windows
```

## 🔧 Troubleshooting

### macOS: "yami-term is damaged and can't be opened" / "can't verify the developer"

macOS Gatekeeper can flag the app on first launch. Two ways to fix it:

**Option 1: Open from Finder**

1. Open **Finder** and go to your Applications folder
2. **Right-click** (or Control-click) **yami-term.app**
3. Choose **Open** from the menu
4. Click **Open** again in the confirmation dialog

**Option 2: Clear the quarantine attribute from Terminal**

```bash
xattr -cr /Applications/yami-term.app
```

**Why does this happen?** yami-term isn't signed or notarized through Apple's Developer Program. It's ad-hoc signed instead, which is enough to avoid the harshest "damaged" error, but Gatekeeper still treats it as an unidentified developer on first run.

### Windows: SmartScreen says "Windows protected your PC"

yami-term doesn't have a (paid) code-signing certificate yet, so it shows up as an unrecognized publisher. Click **More info → Run anyway** to launch it.

## 📝 Known limitations

- **Unsigned** — ad-hoc signed with no notarization on macOS, and no code-signing certificate on Windows; both platforms will show a security warning on first run
- **No true "glass" look on Windows** — the vibrancy/blur effect relies on a macOS-only API, so Windows renders with a standard window frame instead (purely cosmetic, nothing is functionally broken)
- **No Finder-equivalent launcher on Windows** — the built-in "reveal active tab's directory" launcher depends on a macOS-only command (`lsof`) to resolve a shell's working directory, so it isn't offered on Windows/Linux for now
- **No RTL language support** — Arabic, Hebrew, etc. would need real text-direction/layout work beyond just translated strings, so they're out of scope for now
- **Linux is untested** — not built or verified on Linux

## 📄 License

MIT License &copy; 2026 chumenium

See the [LICENSE](./LICENSE) file for details.
