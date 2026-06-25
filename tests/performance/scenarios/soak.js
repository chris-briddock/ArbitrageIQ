/**
 * Scenario: soak test
 *
 * Runs a representative mixed workload at moderate concurrency for an extended
 * period to surface memory leaks, connection pool exhaustion, and slow degradation.
 *
 * Usage:
 *   k6 run tests/performance/scenarios/soak.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, CATALOGUE_URL, commonThresholds } from '../lib/config.js';

export const options = {
  stages: [
    { duration: '2m',  target: 25 },   // ramp up slowly
    { duration: '30m', target: 25 },   // soak at moderate load
    { duration: '2m',  target: 0  },   // ramp down
  ],
  thresholds: {
    ...commonThresholds,
    // Soak: latency must stay stable over the full run (not just on average)
    'http_req_duration': ['p(95)<600'],
  },
};

export default function () {
  // Health ping
  group('health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  sleep(0.5);

  // Catalogue browse
  group('catalogue', () => {
    const res = http.get(`${CATALOGUE_URL}/api/v1/catalogue/opportunities?page=1&size=25`);
    check(res, { 'catalogue 200': (r) => r.status === 200 });
  });

  sleep(1);
}
