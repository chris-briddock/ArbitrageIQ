// Central config — override any value via k6 environment variables:
// k6 run -e BASE_URL=http://staging:5000 smoke.js

export const BASE_URL       = __ENV.BASE_URL        || 'http://localhost:5000';
export const IDENTITY_URL   = __ENV.IDENTITY_URL    || 'http://localhost:5100';
export const CATALOGUE_URL  = __ENV.CATALOGUE_URL   || 'http://localhost:5200';
export const TEST_EMAIL     = __ENV.TEST_EMAIL      || 'perf@arbitrageiq.com';
export const TEST_PASSWORD  = __ENV.TEST_PASSWORD   || 'PerfTest@1234!';

// Shared thresholds — import into any scenario that needs them
export const commonThresholds = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed:   ['rate<0.01'],
};
