🇯🇵 日本語 | [🇬🇧 English](README.md)

# yami-term 🖤✨

AI特化型のターミナルエミュレータ(macOS / Windows)。Liquid Glass UIとダークテーマ、Claude Codeなどのツールがすぐ使えるランチャー、メニューバー承認待ち通知で、ターミナルをもっと快適に。

<!-- TODO: screenshot -->

## ✨ 特徴

- **Liquid Glass UI** — ダークテーマでモダンな雰囲気を実現(macOSではvibrancyによるガラス表現、Windowsは標準ウィンドウ枠で動作)
- **マルチタブ** — 複数のシェルセッションをタブで管理。ドラッグ&ドロップで並べ替え可能
- **ツールランチャー+コマンドパレット** 🚀 — Claude Codeをワンクリック起動、設定でカスタムコマンドを自由に追加。`Cmd/Ctrl+Shift+K`で検索して起動できるコマンドパレットも搭載
- **メニューバー承認待ちインジケーター** 🔔 — Claude Codeなど実行中のAIツールが承認待ちになったらメニューバーのアイコンが変化。クリックで該当タブへ即ジャンプ
- **GUI設定モーダル** — `Cmd/Ctrl+,` で設定パネルを開く。フォント・透明度・アクセント色・テーマ・言語などをカテゴリ別に整理して調整可能。設定は `~/.yami-term.json` に自動保存
- **コマンド補完 v2** — シェル履歴とPATH内のコマンドから候補を自動抽出。カーソル直後のインラインゴーストとミニリストで入力をアシスト
- **スクロールバック内検索** — `Cmd/Ctrl+Shift+F` でターミナル出力を検索
- **14言語対応** — 日本語・英語に加え中国語(簡体/繁体)・韓国語・スペイン語・フランス語・ドイツ語・ポルトガル語・ロシア語・イタリア語・インドネシア語・ベトナム語・ヒンディー語

## 📦 インストール

### macOS (Apple Silicon / Intel)

