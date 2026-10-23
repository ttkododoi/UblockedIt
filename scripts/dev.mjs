import { spawn } from 'node:child_process';

const procs = [
  ['api', ['--no-warnings', 'server/index.js']],
  ['web', ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0']],
].map(([name, args]) => {
  const p = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  p.on('exit', (code) => console.log(`[${name}] exited ${code}`));
  return p;
});

const stop = () => procs.forEach((p) => p.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
