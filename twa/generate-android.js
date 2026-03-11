/**
 * Non-interactive Android project generator.
 * Uses bubblewrap/core API directly to generate the android/ Gradle project
 * from twa-manifest.json, bypassing the interactive CLI wizard.
 */
const path = require('path');
const {TwaManifest, Config, TwaGenerator} = require(
  'C:/Users/takia/AppData/Roaming/npm/node_modules/@bubblewrap/cli/node_modules/@bubblewrap/core/dist/index.js'
);

const CORE_PATH = 'C:/Users/takia/AppData/Roaming/npm/node_modules/@bubblewrap/cli/node_modules/@bubblewrap/core/dist/lib/';

async function main() {
  console.log('Loading twa-manifest.json...');
  const manifestPath = path.resolve(__dirname, 'twa-manifest.json');
  const twaManifest = await TwaManifest.fromFile(manifestPath);
  console.log('  App:', twaManifest.name, '| Package:', twaManifest.packageId);

  console.log('Setting up config...');
  const config = new Config(
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Users\\takia\\AppData\\Local\\Android\\Sdk'
  );

  console.log('Generating Android project...');
  const log = { debug: () => {}, info: (m) => console.log(' ', m), warn: (m) => console.warn('WARN:', m), error: (m) => console.error('ERR:', m) };
  const generator = new TwaGenerator();
  const targetDir = path.resolve(__dirname, 'android');
  await generator.createTwaProject(targetDir, twaManifest, log);
  console.log('\nAndroid project generated at:', targetDir);
  console.log('Now run: bubblewrap build (from the twa/ directory)');
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
