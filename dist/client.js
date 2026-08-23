/** An error the router (or the network) surfaced, with a message already fit to show the user. */
export class RouterApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
export function normalizeBaseUrl(url) {
    return url.trim().replace(/\/+$/, "");
}
/**
 * Strips any trailing `/v1` segment(s), however many. `options.baseURL` is round-tripped through
 * this plugin's own config: it's written as the `/v1`-suffixed value {@link toChatBaseUrl}
 * produces (see below), then read back on the next run as if it were the plain root. Without
 * this, that read-back would compound another `/v1` on every restart — this makes reading it
 * back idempotent regardless of how many times that's already happened.
 */
export function stripApiVersion(url) {
    let normalized = normalizeBaseUrl(url);
    while (normalized.toLowerCase().endsWith("/v1")) {
        normalized = normalizeBaseUrl(normalized.slice(0, -"/v1".length));
    }
    return normalized;
}
/**
 * `@ai-sdk/openai-compatible` builds request URLs as `${baseURL}${path}` with paths like
 * `/chat/completions` — it does NOT add a `/v1` prefix itself, unlike this file's own
 * `/v1/models/capabilities` calls. So the URL handed to the AI SDK provider (`options.baseURL`
 * in the provider config) needs the `/v1` suffix baked in, even though every other use of the
 * router's base URL in this plugin — including what the user types in — is just the host:port.
 * Stripping first makes this idempotent no matter how many times it's already been applied to
 * `root` in a previous run.
 */
export function toChatBaseUrl(root) {
    return `${stripApiVersion(root)}/v1`;
}
/**
 * Calls the router's `GET /v1/models/capabilities` extension endpoint — not the plain OpenAI
 * `/v1/models` list — since that's the only one that reports context size, tool-calling, vision
 * and reasoning-effort support per preset. That richer shape is what lets model capabilities be
 * populated automatically instead of requiring the user to describe every model by hand.
 */
export async function fetchModelCapabilities(baseURL, apiKey, timeoutMs = 5000) {
    const url = `${normalizeBaseUrl(baseURL)}/v1/models/capabilities`;
    const headers = {};
    if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
    }
    let response;
    try {
        response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new RouterApiError(`Could not reach ${url} (${message})`);
    }
    if (!response.ok) {
        throw new RouterApiError(await describeError(response), response.status);
    }
    const body = (await response.json());
    return body.data ?? [];
}
async function describeError(response) {
    try {
        const body = (await response.json());
        const message = body.error?.message ?? body.message;
        if (message) {
            return `${message} (HTTP ${response.status})`;
        }
    }
    catch {
        // Body wasn't JSON — fall through to a generic status-based message.
    }
    if (response.status === 401 || response.status === 403) {
        return "Invalid or missing API key.";
    }
    return `HTTP ${response.status} ${response.statusText}`;
}
