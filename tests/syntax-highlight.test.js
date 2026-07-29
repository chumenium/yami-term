const test = require('node:test');
const assert = require('node:assert');

// Setup: Mock global.window before requiring the module
global.window = {};

// Load the module after window is mocked (it attaches itself to global.window)
require('../renderer/syntax-highlight.js');

// Get reference to YamiSyntaxHighlight from global.window
const YamiSyntaxHighlight = global.window.YamiSyntaxHighlight;

test('syntax-highlight.js - getLanguageForPath() は .js を javascript に正しくマップ', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('file.js'), 'javascript');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('src/index.js'), 'javascript');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('path/to/file.js'), 'javascript');
});

test('syntax-highlight.js - 複数の拡張子が正しくマップされる', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('script.py'), 'python');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('readme.md'), 'markdown');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('config.json'), 'json');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('style.css'), 'css');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('page.html'), 'markup');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('script.sh'), 'bash');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('config.yaml'), 'yaml');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('program.rs'), 'rust');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('code.go'), 'go');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('app.java'), 'java');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('main.c'), 'c');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('header.h'), 'c');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('source.cpp'), 'cpp');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('component.jsx'), 'javascript');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('types.ts'), 'typescript');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('data.yml'), 'yaml');
});

test('syntax-highlight.js - 大文字拡張子も正しく判定される', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('FILE.JS'), 'javascript');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('SCRIPT.PY'), 'python');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('README.MD'), 'markdown');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('CONFIG.JSON'), 'json');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('STYLE.CSS'), 'css');
});

test('syntax-highlight.js - 混在大文字小文字も対応', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('File.Js'), 'javascript');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('Script.PyThon'), 'plaintext');
});

test('syntax-highlight.js - 拡張子なしのファイル名でクラッシュしない', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('Makefile'), 'plaintext');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('README'), 'plaintext');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('noextension'), 'plaintext');
});

test('syntax-highlight.js - パス区切りのみのファイル名でクラッシュしない', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('path/to'), 'plaintext');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath('path/'), 'plaintext');
});

test('syntax-highlight.js - 無効な入力でクラッシュしない', async (t) => {
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath(''), 'plaintext');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath(null), 'plaintext');
  assert.strictEqual(YamiSyntaxHighlight.getLanguageForPath(undefined), 'plaintext');
});

test('syntax-highlight.js - Prism未定義時、highlight()は例外を投げない', async (t) => {
  global.window.Prism = undefined;

  const code = '<script>alert("test");</script>';
  const result = YamiSyntaxHighlight.highlight(code, 'test.js');

  // Should not throw, and should return a string
  assert.strictEqual(typeof result, 'string');
});

test('syntax-highlight.js - Prism未定義時、HTMLエスケープされた文字列を返す', async (t) => {
  global.window.Prism = undefined;

  const code = '<script>alert("test");</script>';
  const result = YamiSyntaxHighlight.highlight(code, 'test.js');

  // Should contain escaped characters
  assert.ok(result.includes('&lt;script&gt;'), 'HTMLエスケープされるべき');
  assert.ok(result.includes('&lt;/script&gt;'), 'HTMLエスケープされるべき');
  // Note: htmlEscape only escapes <, >, &, not double quotes
  assert.strictEqual(result, '&lt;script&gt;alert("test");&lt;/script&gt;');
});

test('syntax-highlight.js - Prism未定義時、amp記号もエスケープ', async (t) => {
  global.window.Prism = undefined;

  const code = 'a & b';
  const result = YamiSyntaxHighlight.highlight(code, 'test.js');

  assert.ok(result.includes('&amp;'), 'ampersandがエスケープされるべき');
  assert.strictEqual(result, 'a &amp; b');
});

test('syntax-highlight.js - Prism未定義時、gt記号もエスケープ', async (t) => {
  global.window.Prism = undefined;

  const code = 'a > b';
  const result = YamiSyntaxHighlight.highlight(code, 'test.js');

  assert.ok(result.includes('&gt;'), 'gt記号がエスケープされるべき');
  assert.strictEqual(result, 'a &gt; b');
});

test('syntax-highlight.js - 無効なコードでクラッシュしない', async (t) => {
  global.window.Prism = undefined;

  // Empty string
  assert.strictEqual(YamiSyntaxHighlight.highlight('', 'test.js'), '');

  // null
  assert.strictEqual(YamiSyntaxHighlight.highlight(null, 'test.js'), '');

  // undefined
  assert.strictEqual(YamiSyntaxHighlight.highlight(undefined, 'test.js'), '');

  // Non-string
  assert.strictEqual(YamiSyntaxHighlight.highlight(123, 'test.js'), '');
});

test('syntax-highlight.js - Prismモック: 基本的なhighlight()動作', async (t) => {
  // Setup Prism mock
  global.window.Prism = {
    languages: {
      javascript: {},
      python: {},
    },
    highlight: (code, grammar, language) => {
      // Simple mock: wrap code with language indicator
      return `<span class="language-${language}">${code}</span>`;
    },
  };

  const code = 'const x = 1;';
  const result = YamiSyntaxHighlight.highlight(code, 'test.js');

  assert.strictEqual(result, '<span class="language-javascript">const x = 1;</span>');
});

test('syntax-highlight.js - Prismモック: 言語が無いときはエスケープ', async (t) => {
  // Setup Prism mock
  global.window.Prism = {
    languages: {
      javascript: {},
    },
    highlight: (code, grammar, language) => {
      return `<span class="language-${language}">${code}</span>`;
    },
  };

  const code = '<unknown>code</unknown>';
  const result = YamiSyntaxHighlight.highlight(code, 'test.unknown');

  // Language is not in Prism.languages, so should be HTML-escaped as plaintext
  assert.ok(result.includes('&lt;unknown&gt;'), 'unknown拡張子はエスケープされるべき');
});

test('syntax-highlight.js - Prismモック: 不正な形式のfilePath', async (t) => {
  global.window.Prism = {
    languages: {
      javascript: {},
    },
    highlight: (code, grammar, language) => {
      return `<span class="language-${language}">${code}</span>`;
    },
  };

  const code = 'let x = 1;';

  // Empty filePath -> plaintext language -> not in languages -> escaped
  const result = YamiSyntaxHighlight.highlight(code, '');
  assert.ok(result.includes('let x = 1;')); // Should still return the code (escaped or highlighted)
});

test('syntax-highlight.js - Prismモック例外: highlight()がエラーを投げた場合', async (t) => {
  // Setup Prism mock that throws
  global.window.Prism = {
    languages: {
      javascript: {},
    },
    highlight: (code, grammar, language) => {
      throw new Error('Prism highlight failed');
    },
  };

  const code = '<test>code</test>';

  // Should not throw, should fallback to HTML escape
  const result = YamiSyntaxHighlight.highlight(code, 'test.js');
  assert.ok(result.includes('&lt;test&gt;'), 'エラー時はエスケープにフォールバック');
});
