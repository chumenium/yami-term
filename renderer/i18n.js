const YamiI18nImpl = (() => {
  const locale = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase().startsWith('ja') ? 'ja' : 'en';

  const dict = {
    en: {
      'settings.title': 'Settings',
      'settings.fontSize': 'Font Size',
      'settings.fontFamily': 'Font Family',
      'settings.opacity': 'Glass Opacity',
      'settings.accent': 'Accent Color',
      'settings.cursorBlink': 'Cursor Blink',
      'settings.shell': 'Shell',
      'settings.suggest': 'Command Suggest',
      'settings.theme': 'Theme',
      'settings.letterSpacing': 'Letter Spacing',
      'settings.lineHeight': 'Line Height',
      'settings.scrollback': 'Scrollback Lines',
      'settings.bloomEnabled': 'Bloom Effect',
      'settings.bloomIntensity': 'Bloom Intensity',
      'settings.about.version': 'Version',
      'settings.about.author': 'Author',
      'empty.newTab': 'New Tab',
      'empty.settings': 'Settings',
      'settings.launchers.title': 'Launchers',
      'settings.launchers.labelPlaceholder': 'Label',
      'settings.launchers.commandPlaceholder': 'Command',
      'palette.placeholder': 'Search a command to run…',
      'settings.approvalPatterns.title': 'Approval Detection',
      'settings.approvalPatterns.patternPlaceholder': 'Regex pattern',
    },
    ja: {
      'settings.title': '設定',
      'settings.fontSize': 'フォントサイズ',
      'settings.fontFamily': 'フォントファミリー',
      'settings.opacity': 'ガラスの透明度',
      'settings.accent': 'アクセントカラー',
      'settings.cursorBlink': 'カーソル点滅',
      'settings.shell': 'シェル',
      'settings.suggest': 'コマンド補完',
      'settings.theme': 'テーマ',
      'settings.letterSpacing': '文字間隔',
      'settings.lineHeight': '行の高さ',
      'settings.scrollback': 'スクロールバック行数',
      'settings.bloomEnabled': '発光エフェクト',
      'settings.bloomIntensity': '発光の強さ',
      'settings.about.version': 'バージョン',
      'settings.about.author': '作者',
      'empty.newTab': '新しいタブ',
      'empty.settings': '設定',
      'settings.launchers.title': 'ランチャー',
      'settings.launchers.labelPlaceholder': 'ラベル',
      'settings.launchers.commandPlaceholder': 'コマンド',
      'palette.placeholder': 'コマンドを検索して起動…',
      'settings.approvalPatterns.title': '承認待ち検知',
      'settings.approvalPatterns.patternPlaceholder': '正規表現パターン',
    },
  };

  function t(key) {
    return (dict[locale] && dict[locale][key]) || dict.en[key] || key;
  }

  return { locale, t, dict };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = YamiI18nImpl;
}
if (typeof window !== 'undefined') {
  window.YamiI18n = YamiI18nImpl;
}
