import type { ProviderConfig } from "@opencode-ai/sdk";
import type { Model } from "@opencode-ai/sdk/v2";
import type { RouterModelCapability } from "./client.js";
import { OPENAI_COMPATIBLE_NPM } from "./constants.js";

/**
 * The `config` hook sees the plugin package's own `Config` type, which is built on
 * `@opencode-ai/sdk` (v1) — a plainer, non-optional-`modalities`, no-`variants` shape than the
 * `Model` (v2) type below that `provider.models()` returns. Both are kept here so the config
 * hook can do a same-tick best-effort registration while the provider hook stays the rich,
 * authoritative source once OpenCode calls it.
 */
type ProviderConfigModel = NonNullable<ProviderConfig["models"]>[string];

function contextAndOutput(cap: RouterModelCapability): { context: number; output: number } {
	const context = cap.context_length > 0 ? cap.context_length : 4096;
	const output = Math.max(1, Math.min(cap.max_output_tokens || context, context - 1));
	return { context, output };
}

function reasoningVariants(cap: RouterModelCapability): Record<string, { reasoningEffort: string }> | undefined {
	if (!cap.reasoning_effort_options || cap.reasoning_effort_options.length === 0) {
		return undefined;
	}
	return Object.fromEntries(cap.reasoning_effort_options.map((effort) => [effort, { reasoningEffort: effort }]));
}

function extraOptions(cap: RouterModelCapability): Record<string, unknown> | undefined {
	if (!cap.parameter_size && !cap.quantization) {
		return undefined;
	}
	const options: Record<string, unknown> = {};
	if (cap.parameter_size) options.parameter_size = cap.parameter_size;
	if (cap.quantization) options.quantization = cap.quantization;
	return options;
}

/**
 * Maps a router capability entry to the declarative shape used in `opencode.json`'s
 * `provider.<id>.models` block — this is what the `config` hook writes at config-load time.
 * The router reports no pricing (it's a local gateway, not a paid API), so `cost` is left unset.
 * This shape has no `variants` field, so reasoning-effort options only surface once the richer
 * `provider.models()` hook (see {@link toModel}) refreshes the catalog.
 */
export function toProviderConfigModel(cap: RouterModelCapability): ProviderConfigModel {
	const { context, output } = contextAndOutput(cap);
	const options = extraOptions(cap);
	return {
		name: cap.name || cap.id,
		temperature: true,
		reasoning: cap.supports_reasoning_effort ?? false,
		tool_call: cap.tool_calling ?? false,
		attachment: cap.vision ?? false,
		limit: { context, output },
		modalities: {
			input: cap.vision ? ["text", "image"] : ["text"],
			output: ["text"],
		},
		status: "active",
		...(options ? { options } : {}),
	};
}

export function toProviderConfigModelMap(capabilities: RouterModelCapability[]): NonNullable<ProviderConfig["models"]> {
	const result: NonNullable<ProviderConfig["models"]> = {};
	for (const cap of capabilities) {
		result[cap.id] = toProviderConfigModel(cap);
	}
	return result;
}

/**
 * Maps a router capability entry to the full runtime `Model` shape returned by the
 * `provider.models()` hook. `template` (the model's previous entry, if any) carries forward
 * fields the router doesn't report, mirroring how the built-in Modal provider plugin merges a
 * freshly-fetched model list onto whatever was already known.
 */
export function toModel(cap: RouterModelCapability, providerID: string, baseURL: string, template?: Model): Model {
	const { context, output } = contextAndOutput(cap);
	const variants = reasoningVariants(cap) ?? template?.variants;
	return {
		id: cap.id,
		providerID,
		api: {
			id: cap.id,
			url: baseURL,
			npm: template?.api.npm ?? OPENAI_COMPATIBLE_NPM,
		},
		name: cap.name || cap.id,
		family: template?.family,
		capabilities: {
			temperature: true,
			reasoning: cap.supports_reasoning_effort ?? false,
			attachment: cap.vision ?? false,
			toolcall: cap.tool_calling ?? false,
			input: {
				text: true,
				audio: false,
				image: cap.vision ?? false,
				video: false,
				pdf: false,
			},
			output: {
				text: true,
				audio: false,
				image: false,
				video: false,
				pdf: false,
			},
			interleaved: false,
		},
		cost: {
			input: 0,
			output: 0,
			cache: { read: 0, write: 0 },
		},
		limit: { context, output },
		status: template?.status ?? "active",
		options: { ...template?.options, ...extraOptions(cap) },
		headers: { ...template?.headers },
		release_date: template?.release_date ?? "",
		...(variants ? { variants } : {}),
	};
}

export function toModelMap(
	capabilities: RouterModelCapability[],
	providerID: string,
	baseURL: string,
	existing: Record<string, Model> = {}
): Record<string, Model> {
	const result: Record<string, Model> = {};
	for (const cap of capabilities) {
		result[cap.id] = toModel(cap, providerID, baseURL, existing[cap.id]);
	}
	return result;
}
