import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {summarize,type Measurement} from './performance-accounting.js';
const directory='docs/verification/performance';await mkdir(directory,{recursive:true});
const names=['baseline','ramp','stress'] as const;
type Run={profile:string;startedAt:string;finishedAt:string;environment:{node:string;platform:string;release:string;cpu:string;logicalCpus:number;browser:string;database:{server_version:string}};workload:{drivers:number;observers:number;engineJobs:number;rounds:number;durationMs:number};samples:Measurement[];summary:ReturnType<typeof summarize>[];http:{count:number;errors:number};httpByRoute:Record<string,number>;workerErrorCount:number;deliveryAttempts:unknown;clock:unknown;ui:unknown;resources:unknown;trace:unknown;finalStatus:unknown;metrics:unknown;idle:unknown};
const runs:Run[]=[],manifest=[];
for(const name of names){
 const raw=await readFile(`.local/performance/${name}.json`,'utf8'),run=JSON.parse(raw) as Run;
 if(run.profile!==name||!run.ui)throw new Error(`Missing final map-enabled ${name} run`);
 for(const summary of run.summary){const actual=summarize(run.samples,summary.boundary,summary.condition);if(JSON.stringify(actual)!==JSON.stringify(summary))throw new Error(`Sample accounting drift in ${name}`);}
 // Raw evidence contains UUID correlation and numeric diagnostics, not credentials or recipient payloads.
 await writeFile(`${directory}/${name}.json`,raw);manifest.push({file:`${name}.json`,sha256:createHash('sha256').update(raw).digest('hex'),startedAt:run.startedAt,finishedAt:run.finishedAt});runs.push(run);
}
for(const name of ['baseline-before-map-reuse','baseline-missing-map-route','ramp-missing-map-route','engine-live','smoke'])await copyFile(`.local/performance/${name}.json`,`${directory}/${name}.json`);
await writeFile(`${directory}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
const n=(value:number|null)=>value===null?'—':value.toFixed(1),rows=[];
for(const r of runs)for(const s of r.summary.filter(s=>s.condition==='healthy'))rows.push(`| ${r.profile} | ${r.workload.drivers}/${r.workload.observers}/${r.workload.engineJobs} | ${s.boundary} | ${s.completed}/${s.attempted} | ${n(s.upper.p50Ms)} | ${n(s.upper.p95Ms)} | ${n(s.upper.p99Ms)} | ${s.errors} | ${n(s.maxClockUncertaintyMs)} | ${s.verdict} |`);
const faults=[];for(const r of runs)for(const s of r.summary.filter(s=>s.condition!=='healthy'&&s.attempted))faults.push(`| ${r.profile} | ${s.condition} / ${s.boundary} | ${s.completed}/${s.attempted} | ${n(s.upper.p95Ms)} | ${s.errors} | ${n(s.recovery.p95Ms)} |`);
const r=runs[0]!,environment=r.environment;
const report=`# Phase 38 measured performance — 26 September 2026

Local results identify both useful headroom and a limit; they do not establish target-host capacity. The five-driver/two-observer baseline meets the measured view/application p95 comparisons. The fifteen-driver/ten-observer run misses the five-second ERP p95 target. No hard user/account cap or server purchase follows from these runs.

## Environment and conditions

- ${environment.platform} ${environment.release}; ${environment.cpu}; ${environment.logicalCpus} logical CPUs. Node ${environment.node}, npm 11.6.2, PostgreSQL ${environment.database.server_version}, Chromium ${environment.browser}. Retained Fastify 5.12.5, pg 8.23.0, React 19.3.0, Vite 8.3.0, MapLibre 6.10.0, Playwright 1.63.0, ExcelJS 4.4.0 (lockfile unchanged).
- Development Vite and actual MapLibre/PMTiles assets, with real Fastify/HTTP/CSRF/PostgreSQL/current-activity/monitoring paths and real signed delivery to separate restricted receiver databases. Authentication/source setup are labelled fixtures. API, Vite and reference sender/receiver workers share the harness Node process: its CPU/memory is combined, not a production API footprint. Browsers and PostgreSQL are separate processes. This shared desktop was not a certified exclusive benchmark host.
- Two tasks per driver, deterministic alternating heading actions; random identity UUIDs. Five/ten/fifteen concurrent driver commands per wave, two/five/ten independent single-driver observer contexts, one/four/eight planning-worker calls per wave. Sender concurrency four, poll 50 ms; normal browser poll one second. Closed-loop waves wait for completion. Cold setup is excluded and not represented as successful action samples.
- Engine jobs use configured real adapters; all nine separate live probes failed unavailable, Docker versions/mounts could not be inventoried, local Engine data listing was only .gitkeep. Thus “healthy” below means the measured execution/view/receiver path; no live planning/routing-health claim is made. Backup restore, target Hostinger/Dokploy, real ERP and physical phones are **unrun**.

## Percentiles and accounting

Nearest rank: sort N completed latencies, use element ceil(p*N). At least 100 attempted observations and zero failed/invalid observations are required for the harness's run-level healthy comparison; this minimum is an engineering guard, not a statistical confidence guarantee. Failures remain in attempted counts and prevent a pass. Each boundary has its own population: ERP measures all driver actions, views only subscribed drivers. A single fast smoke sample remains insufficient.

An async-local interval captures immediately before COMMIT and after its acknowledgement; the pre-COMMIT receipt timestamp is not used as an exact commit. Receiver end is after the real projection transaction COMMIT for **all** events from that action. Browser end is matching React DOM followed by two animation frames (a paint opportunity, not physical pixels). Seven round-trip probes estimate browser offset; the end probe enlarges uncertainty for observed drift. Same-process receiver uncertainty is conservatively 1 ms. The raw report contains COMMIT bounds, clock probes, lower and upper distributions. No remote NTP accuracy is claimed. DB wall-clock probes are recorded for interpretation but are not mixed into the monotonic freshness arithmetic.

All table latencies are conservative **upper bounds in milliseconds**.

| Run | Drivers/observers/Engine calls | Boundary | Completed/attempted | p50 | p95 | p99 | Errors | Max clock uncertainty | Comparison |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Outage, background, unsent and saturation

Receiver outage returns real HTTP 503 for 2.5 seconds; sender retry/backoff and receiver drain are retained. Background uses CDP to freeze one Chromium page for 2.5 seconds; the whole wave is conservatively separate. Unsent is an explicitly labelled 1.5-second harness dispatch hold, not a phone-storage durability test. Its unsent duration is stored outside commit-to-visible/applied time. Recovery starts when the injected condition is lifted. Zero recovery for an already-applied ERP observation during browser suspension means it finished before foregrounding, not a recovery speed claim.

| Run | Condition / boundary | Completed/attempted | p95 upper ms | Errors | Recovery p95 ms |
| --- | --- | --- | --- | --- | --- |
${faults.join('\n')}

Pool exhaustion is **injected**, separate from the natural ramp: ten independently held application-pool connections run pg_sleep(6). The observed pool is 10 total, zero idle, 29 waiting. Fifteen commands fail after the acquisition deadline, ten visible-observation samples inherit those failed actions, ten monitoring requests return 503, and one worker loop errors. There is no silent sample removal or fake zero latency. Client HTTP timeout counts are separate from these returned server errors. After release, polling and prior accepted state recover; diagnostics never declares committed work lost.

## Bottlenecks and change tested

The completed pre-change map-enabled baseline rebuilt MapLibre on replaced snapshot/current/selected props despite identical target geography. Its 866 tile-range requests dropped to 18 after preserving the map by target/road content and updating marker state in place. Same five-driver/two-observer/50-wave view p95 upper bound fell **1928.1 → 1095.2 ms**; ERP p95 was **412.9 → 393.0 ms**. ERP p99 varied upward. This is a single local before/after observation with host noise and slightly different clock bounds, not proof of a universal speedup. No polling reduction, provider stub, account cap, pool enlargement or purchase was introduced.

Actual browser findings: the original canvas survived repeated updates; click/keyboard selection updated marker styling; desktop and 390px mobile checks found no horizontal overflow in the stress walkthrough. Baseline and stress captures were visually reviewed with the actual RTL page/API. Map/recipient identities and commands are fixture-labelled, not Keycloak/physical-device acceptance. The natural high-concurrency ERP tail and injected pool waits are actionable: investigate sender/receiver scheduling, attempt timing and long transactions on the target before tuning. These observations do not isolate a CPU/I/O cause for every tail.

## HTTP errors, resources and limits

${runs.map(run=>`- ${run.profile}: ${run.http.count} observed API responses, ${run.http.errors} >=400 responses, ${run.workerErrorCount} worker-loop errors. Route/status breakdown, delivery attempt outcomes, queue/lease ages, process CPU/RSS, disk and pool snapshots are in the raw file. Two 401s per final run are intentional post-workload ordinary-ERP access-denial checks; they are retained and labelled.`).join('\n')}

Process timing is a rolling last-1024 distribution with lifetime counts; it is not the workload percentile table. Worker-loop observations mean at least one recent completed loop, not every worker healthy. Projection distance includes missing/unreported watermarks; report age is not projection latency. Backup readiness stays unverified. Resource snapshots are sparse observations and cannot establish absence of brief saturation; disk is the working-directory filesystem, not every data mount. Receiver HTTP failures during outage are in delivery attempt outcomes separately from API response counts.

## Failed and unrun checks

- Final map-recovery smoke passed after the load runs: four healthy view/ten ERP observations remain insufficient for a p95 claim; actual style-request network abort, fallback and bounded retry recovery passed. [Smoke evidence](performance/smoke.json) preserves the final short run separately.
- The default four-worker full verification was interrupted after new and existing integration failures; no full-suite pass is claimed. Serial investigation traced the diagnostic failure to the filesystem database-size scan exceeding 1.5 seconds. Size is now an optional nullable gauge isolated by a savepoint, preserving valid readiness/queue results. Production query budget remains unchanged. The repaired diagnostics/accounting/contracts run passed 457 tests; final regression/build results are recorded in the phase evidence.
- Initial missing ExcelJS installation was restored from the lockfile; no dependency upgrade. The npm shim used Node 25 during restoration; subsequent verification/load commands explicitly use bundled Node 24.
- First no-map-route baseline/ramp had 108/120 HTTP 404s. Retained as partial evidence, not full healthy UI results; corrected by registering the actual asset route and rerunning.
- An early map-enabled ramp stopped without a final report. Later the process was absent and PostgreSQL unavailable; exact interruption cause unknown. Restored the dedicated local cluster. No successful result is invented. The harness now bounds frame waits and journals samples/owned databases after each wave.
- A later completed-action ramp failed its post-load marker assertion because the harness assumed task-array order equalled database display order. The assertion now compares the selected list/marker ordinal; the ramp was repeated. Discarded run journals/logs remain under .local/performance; they are not pooled into final percentiles.
- Type/schema checks initially caught an overload typing error, a YAML colon needing quotes, an invalid-example missing keyword, and historical Phase 37 contract-test allowlists omitting implemented export paths/operations; repaired without weakening domain invariants.
- Target host inventory/capacity, live Engine versions/datasets and successful Engine ramp, backup restore/RPO/RTO, external WAN clocks, physical phones and owner acceptance remain unrun. No deployment or Phase 39 execution.

## Reproduce and inspect

Run the [owner diagnostic/runbook commands](../diagnostics.md) sequentially on supported Node 24. On this Windows host npm.cmd selects its adjacent Node 25, so verification used bundled Node directly for scripts/tools; when using npm, invoke its CLI with the supported node executable and put that directory first on PATH. Exact commands/results are in [phase evidence](../phase-38-evidence.md).

Raw final runs: [baseline](performance/baseline.json), [ramp](performance/ramp.json), [stress](performance/stress.json). [Checksummed manifest](performance/manifest.json), [before map reuse](performance/baseline-before-map-reuse.json), [live Engine failure](performance/engine-live.json). The original partial runs are [baseline without map route](performance/baseline-missing-map-route.json) and [ramp without map route](performance/ramp-missing-map-route.json). Each final run contains exact environment/workload, raw measured samples, errors, clocks, actual outage action/event/checkpoint trace, resource observations and explicit limitations.

Regenerate this report from fresh local files with node --import tsx scripts/performance-report.ts; it independently recalculates every summary from raw samples and rejects drift. Historical files must not be relabelled as a new run.
`;
await writeFile('docs/verification/performance.md',report);
console.log('Wrote verified raw-run copies, checksums and performance report.');
