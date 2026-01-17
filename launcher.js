const { spawn } = require('child_process');
const path = require('path');

console.log('Starting File Converter...');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['start'];

const child = spawn(npm, args, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
});