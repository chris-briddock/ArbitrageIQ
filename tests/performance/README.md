# ArbitrageIQ — k6 Performance Tests

## Prerequisites

```bash
# macOS
brew install k6

# Docker (no install needed)
docker run --rm -i grafana/k6 run - < scenarios/health.js
```

## Running tests

```bash
cd tests/performance

# Smoke — quick sanity check (5 VUs, 20 s)
k6 run scenarios/health.js

# Load — default profile (ramp to 50 VUs, 1 m sustained)
k6 run scenarios/catalogue.js

# Stress — override profile
k6 run --env PROFILE=stress scenarios/catalogue.js

# Auth flow
k6 run scenarios/auth.js

# Soak — 30 minutes at moderate load
k6 run scenarios/soak.js
```

## Overriding targets

All base URLs and credentials come from `lib/config.js` and can be overridden via environment variables:

```bash
k6 run \
  -e BASE_URL=http://staging.arbitrageiq.internal \
  -e IDENTITY_URL=http://identity.staging.internal \
  -e CATALOGUE_URL=http://catalogue.staging.internal \
  scenarios/catalogue.js
```

## Profiles

| Profile | VUs | Duration |
|---------|-----|----------|
| `smoke`  | 5   | 20 s     |
| `load`   | 50  | ~80 s    |
| `stress` | 200 | ~160 s   |

Pass `--env PROFILE=<name>` to any scenario that supports profiles.

## Thresholds

All scenarios share the base thresholds from `lib/config.js`:

- `p(95) < 500 ms`
- `p(99) < 1500 ms`
- `error rate < 1 %`

A non-zero exit code from k6 means at least one threshold was breached.
