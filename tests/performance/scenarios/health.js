/**
 * Scenario: health-check smoke test
 *
 * Hits the /health endpoint on every service through the API Gateway.
 * Run this before any load test to confirm services are up.
 *
 * Usage:
 *   k6 run tests/performance/scenarios/health.js
 *   k6 run -e BASE_URL=http://staging:5000 tests/performance/scenarios/health.js
 */
import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, IDENTITY_URL, CATALOGUE_URL, commonThresholds } from '../lib/config.js';

export const options = {
  vus: 5,
  duration: '20s',
  thresholds: {
    ...commonThresholds,
    // Health endpoints must always respond quickly
    'http_req_duration{endpoint:health}': ['p(99)<200'],
  },
};

const SERVICES = [
  { name: 'api-gateway', url: `${BASE_URL}/health` },
  { name: 'identity',    url: `${IDENTITY_URL}/health` },
  { name: 'catalogue',   url: `${CATALOGUE_URL}/health` },
];

export default function () {
  for (const svc of SERVICES) {
    group(svc.name, () => {
      const res = http.get(svc.url, { tags: { endpoint: 'health', service: svc.name } });
      check(res, {
        [`${svc.name} status 200`]: (r) => r.status === 200,
      });
    });
  }
}
