// 承認待ち状態検知: ptyの出力(ロールバッファ)に対し設定可能な正規表現でパターンマッチングする。
// Electron依存なし・純粋ロジックのみ(main.jsから利用される)。

const MAX_BUFFER_LENGTH = 4000;

// ANSIエスケープシーケンス(CSI/OSC/文字セット切替等)を除去する。
// matchedSnippet()の表示用クリーンアップのみに使う(matched()判定自体は生バッファに対して行う)。
const ANSI_REGEX = /\x1b\][^\x07]*\x07|\x1b\[[0-9;?]*[a-zA-Z]|\x1b[()][A-Za-z0-9]|\x1b[=>]/g;

function stripAnsi(str) {
  return str.replace(ANSI_REGEX, '');
}

function compilePatterns(patternConfigs) {
  const compiled = [];
  const MAX_PATTERN_LENGTH = 200; // Prevent ReDoS via long patterns
  for (const cfg of patternConfigs || []) {
    if (!cfg || cfg.enabled === false || typeof cfg.pattern !== 'string') continue;
    // Check pattern length to prevent ReDoS attacks
    if (cfg.pattern.length > MAX_PATTERN_LENGTH) {
      console.warn(`[yami-term] Pattern exceeds max length (${MAX_PATTERN_LENGTH}), skipping: ${cfg.pattern.slice(0, 50)}...`);
      continue;
    }
    try {
      compiled.push(new RegExp(cfg.pattern, 'i'));
    } catch (err) {
      // 不正な正規表現は無視する
    }
  }
  return compiled;
}

class ApprovalDetector {
  constructor(patternConfigs) {
    this.buffer = '';
    this.setPatterns(patternConfigs);
  }

  setPatterns(patternConfigs) {
    this.patterns = compilePatterns(patternConfigs);
  }

  feed(chunk) {
    if (typeof chunk === 'string') {
      this.buffer = (this.buffer + chunk).slice(-MAX_BUFFER_LENGTH);
    }
    return this.matched();
  }

  matched() {
    // Buffer is already tail-limited to MAX_BUFFER_LENGTH in feed(),
    // so no further truncation is needed here.
    return this.patterns.some(re => re.test(this.buffer));
  }

  matchedSnippet() {
    // Buffer is already tail-limited to MAX_BUFFER_LENGTH in feed(),
    // so no further truncation is needed here.
    for (const re of this.patterns) {
      const m = this.buffer.match(re);
      if (m) {
        const idx = m.index;
        const lineStart = this.buffer.lastIndexOf('\n', idx) + 1;
        let lineEnd = this.buffer.indexOf('\n', idx);
        if (lineEnd === -1) lineEnd = this.buffer.length;
        const rawLine = this.buffer.slice(lineStart, lineEnd);
        // eslint-disable-next-line no-control-regex
        return stripAnsi(rawLine).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '').trim();
      }
    }
    return '';
  }

  reset() {
    this.buffer = '';
  }
}

module.exports = { ApprovalDetector, compilePatterns };
