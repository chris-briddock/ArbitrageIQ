import { HttpGateway } from "./http";
import { MockStore } from "./mock/store";
import type { Gateway } from "./types";

export { GatewayError } from "./types";
export type * from "./types";

declare global {
  // Module-scoped singleton must survive HMR reloads in dev.
   
  var __arbiqGateway: Gateway | undefined;
}

/**
 * Returns the process-wide gateway client. GATEWAY_MODE=real switches to the
 * YARP HTTP gateway (API_GATEWAY_URL required); the default is the in-memory
 * mock, kept on globalThis so dev-server hot reloads preserve state.
 */
export function getGateway(): Gateway {
  if (process.env.GATEWAY_MODE === "real") {
    const baseUrl = process.env.API_GATEWAY_URL;
    if (!baseUrl) {
      throw new Error("API_GATEWAY_URL must be set when GATEWAY_MODE=real.");
    }

    return new HttpGateway(baseUrl);
  }

  globalThis.__arbiqGateway ??= new MockStore();
  return globalThis.__arbiqGateway;
}

/** The mock store, or null in real-gateway mode. Used by /api/demo/* only. */
export function getMockStore(): MockStore | null {
  const gateway = getGateway();
  return gateway instanceof MockStore ? gateway : null;
}

/** Re-seeds the demo: replaces the mock singleton with a pristine store. */
export function resetMockStore(): boolean {
  if (process.env.GATEWAY_MODE === "real") {
    return false;
  }

  globalThis.__arbiqGateway = new MockStore();
  return true;
}
