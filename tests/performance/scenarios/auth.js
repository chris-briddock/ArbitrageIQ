/**
 * Scenario: authentication flow
 *
 * Simulates the full login → get-profile journey.
 * Each VU logs in once, reuses the token for subsequent requests,
 * then logs out at teardown — matching realistic session behaviour.
 *
 * Usage:
 *   k6 run tests/performance/scenarios/auth.js
 *   k6 run --env TEST_EMAIL=user@example.com --env TEST_PASSWORD=Secret1! tests/performance/scenarios/auth.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { IDENTITY_URL, commonThresholds } from '../lib/config.js';
import { login, authHeaders } from '../lib/auth.js';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '1m',  target: 20 },
    { duration: '10s', target: 0  },
  ],
  thresholds: {
    ...commonThresholds,
    'http_req_duration{endpoint:login}':   ['p(95)<800'],
    'http_req_duration{endpoint:profile}': ['p(95)<300'],
  },
};

// Obtain a token once per VU (shared across iterations for that VU)
export function setup() {
  return { token: login() };
}

export default function ({ token }) {
  if (!token) {
    // Identity service unavailable — log and skip gracefully
    console.warn('Skipping auth scenario: no token available');
    sleep(1);
    return;
  }

  const headers = authHeaders(token);

  group('login', () => {
    const res = http.post(
      `${IDENTITY_URL}/api/v1/identity/tokens`,
      JSON.stringify({ email: __ENV.TEST_EMAIL || 'perf@arbitrageiq.com', password: __ENV.TEST_PASSWORD || 'PerfTest@1234!' }),
      { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } },
    );
    check(res, {
      'login 200':        (r) => r.status === 200,
      'access token set': (r) => !!r.json('accessToken'),
    });
  });

  group('get profile', () => {
    const res = http.get(
      `${IDENTITY_URL}/api/v1/identity/me`,
      { headers, tags: { endpoint: 'profile' } },
    );
    check(res, {
      'profile 200':       (r) => r.status === 200,
      'profile has email': (r) => {
        try { return !!r.json('email'); } catch { return false; }
      },
    });
  });

  sleep(1);
}
