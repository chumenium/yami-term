const { execFileSync } = require('child_process');
const path = require('path');

/**
 * electron-builder afterSign hook
 * Ad-hoc code sign the application to allow installation on macOS
 * (resolves "app is damaged" Gatekeeper errors without requiring a Developer ID)
 */
exports.default = async function (context) {
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
