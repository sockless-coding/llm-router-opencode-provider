/** A router preset's context size, output budget, and capability flags — the `/v1/models/capabilities` wire shape. */
export interface RouterModelCapability {
    id: string;
    name: string;
    context_length: number;
    max_output_tokens: number;
    vision: boolean;
    tool_calling: boolean;
    parameter_size?: string;
    quantization?: string;
    /** Whether this preset's chat template reads a reasoning-effort-style variable. */
    supports_reasoning_effort?: boolean;
    /** The effort this preset is launched with by default, if configured. */
    reasoning_effort?: string | null;
    /** Discrete effort levels the chat template gates on, e.g. ["low", "medium", "high"]. */
    reasoning_effort_options?: string[];
}
/** An error the router (or the network) surfaced, with a message already fit to show the user. */
export declare class RouterApiError extends Error {
    readonly status?: number | undefined;
    constructor(message: string, status?: number | undefined);
}
export declare function normalizeBaseUrl(url: string): string;
/**
 * `@ai-sdk/openai-compatible` builds request URLs as `${baseURL}${path}` with paths like
 * `/chat/completions` — it does NOT add a `/v1` prefix itself, unlike this file's own
 * `/v1/models/capabilities` calls. So the URL handed to the AI SDK provider (`options.baseURL`
 * in the provider config) needs the `/v1` suffix baked in, even though every other use of the
 * router's base URL in this plugin — including what the user types in — is just the host:port.
 */
export declare function toChatBaseUrl(root: string): string;
/**
 * Calls the router's `GET /v1/models/capabilities` extension endpoint — not the plain OpenAI
 * `/v1/models` list — since that's the only one that reports context size, tool-calling, vision
 * and reasoning-effort support per preset. That richer shape is what lets model capabilities be
 * populated automatically instead of requiring the user to describe every model by hand.
 */
export declare function fetchModelCapabilities(baseURL: string, apiKey: string | undefined, timeoutMs?: number): Promise<RouterModelCapability[]>;
