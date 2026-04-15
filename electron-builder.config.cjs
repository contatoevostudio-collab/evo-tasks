/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.evostudio.tasks',
  productName: 'Evo Tasks',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
    'node_modules/**/*',
    'package.json',
  ],
  // Empacota o certificado público junto com o app
  extraResources: [
    { from: 'certs/cert.cer', to: 'cert.cer' },
  ],
  mac: {
    target: [
      { target: 'dmg', arch: ['arm64'] },
      { target: 'zip', arch: ['arm64'] },
    ],
    category: 'public.app-category.productivity',
    icon: 'public/icon.icns',
    identity: 'Evo Tasks Dev',
    gatekeeperAssess: false,
    hardenedRuntime: false,
  },
  dmg: {
    title: 'Evo Tasks',
    window: { width: 540, height: 380 },
  },
  publish: {
    provider: 'github',
    owner: 'contatoevostudio-collab',
    repo: 'evo-tasks',
    releaseType: 'release',
  },
};
