import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');

// Load package.json
const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
const pkg = JSON.parse(packageJsonContent);

test('version is valid semver format', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, 'version must match semver format (X.Y.Z)');
});

test('main field is set to main.js', () => {
  assert.strictEqual(pkg.main, 'main.js', 'main should be main.js');
});

test('license is MIT', () => {
  assert.strictEqual(pkg.license, 'MIT', 'license should be MIT');
});

test('repository.url contains github.com/chumenium/yami-term', () => {
  assert.ok(
    pkg.repository?.url?.includes('github.com/chumenium/yami-term'),
    'repository.url should contain github.com/chumenium/yami-term'
  );
});

test('scripts.dist exists and contains electron-builder', () => {
  assert.ok(pkg.scripts?.dist, 'scripts.dist should exist');
  assert.ok(
    pkg.scripts.dist.includes('electron-builder'),
    'scripts.dist should contain electron-builder'
  );
});

test('scripts.start is electron .', () => {
  assert.strictEqual(pkg.scripts?.start, 'electron .', 'scripts.start should be electron .');
});

test('build.appId is com.chumenium.yamiterm', () => {
  assert.strictEqual(
    pkg.build?.appId,
    'com.chumenium.yamiterm',
    'build.appId should be com.chumenium.yamiterm'
  );
});

test('build.productName is yami-term', () => {
  assert.strictEqual(pkg.build?.productName, 'yami-term', 'build.productName should be yami-term');
});

test('build.asarUnpack is array containing node-pty pattern', () => {
  assert.ok(Array.isArray(pkg.build?.asarUnpack), 'build.asarUnpack should be an array');
  assert.ok(
    pkg.build.asarUnpack.some((pattern) => pattern.includes('node-pty')),
    'build.asarUnpack should contain a pattern matching node-pty'
  );
});

test('build.mac.target contains both dmg and zip', () => {
  assert.ok(pkg.build?.mac?.target, 'build.mac.target should exist');
  assert.ok(Array.isArray(pkg.build.mac.target), 'build.mac.target should be an array');

  const targetTypes = pkg.build.mac.target.map((t) =>
    typeof t === 'string' ? t : t.target
  );

  assert.ok(targetTypes.includes('dmg'), 'build.mac.target should include dmg');
  assert.ok(targetTypes.includes('zip'), 'build.mac.target should include zip');
});

test('build.files excludes tests directory', () => {
  assert.ok(pkg.build?.files, 'build.files should exist');
  assert.ok(Array.isArray(pkg.build.files), 'build.files should be an array');
  assert.ok(
    pkg.build.files.some((pattern) => pattern.includes('!tests')),
    'build.files should exclude tests directory'
  );
});

test('devDependencies contains electron-builder', () => {
  assert.ok(
    pkg.devDependencies?.['electron-builder'],
    'devDependencies should contain electron-builder'
  );
});

test('author identity is limited to the project owner', () => {
  assert.strictEqual(pkg.author, 'chumenium', 'author should be exactly "chumenium"');
});

test('no email addresses leak into package.json', () => {
  const pkgString = JSON.stringify(pkg);
  const emails = pkgString.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  const unexpected = emails.filter((e) => !e.endsWith('users.noreply.github.com'));

  assert.deepStrictEqual(unexpected, [], 'package.json should not contain email addresses');
});
