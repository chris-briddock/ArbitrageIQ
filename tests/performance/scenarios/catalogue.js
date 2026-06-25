/**
 * Scenario: catalogue browsing — read-heavy workload
 *
 * Models a user browsing arbitrage opportunities: list → detail → filter.
 * 80 % of requests are paginated list calls; 20 % are single-item detail fetches.
 *
 * Usage:
 *   k6 run tests/performance/scenarios/catalogue.js
 *   k6 run --env PROFILE=stress tests/performance/scenarios/catalogue.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { CATALOGUE_URL, commonThresholds } from '../lib/config.js';

const PROFILE = __ENV.PROFILE || 'load';

const profiles = {
  smoke: {
    stages: [{ duration: '20s', target: 5 }],
  },
  load: {
    stages: [
      { duration: '10s', target: 50  },   // ramp up
      { duration: '1m',  target: 50  },   // sustain
      { duration: '10s', target: 0   },   // ramp down
    ],
  },
  stress: {
    stages: [
      { duration: '10s', target: 100000 },
      { duration: '2m',  target: 200000 },
      { duration: '30s', target: 0   },
    ],
  },
};

export const options = {
  stages: (profiles[PROFILE] ?? profiles.load).stages,
  thresholds: {
    ...commonThresholds,
    'http_req_duration{endpoint:list}':   ['p(95)<400'],
    'http_req_duration{endpoint:detail}': ['p(95)<300'],
  },
};

const PAGES  = [1, 2, 3, 4, 5];
const SIZES  = [10, 25, 50];
const DEMO_ID = 'demo-opportunity-1';

export default function () {
  const isDetail = Math.random() < 0.2;

  if (isDetail) {
    group('opportunity detail', () => {
      const res = http.get(
        `${CATALOGUE_URL}/api/v1/catalogue/opportunities/${DEMO_ID}`,
        { tags: { endpoint: 'detail' } },
      );
      check(res, {
        'detail status 200': (r) => r.status === 200,
        'detail has body':   (r) => r.body.length > 0,
      });
    });
  } else {
    const page = PAGES[Math.floor(Math.random() * PAGES.length)];
    const size = SIZES[Math.floor(Math.random() * SIZES.length)];

    group('opportunity list', () => {
      const res = http.get(
        `${CATALOGUE_URL}/api/v1/catalogue/opportunities?page=${page}&size=${size}`,
        { tags: { endpoint: 'list' } },
      );
      check(res, {
        'list status 200':    (r) => r.status === 200,
        'list returns array': (r) => {
          try { return Array.isArray(r.json()); } catch { return false; }
        },
      });
    });
  }

  sleep(1);
}
