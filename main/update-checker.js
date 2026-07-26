const https = require('https');

const DEFAULT_REPO = 'chumenium/yami-term';
const DEFAULT_TIMEOUT_MS = 5000;

function parseVersionParts(version) {
  return String(version)
    .replace(/^v/i, '')
    .split('.')
    .map(part => parseInt(part, 10) || 0);
}

// セマンティックバージョン比較。a > b なら正、a < b なら負、等しければ0を返す。
function compareVersions(a, b) {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// GitHub Releases APIの/releases/latestを取得する。テストから差し替えられるよう
// 単純なPromiseベースの関数として切り出している(実ネットワークに依存しない検証用)。
function fetchLatestRelease(repo, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/latest`,
      headers: {
        'User-Agent': 'yami-term-update-checker',
        'Accept': 'application/vnd.github+json',
      },
      timeout: timeoutMs,
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`GitHub API responded with status ${res.statusCode}`));
        return;
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`failed to parse GitHub API response: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('update check request timed out'));
    });
    req.on('error', reject);
  });
}

// 現在バージョンと最新のGitHub Releaseを比較する。
// ネットワークエラー・タイムアウト・不正レスポンスは全て握りつぶし
// hasUpdate:falseを返す(起動処理をブロックしたりクラッシュさせたりしないため)。
async function checkForUpdate({
  currentVersion,
  repo = DEFAULT_REPO,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchLatest = fetchLatestRelease,
} = {}) {
  const base = { currentVersion, latestVersion: null, hasUpdate: false, url: null, error: null };

  try {
    const release = await fetchLatest(repo, timeoutMs);
    const latestVersion = String(release && release.tag_name || '').replace(/^v/i, '');

    if (!latestVersion) {
      return { ...base, error: 'no tag_name in release response' };
    }

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
    const url = (release && release.html_url) || `https://github.com/${repo}/releases/tag/v${latestVersion}`;

    return { ...base, latestVersion, hasUpdate, url };
  } catch (err) {
    return { ...base, error: err.message };
  }
}

module.exports = {
  checkForUpdate,
  compareVersions,
  fetchLatestRelease,
};
