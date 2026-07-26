// タブ(pty id)ごとのApprovalDetectorを管理し、承認待ち一覧を提供する。
// Electron依存なし・純粋ロジックのみ(main.jsから利用される)。

const { ApprovalDetector } = require('./approval-detector');

function createApprovalManager(getPatternConfigs) {
  const detectors = new Map(); // id -> ApprovalDetector
  const awaitingIds = new Set();

  function ensureDetector(id) {
    if (!detectors.has(id)) {
      detectors.set(id, new ApprovalDetector(getPatternConfigs()));
    }
    return detectors.get(id);
  }

  // 新規出力をfeedし、承認待ち状態が変化したかを返す
  function feed(id, chunk) {
    const detector = ensureDetector(id);
    const wasAwaiting = awaitingIds.has(id);
    detector.feed(chunk);
    const isAwaiting = detector.matched();

    if (isAwaiting) {
      awaitingIds.add(id);
    } else {
      awaitingIds.delete(id);
    }

    return isAwaiting !== wasAwaiting;
  }

  // ユーザーがそのタブへ入力した際に呼ぶ(応答したとみなして即座にクリア)
  function clear(id) {
    const wasAwaiting = awaitingIds.has(id);
    awaitingIds.delete(id);
    const detector = detectors.get(id);
    if (detector) detector.reset();
    return wasAwaiting;
  }

  // タブが閉じられた際に呼ぶ
  function remove(id) {
    detectors.delete(id);
    awaitingIds.delete(id);
  }

  // 設定変更後、全detectorのパターンを再読込する
  function refreshPatterns() {
    const patternConfigs = getPatternConfigs();
    detectors.forEach(detector => detector.setPatterns(patternConfigs));
  }

  function getAwaitingList() {
    return Array.from(awaitingIds).map(id => ({
      id,
      snippet: detectors.get(id)?.matchedSnippet() || '',
    }));
  }

  return { feed, clear, remove, refreshPatterns, getAwaitingList };
}

module.exports = createApprovalManager;
