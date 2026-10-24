/**
 * Stops what a kept end-to-end run left running (E2E_KEEP=1 npm run test:e2e): the servers, the fakes,
 * and the run's own database (tests/e2e/global-teardown.ts, which only drops adminspace_e2e_<hex>).
 *
 *   npx tsx scripts/e2e-teardown.ts
 */
import teardown from "../tests/e2e/global-teardown";

delete process.env.E2E_KEEP;
await teardown();
