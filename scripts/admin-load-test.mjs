const baseUrl = process.env.ADMIN_LOAD_URL || 'http://localhost:3000';
const cookie = process.env.ADMIN_LOAD_COOKIE;
const count = Number(process.env.ADMIN_LOAD_COUNT || 200);
const concurrency = Math.max(1, Number(process.env.ADMIN_LOAD_CONCURRENCY || 10));

if (!cookie) {
  console.error('Set ADMIN_LOAD_COOKIE to an admin_auth cookie before running the load test.');
  process.exit(2);
}

const latencies = [];
let cursor = 0;
let failures = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= count) return;
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}/admin/users?page=${index % 20}&limit=100`, {
        headers: { cookie },
      });
      latencies.push(performance.now() - started);
      if (!response.ok) failures++;
      await response.arrayBuffer();
    } catch {
      failures++;
      latencies.push(performance.now() - started);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker));
latencies.sort((a, b) => a - b);
const percentile = (ratio) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * ratio))] || 0;
const result = { requests: count, failures, concurrency, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), p99Ms: Math.round(percentile(0.99)) };
console.log(JSON.stringify(result, null, 2));
if (failures > 0 || result.p95Ms > Number(process.env.ADMIN_LOAD_P95_MS || 1500)) process.exit(1);
