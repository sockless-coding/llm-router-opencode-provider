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
export class RouterApiError extends Error {
	constructor(message: string, readonly status?: number) {
		super(message);
	}
}

export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, "");
}

/**
 * Calls the router's `GET /v1/models/capabilities` extension endpoint — not the plain OpenAI
 * `/v1/models` list — since that's the only one that reports context size, tool-calling, vision
 * and reasoning-effort support per preset. That richer shape is what lets model capabilities be
 * populated automatically instead of requiring the user to describe every model by hand.
 */
export async function fetchModelCapabilities(
	baseURL: string,
	apiKey: string | undefined,
	timeoutMs = 5000
): Promise<RouterModelCapability[]> {
	const url = `${normalizeBaseUrl(baseURL)}/v1/models/capabilities`;
	const headers: Record<string, string> = {};
	if (apiKey) {
		headers["Authorization"] = `Bearer ${apiKey}`;
	}

	let response: Response;
	try {
		response = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new RouterApiError(`Could not reach ${url} (${message})`);
	}

	if (!response.ok) {
		throw new RouterApiError(await describeError(response), response.status);
	}

	const body = (await response.json()) as { data?: RouterModelCapability[] };
	return body.data ?? [];
}

async function describeError(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { error?: { message?: string }; message?: string };
		const message = body.error?.message ?? body.message;
		if (message) {
			return `${message} (HTTP ${response.status})`;
		}
	} catch {
		// Body wasn't JSON — fall through to a generic status-based message.
	}
	if (response.status === 401 || response.status === 403) {
		return "Invalid or missing API key.";
	}
	return `HTTP ${response.status} ${response.statusText}`;
}
