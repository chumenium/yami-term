const { execFileSync } = require('child_process');
const path = require('path');

/**
 * electron-builder afterSign hook
 * Ad-hoc code sign the application to allow installation on macOS
 * (resolves "app is damaged" Gatekeeper errors without requiring a Developer ID)
 *
 * electron-builder invokes afterSign for every platform being packaged, not
 * just macOS. `codesign` is a macOS-only binary, so this hook must no-op on
 * Windows/Linux builds instead of failing them.
 */
exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') {
    console.log(`[afterSign] Skipping macOS ad-hoc signing on platform: ${context.electronPlatformName}`);
    return;
  }

  const { appOutDir, packager } = context;
  const productFilename = packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${productFilename}.app`);

  console.log(`[afterSign] Ad-hoc code signing: ${appPath}`);

  try {
    execFileSync('codesign', [
      '--force',
      '--deep',
      '--sign',
      '-',
      appPath
    ], {
      stdio: 'inherit'
    });
    console.log('[afterSign] Code signing completed successfully');
  } catch (error) {
    console.error(`[afterSign] Code signing failed: ${error.message}`);
    throw error;
  }
};
