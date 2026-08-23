import { DEFAULT_BASE_URL, ENV_API_KEY, ENV_BASE_URL } from "./constants.js";
import { normalizeBaseUrl } from "./client.js";
/**
 * Resolves the router's base URL in priority order: the connection saved via the interactive
 * `auth` flow, then an explicit `options.baseURL` in opencode.json, then the env var, then the
 * router's default API port (5054 — the admin UI's 5053 is a different port entirely).
 */
export function resolveBaseUrl(options, auth) {
    const fromAuth = auth?.type === "api" ? auth.metadata?.baseURL : undefined;
    const fromOptions = typeof options?.baseURL === "string" ? options.baseURL : undefined;
    const fromEnv = process.env[ENV_BASE_URL];
    return normalizeBaseUrl(fromAuth || fromOptions || fromEnv || DEFAULT_BASE_URL);
}
/** Same priority order as {@link resolveBaseUrl}. The router only requires a key when the gateway's "Require API Key" is enabled. */
export function resolveApiKey(options, auth) {
    if (auth?.type === "api" && auth.key) {
        return auth.key;
    }
    if (typeof options?.apiKey === "string" && options.apiKey.length > 0) {
        return options.apiKey;
    }
    return process.env[ENV_API_KEY];
}