1. [Releases ページ](https://github.com/chumenium/yami-term/releases) から以下のいずれかをダウンロード:
   - **Apple Silicon**: `yami-term-<version>-arm64.dmg`
   - **Intel Mac**: `yami-term-<version>-x64.dmg`
2. DMG ファイルを開いて、**yami-term.app** を Applications フォルダにドラッグ
3. 初回起動時、"未認識の開発元" エラーが表示される場合:
   - アプリを右クリック → **開く**
   - それでもダメなら、ターミナルで以下を実行:
     ```bash
     xattr -cr /Applications/yami-term.app
     ```

> **注:** yami-term は Apple の Developer Program での正式な署名・公証を行っていません。代わりに ad-hoc 署名を施しており、macOS Gatekeeper のセキュリティ警告を回避する対応が可能です(詳細は [トラブルシューティング](#-トラブルシューティング) を参照)。

### Windows

1. [Releases ページ](https://github.com/chumenium/yami-term/releases) から以下のいずれかをダウンロード:
   - **インストーラー版**: `yami-term-Setup-<version>-x64.exe`
   - **ポータブル版**(インストール不要): `yami-term-<version>-x64-portable.exe`
2. 初回起動時に SmartScreen が「WindowsによってPCが保護されました」と表示する場合:
   - **詳細情報** をクリック
   - **実行** をクリック

> **注:** yami-term は正式なコード署名証明書を取得していないため、Windows SmartScreen が未知の発行元として警告を表示します。ソースコードは公開されているため、内容を確認した上でご利用ください。

## ⌨️ ショートカット一覧

| 機能 | macOS | Windows |
|------|-------|---------|
| 新規タブ | `Cmd+T` | `Ctrl+Shift+T` |
| 現在のタブを閉じる | `Cmd+W` | `Ctrl+Shift+W` |
| 指定タブへ切り替え | `Cmd+1〜9` | `Ctrl+1〜9` |
| 次のタブへ | `Cmd+Shift+]` | `Ctrl+Shift+]` |
| 前のタブへ | `Cmd+Shift+[` | `Ctrl+Shift+[` |
| 設定パネルを開く | `Cmd+,` | `Ctrl+,` |
| コマンドパレットを開く | `Cmd+K` | `Ctrl+Shift+K` |
| スクロールバック内検索 | `Cmd+F` | `Ctrl+Shift+F` |
| フォントズームイン/アウト | `Cmd+=` / `Cmd+-` | `Ctrl+=` / `Ctrl+-` |
| フォントサイズをリセット | `Cmd+0` | `Ctrl+0` |

> Windows/LinuxではCtrl+T・Ctrl+W・Ctrl+Kなどの単発Ctrlキーがシェル(readline)自体の操作(単語削除・行末削除等)と衝突するため、Shiftを追加した組み合わせにしています(Windows Terminal等と同じ配列)。

## ⚙️ 設定

### GUI で設定

`Cmd/Ctrl+,` を押すと設定ウィンドウが開きます。項目はカテゴリ別に整理されています:

- **一般** — 言語、シェル
- **外観** — テーマ、アクセントカラー、ガラスの透明度、発光エフェクト
- **フォント** — フォントサイズ・ファミリー、文字間隔、行の高さ
- **ターミナル** — カーソル点滅、スクロールバック行数、コマンド補完

加えて、**ランチャー管理**(起動するコマンドの追加・削除)と**承認待ち検知**(パターンの有効/無効・追加)のセクションもあります。

変更内容はリアルタイムで反映され、`~/.yami-term.json` に自動保存されます(言語設定のみ、反映には再起動が必要です)。

### 設定ファイル (`~/.yami-term.json`)

主要な項目の例:

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

| キー | 説明 | デフォルト |
|------|------|---------|
| `fontSize` | フォントサイズ (pt) | 14 |
| `fontFamily` | フォント名 | Menlo |
| `cursorBlink` | カーソル点滅 | true |
| `opacity` | ウィンドウ透明度 (0-1) | 0.8 |
| `accent` | アクセント色 (16進カラーコード) | #ff79c6 |
| `shell` | デフォルトシェル | OS依存 |
| `suggest` | コマンド補完 | true |
| `theme` | カラーテーマ | yamikawa |
| `letterSpacing` | 文字間隔 | 0 |
| `lineHeight` | 行の高さ | 1.0 |
| `scrollback` | スクロールバック行数 | 1000 |
| `bloomEnabled` | 発光エフェクト | false |
| `bloomIntensity` | 発光の強さ | 4 |
| `language` | UI言語(`auto`で自動判定) | auto |
| `launchers` | ツールランチャー一覧 | Claude Code(+macOSのみFinder) |
| `approvalPatterns` | 承認待ち検知パターン | Claude Code用+汎用y/n |

## 💡 補完機能の使い方

yami-term のコマンド補完は以下のソースから候補を提案します:

1. **シェル履歴** — 過去に実行したコマンド(設定中のシェルに応じてzsh/bash履歴を自動選択)
2. **PATH コマンド** — `$PATH` に含まれる実行可能ファイル

### 操作方法

| キー | 動作 |
|------|------|
| **Tab** / **→** | 最初の候補(またはゴースト)を確定・入力 |
| **↑** / **↓** | ミニリスト内で選択候補を切り替え |
| **Esc** | 補完パネルを閉じる、候補をリセット |
| **マウスクリック / ホバー** | リスト内の候補を確定・プレビュー |

> **注:** IME(日本語入力)が有効な場合は補完は表示されません。確定後に補完が再開されます。

補完は `~/.yami-term.json` の `"suggest": false` で無効化できます。

## 🛠 ソースからビルド

### 前提条件

- Node.js 20 以上
- npm (Node.js に付属)
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Visual Studio Build Tools(node-ptyのネイティブビルドに必要)

### ビルド手順

```bash
# リポジトリをクローン
git clone https://github.com/chumenium/yami-term.git
cd yami-term

# 依存パッケージをインストール
npm install

# 開発モードで起動
npm start

# 配布用パッケージを生成 (dist/ ディレクトリに出力)
npm run dist        # macOS (現在のarch)
npm run dist:arm64   # macOS (Apple Silicon)
npm run dist:win     # Windows
```

## 🔧 トラブルシューティング

### macOS: "yami-term"は壊れているため、開けません / 開発元を確認できません

macOS Gatekeeper がセキュリティ警告を表示する場合があります。以下の方法で解決できます。

**方法 1: Finder から開く**

1. **Finder** を開いて Applications フォルダに移動
2. **yami-term.app** を **右クリック**(または Control キーを押しながらクリック)
3. メニューから **「開く」** を選択
4. 確認ダイアログで **「開く」** をクリック

**方法 2: ターミナルで属性を削除**

```bash
xattr -cr /Applications/yami-term.app
```

**なぜこれが必要?** yami-term は Apple Developer Program での正式なコード署名・公証を行っていません。代わりに ad-hoc 署名を施しており、macOS の Gatekeeper が「信頼できない開発元」として初回起動時に警告を表示します。

### Windows: SmartScreenで「WindowsによってPCが保護されました」と表示される

yami-term は正式なコード署名証明書(EV証明書等)を取得していないため、未知の発行元として警告が表示されます。**詳細情報 → 実行** で起動できます。

## 📝 既知の制限

- **署名なし** — macOSはad-hoc署名・公証なし、Windowsはコード署名なしのため、どちらもOSのセキュリティ警告が表示されます
- **Windowsの見た目** — Liquid Glassのガラス表現(vibrancy)はmacOS専用APIのため、Windowsでは標準的なウィンドウ枠での表示になります(機能面での制限はありません)
- **WindowsではFinder相当機能なし** — 「アクティブタブのディレクトリをファイラーで開く」ランチャーは、実装がmacOS専用コマンド(lsof)に依存しているため現時点ではWindows/Linuxに提供していません
- **RTL(右→左)言語は未対応** — アラビア語・ヘブライ語等はレイアウト(テキスト方向・UI配置)の追加対応が必要なため、現時点ではスコープ外です
- **Linux未対応** — ビルド・動作確認を行っていません

## 📄 License

MIT License &copy; 2026 chumenium

詳細は [LICENSE](./LICENSE) ファイルを参照してください。
