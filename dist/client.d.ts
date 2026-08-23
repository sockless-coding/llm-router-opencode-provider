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
 * Calls the router's `GET /v1/models/capabilities` extension endpoint — not the plain OpenAI
 * `/v1/models` list — since that's the only one that reports context size, tool-calling, vision
 * and reasoning-effort support per preset. That richer shape is what lets model capabilities be
 * populated automatically instead of requiring the user to describe every model by hand.
 */
export declare function fetchModelCapabilities(baseURL: string, apiKey: string | undefined, timeoutMs?: number): Promise<RouterModelCapability[]>;
