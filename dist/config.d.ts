import type { Auth } from "@opencode-ai/sdk/v2";
/**
 * Resolves the router's base URL in priority order: the connection saved via the interactive
 * `auth` flow, then an explicit `options.baseURL` in opencode.json, then the env var, then the
 * router's default API port (5054 — the admin UI's 5053 is a different port entirely).
 *
 * `options.baseURL` may already carry the `/v1` suffix this plugin itself wrote there for the AI
 * SDK provider (see `toChatBaseUrl`) — {@link stripApiVersion} strips it back off so this always
 * returns the plain root, regardless of what's stored.
 */
export declare function resolveBaseUrl(options: Record<string, unknown> | undefined, auth?: Auth): string;
/** Same priority order as {@link resolveBaseUrl}. The router only requires a key when the gateway's "Require API Key" is enabled. */
export declare function resolveApiKey(options: Record<string, unknown> | undefined, auth?: Auth): string | undefined;
