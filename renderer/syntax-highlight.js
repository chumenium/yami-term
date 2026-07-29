/**
 * YamiSyntaxHighlight - Prism.js-based syntax highlighter for yami-term
 * Provides syntax highlighting functionality for code display in the claude panel
 */

// Prism auto-runs highlightAll() on DOMContentLoaded by default. This app never
// renders language-* classes for Prism to scan, so it's a no-op today, but
// opting into manual mode makes that explicit and avoids surprises later.
if (window.Prism) {
  window.Prism.manual = true;
}

window.YamiSyntaxHighlight = (() => {
  /**
   * Maps file extensions to Prism language names
   * @type {Object<string, string>}
   */
  const extensionToLanguageMap = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',

    // Python
    'py': 'python',

    // Data formats
    'json': 'json',

    // Styles
    'css': 'css',

    // Markup
    'html': 'markup',
    'htm': 'markup',

    // Shell scripting
    'sh': 'bash',
    'bash': 'bash',

    // Configuration/Data
    'yml': 'yaml',
    'yaml': 'yaml',

    // Documentation
    'md': 'markdown',

    // Systems languages
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'hpp': 'cpp',
  };

  /**
   * HTML escape special characters
   * @param {string} text - Text to escape
   * @returns {string} HTML-escaped text
   */
  function htmlEscape(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Determine Prism language name from file path
   * @param {string} filePath - File path (e.g., "path/to/file.js")
   * @returns {string} Prism language name, or 'plaintext' if unknown
   */
  function getLanguageForPath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return 'plaintext';
    }

    // Extract the extension from the final path segment only — a dot in a
    // parent directory name (e.g. "/dir.v2/Makefile") must not be mistaken
    // for the file's own extension.
    const baseName = filePath.split(/[\\/]/).pop();
    const lastDotIndex = baseName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      // No extension, or a dotfile like ".gitignore" with no real extension
      return 'plaintext';
    }

    const extension = baseName.substring(lastDotIndex + 1).toLowerCase();

    // Look up in mapping, default to plaintext
    return extensionToLanguageMap[extension] || 'plaintext';
  }

  /**
   * Highlight code with syntax highlighting
   * Falls back to HTML-escaped plain text if Prism is unavailable or language unsupported
   * @param {string} code - Source code to highlight
   * @param {string} filePath - File path to determine language (e.g., "path/to/file.js")
   * @returns {string} HTML string with syntax highlighting
   */
  function highlight(code, filePath) {
    if (!code || typeof code !== 'string') {
      return '';
    }

    // Check if Prism is available
    if (typeof window.Prism === 'undefined' || !window.Prism) {
      // Fallback: return HTML-escaped code
      return htmlEscape(code);
    }

    // Get language from file path
    const language = getLanguageForPath(filePath);

    // Check if the language grammar is available in Prism
    if (!window.Prism.languages || !window.Prism.languages[language]) {
      // Language not available, return HTML-escaped code
      return htmlEscape(code);
    }

    try {
      // Use Prism to highlight
      return window.Prism.highlight(
        code,
        window.Prism.languages[language],
        language
      );
    } catch (error) {
      // If highlighting fails for any reason, fallback to HTML-escaped text
      console.warn(
        `YamiSyntaxHighlight: Failed to highlight code for language "${language}":`,
        error
      );
      return htmlEscape(code);
    }
  }

  /**
   * Public API
   */
  return {
    highlight,
    getLanguageForPath,
  };
})();
