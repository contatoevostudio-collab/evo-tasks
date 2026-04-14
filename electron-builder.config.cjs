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
  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    category: 'public.app-category.productivity',
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
