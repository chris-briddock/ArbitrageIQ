import http from 'k6/http';
import { check } from 'k6';
import { IDENTITY_URL, TEST_EMAIL, TEST_PASSWORD } from './config.js';

const LOGIN_URL = `${IDENTITY_URL}/api/v1/identity/tokens`;

/**
 * Obtains a Bearer token for the performance test user.
 * Call this once in setup() and share the token across VUs.
 * Returns null when the identity service is unreachable (graceful degradation).
 */
export function login() {
  const res = http.post(
    LOGIN_URL,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const ok = check(res, {
    'login 200':    (r) => r.status === 200,
    'token present': (r) => {
      try { return !!r.json('accessToken'); } catch { return false; }
    },
  });

  if (!ok) {
    console.warn(`login failed: ${res.status} — authenticated scenarios will be skipped`);
    return null;
  }

  return res.json('accessToken');
}

/** Returns a headers object with a Bearer token included. */
export function authHeaders(token) {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
