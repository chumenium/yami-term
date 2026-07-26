# yami-term 🖤✨

macOS向けの美しいターミナルエミュレータ。Liquid Glass UIとダークテーマで、ターミナルをもっと素敵に。

<!-- TODO: screenshot -->

## ✨ 特徴

- **Liquid Glass UI** — macOS vibrancy を活かしたガラス表現。ダークテーマでモダンな雰囲気を実現
- **マルチタブ** — 複数のシェルセッションをタブで管理。Cmd+T で新規タブ、Cmd+W で閉じる、Cmd+1-9 でタブ間移動
- **GUI設定モーダル** — Cmd+, で設定パネルを開く。フォント・透明度・アクセント色・カーソル点滅・補完の ON/OFF をリアルタイムで調整。設定は `~/.yami-term.json` に自動保存
- **コマンド補完 v2** 🚀 — zsh 履歴と PATH 内のコマンドから候補を自動抽出。カーソル直後のインラインゴースト（薄い提案テキスト）とカーソル近くのミニリスト（最大5件）で入力をアシスト。Tab / → キーで確定、↑↓ キーで切替、Esc で閉じる

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

> **注:** yami-term は Apple の Developer Program での正式な署名・公証を行っていません。代わりに ad-hoc 署名を施しており、macOS Gatekeeper のセキュリティ警告を回避する対応が可能です（詳細は [トラブルシューティング](#-トラブルシューティング) を参照）。  
> Releases に x64 が無い場合は、ソースからビルドしてください ([ビルド手順](#-ソースからビルド))

## ⌨️ ショートカット一覧

| キー | 機能 |
|------|------|
| **Cmd+T** | 新規タブを開く |
| **Cmd+W** | 現在のタブを閉じる |
| **Cmd+1~9** | 対応するタブ番号へ切り替え |
| **Cmd+,** | 設定パネルを開く |

## ⚙️ 設定

### GUI で設定

Cmd+, を押すと設定ウィンドウが開きます。以下の項目が調整可能です:

- **フォント** — Menlo、Monaco、Courier New など任意のモノスペースフォント
- **フォントサイズ** — 8pt ～ 28pt (デフォルト: 14pt)
- **透明度** — 0% ～ 100% (デフォルト: 80%)
- **アクセント色** — ピンク / 紫 / その他カラーピッカーで自由選択
- **カーソル点滅** — ON/OFF
- **補完機能** — ON/OFF

変更内容はリアルタイムで反映され、`~/.yami-term.json` に自動保存されます。

### 設定ファイル (`~/.yami-term.json`)

手動編集も可能です:

```json
{
  "fontSize": 14,
  "fontFamily": "Menlo",
  "cursorBlink": true,
  "opacity": 0.8,
  "accent": "#ff79c6",
  "shell": "/bin/zsh",
  "suggest": true
}
```

| キー | 説明 | デフォルト |
|------|------|---------|
| `fontSize` | フォントサイズ (pt) | 14 |
| `fontFamily` | フォント名 | Menlo |
| `cursorBlink` | カーソル点滅 | true |
| `opacity` | ウィンドウ透明度 (0-1) | 0.8 |
| `accent` | アクセント色 (16進カラーコード) | #ff79c6 |
| `shell` | デフォルトシェル | /bin/zsh |
| `suggest` | コマンド補完 | true |

## 💡 補完機能の使い方

yami-term のコマンド補完は以下のソースから候補を提案します:

1. **zsh 履歴** — 過去に実行したコマンド (リーセンシー優先・タイムスタンプ表示 🕐)
2. **PATH コマンド** ⚡ — `$PATH` に含まれる実行可能ファイル

### 動作仕様（v2）

補完は **2つのUI要素** で構成されています:

- **インラインゴースト** — カーソル直後に薄いテキストで次の入力を提案。選択候補の残り部分をプレビュー
- **ミニリスト** — カーソル直下に最大5件の候補をポップアップ。マウスでもキーボードでも選択可能

### 操作方法

| キー | 動作 |
|------|------|
| **Tab** / **→** | 最初の候補（またはゴースト）を確定・入力 |
| **↑** / **↓** | ミニリスト内で選択候補を切り替え |
| **Esc** | 補完パネルを閉じる、候補をリセット |
| **マウスクリック** | リスト内の候補をそのまま確定 |

> **注:** IME（日本語入力）が有効な場合は補完は表示されません。確定後に補完が再開されます。

補完は `~/.yami-term.json` の `"suggest": false` で無効化できます。

## 🛠 ソースからビルド

### 前提条件

- Node.js 20 以上
- Xcode Command Line Tools (`xcode-select --install`)
- npm (Node.js に付属)

### ビルド手順

```bash
# リポジトリをクローン
git clone https://github.com/chumenium/yami-term.git
cd yami-term

# 依存パッケージをインストール
npm install

# 開発モードで起動
npm start

# 配布用 dmg を生成 (dist/ ディレクトリに出力)
npm run dist
```

ビルド後、dist/ フォルダに `yami-term-<version>-arm64.dmg` が出力されます。

## 🔧 トラブルシューティング

### "yami-term"は壊れているため、開けません / 開発元を確認できません

macOS Gatekeeper がセキュリティ警告を表示する場合があります。以下の方法で解決できます。

**方法 1: Finder から開く**

1. **Finder** を開いて Applications フォルダに移動
2. **yami-term.app** を **右クリック**（または Control キーを押しながらクリック）
3. メニューから **「開く」** を選択
4. 確認ダイアログで **「開く」** をクリック

**方法 2: ターミナルで属性を削除**

上記の方法で解決しない場合、ターミナルで以下を実行してください:

```bash
xattr -cr /Applications/yami-term.app
```

**なぜこれが必要？**

yami-term は Apple Developer Program での正式なコード署名・公証を行っていません。代わりに ad-hoc 署名を施しており、macOS の Gatekeeper が「信頼できない開発元」として初回起動時に警告を表示します。上記の手順により、システムレベルでこのアプリを信頼できるものとしてマークできます。

## 📝 既知の制限

- **Ad-hoc 署名のみ** — Apple の Developer Program による正式な署名ではなく ad-hoc 署名のため、初回起動時に Gatekeeper の警告が表示されます
- **公証なし** — Notarization (Appleの公証サービス) を経由していません
- **補完の行追跡** — 複数行入力時の補完ロジックは簡易実装です。インラインゴースト・ミニリストは現在行のみ対応
- **macOS 専用** — Electron のネイティブ API (vibrancy) を使用しているため、Windows・Linux 対応予定はありません
- **RTL(右→左)言語は未対応** — アラビア語・ヘブライ語等はレイアウト(テキスト方向・UI配置)の追加対応が必要なため、現時点ではスコープ外です

## 📄 License

MIT License &copy; 2026 chumenium

詳細は [LICENSE](./LICENSE) ファイルを参照してください。
