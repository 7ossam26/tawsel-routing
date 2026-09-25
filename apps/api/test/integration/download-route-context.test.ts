import { expect, test } from 'vitest';
import { createTestDatabase } from '../support/database.js';
import { prepareAccessFixture, ids, principals } from '../support/access-fixture.js';
import { intake, draft, providerFixture } from '../support/planning-fixture.js';
import { runPlanningOnce } from '../../src/planning/worker.js';
import { PlanningService } from '../../src/planning/service.js';

test.each([200, 503])('P33 stores optional verified route context with the immutable plan; controlled OSRM HTTP %s', async status => {
  const db = await createTestDatabase(), provider = await providerFixture(status === 503 ? { roadStatus: status } : {});
  try {
    await prepareAccessFixture(db.pool); await intake(db.pool); await intake(db.pool, 1); await draft(db.pool);
    await runPlanningOnce(db.pool, provider.engine);
    const plan = (await new PlanningService(db.pool).plans(principals.personal, ids.personalDriver)).items[0]!;
    expect(plan.state).toBe('ready');
    if (status === 200) {
      expect(plan.routePolicy?.roadRoute?.geometrySource).toBe('osrm-road');
      expect(plan.routePolicy?.roadRoute?.geometry).toEqual([plan.input.settings!.origin.coordinates, ...plan.candidate!.visits.map(visit => visit.coordinates)]);
      expect(plan.routePolicy?.roadRoute?.legs).toHaveLength(2);
    } else expect(plan.routePolicy?.roadRoute).toBeNull();
    expect(plan.forecast.members).toHaveLength(2);
    // Independent new DB service read sees the committed context, no in-memory cache.
    expect((await db.pool.query('SELECT route_policy FROM tawsel.plan_revisions WHERE plan_id=$1', [plan.planId])).rows[0].route_policy).toEqual(plan.routePolicy);
  } finally { await provider.close(); await db.close(); }
});
