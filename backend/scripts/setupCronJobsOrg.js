#!/usr/bin/env node
// Creates (or updates) the MAISON scheduled jobs on cron-job.org.
//
// Run once from your machine, from the backend folder:
//   CRONJOB_API_KEY=xxx BACKEND_URL=https://your-app.onrender.com CRON_SECRET=xxx \
//     node scripts/setupCronJobOrg.js
//
// Preview the payloads without calling the API:
//   BACKEND_URL=https://your-app.onrender.com node scripts/setupCronJobOrg.js --dry-run
//
// Safe to re-run: jobs are matched by title and updated instead of duplicated.
// API key: cron-job.org Console -> Settings -> API.

const API = 'https://api.cron-job.org';
const DRY_RUN = process.argv.includes('--dry-run');
const API_KEY = process.env.CRONJOB_API_KEY;
const BACKEND_URL_LIVE = (process.env.BACKEND_URL_LIVE || '').replace(/\/+$/, '');
const CRON_SECRET = process.env.CRON_SECRET;

const ALL = [-1];
// All schedules are UTC, matching the old GitHub Actions workflow.
const schedule = ({ minutes, hours = ALL, wdays = ALL }) => ({
    timezone: 'UTC', expiresAt: 0, minutes, hours, wdays, mdays: ALL, months: ALL
});

const JOBS = [
    // Keeps the free Render service awake (it sleeps after 15 idle minutes),
    // so job calls answer within cron-job.org's 30-second timeout.
    { title: 'MAISON keep-awake', path: '/api/v1/health', method: 0,
      schedule: schedule({ minutes: [0, 10, 20, 30, 40, 50] }), failuresBeforeAlert: 3 },
    { title: 'MAISON stock-holds', path: '/api/v1/jobs/stock-holds', method: 1,
      schedule: schedule({ minutes: [0, 30] }) },                                   // every 30 min
    { title: 'MAISON abandoned-carts', path: '/api/v1/jobs/abandoned-carts', method: 1,
      schedule: schedule({ minutes: [45] }) },                                      // hourly at :45
    { title: 'MAISON invoice-retry', path: '/api/v1/jobs/invoice-retry', method: 1,
      schedule: schedule({ minutes: [15], hours: [0, 3, 6, 9, 12, 15, 18, 21] }) }, // every 3 h at :15
    { title: 'MAISON wishlist', path: '/api/v1/jobs/wishlist', method: 1,
      schedule: schedule({ minutes: [30], hours: [4] }) },                          // daily 04:30 UTC
    { title: 'MAISON newsletter', path: '/api/v1/jobs/newsletter', method: 1,
      schedule: schedule({ minutes: [30], hours: [4], wdays: [1] }) }               // Mondays 04:30 UTC
];

function toPayload(job) {
    return {
        title: job.title,
        url: `${BACKEND_URL_LIVE}${job.path}`,
        enabled: true,
        saveResponses: false,
        requestMethod: job.method,
        requestTimeout: 30,
        schedule: job.schedule,
        extendedData: {
            headers: job.method === 1 ? { 'x-cron-secret': CRON_SECRET || '<CRON_SECRET>' } : {},
            body: ''
        },
        notification: {
            onFailure: true,
            onFailureCount: job.failuresBeforeAlert || 1,
            onSuccess: true,   // tells you when a failing job recovers
            onDisable: true
        }
    };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(method, path, body) {
    const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status} ${text}`);
    return text ? JSON.parse(text) : {};
}

async function main() {
    if (!/^https:\/\//.test(BACKEND_URL_LIVE)) {
        console.error('Set BACKEND_URL_LIVE to your https:// Render URL (no trailing slash)');
        process.exit(1);
    }
    if (DRY_RUN) {
        for (const job of JOBS) console.log(JSON.stringify({ job: toPayload(job) }, null, 2));
        return;
    }
    if (!API_KEY || !CRON_SECRET) {
        console.error('Set CRONJOB_API_KEY and CRON_SECRET');
        process.exit(1);
    }

    const { jobs: existing = [] } = await api('GET', '/jobs');
    const byTitle = new Map(existing.map(j => [j.title, j.jobId]));

    let created = 0;
    for (const job of JOBS) {
        const payload = { job: toPayload(job) };
        const jobId = byTitle.get(job.title);
        if (jobId) {
            await api('PATCH', `/jobs/${jobId}`, payload);
            console.log(`Updated  ${job.title} (#${jobId})`);
        } else {
            // Creating is limited to 1/second and 5/minute, so space them out.
            if (created > 0) await sleep(13_000);
            const { jobId: newId } = await api('PUT', '/jobs', payload);
            created++;
            console.log(`Created  ${job.title} (#${newId})`);
        }
    }
    console.log('Done. Check https://console.cron-job.org to see the jobs and their next runs.');
}

main().catch(err => {
    console.error(err.message);
    process.exit(1);
});