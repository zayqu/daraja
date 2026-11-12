import { azamPayAvailability } from "./azampay-core.mjs";

/**
 * Separate opt-in for PRIVATE sandbox route exposure, never for production.
 * No checkout or callback route may run merely because AZAMPAY_ENABLED=true.
 */
export function sandboxRoutesAvailable(env = process.env) {
  const availability = azamPayAvailability(env);
  return availability.enabled &&
    availability.mode === "sandbox" &&
    env.AZAMPAY_SANDBOX_ROUTES_ENABLED === "true" &&
    env.AZAMPAY_SANDBOX_DEPLOYMENT_APPROVED === "true";
}
