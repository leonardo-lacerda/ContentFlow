const defaultBaseUrl = process.env.PRODUCTION_BASE_URL || 'http://localhost:4007';
const argument = process.argv.find((value) => value.startsWith('--url='));
const baseUrl = (argument ? argument.slice('--url='.length) : defaultBaseUrl).replace(/\/$/, '');

const checks = [
  { path: '/', allowed: [200] },
  { path: '/auth/login', allowed: [200] },
  { path: '/studio/new', allowed: [200, 307, 308] },
  { path: '/api/user/self', allowed: [200, 401, 403] },
];

let failed = false;
for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, { redirect: 'manual' });
    const ok = check.allowed.includes(response.status);
    console.log(`[smoke] ${check.path} -> ${response.status}${ok ? '' : ' (unexpected)'}`);
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.error(`[smoke] ${check.path} -> request failed: ${error.message}`);
  }
}

if (failed) process.exit(1);
console.log(`[smoke] ${baseUrl} is responding`);
