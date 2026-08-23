import type { Hooks, Plugin } from "@opencode-ai/plugin";
import type { ProviderConfig } from "@opencode-ai/sdk";
import { fetchModelCapabilities, normalizeBaseUrl } from "./client.js";
import { resolveApiKey, resolveBaseUrl } from "./config.js";
import { DEFAULT_BASE_URL, ENV_API_KEY, OPENAI_COMPATIBLE_NPM, PROVIDER_ID, PROVIDER_NAME } from "./constants.js";
import { toModelMap, toProviderConfigModelMap } from "./models.js";

/**
 * Registers the Sockless LLM Router as an OpenCode provider and keeps its model list in sync
 * with the router's `/v1/models/capabilities` endpoint, so pointing this plugin at a router is
 * enough for every configured preset — and its context size, tool-calling, vision and reasoning
 * support — to show up with no manual per-model config.
 *
 * Three hooks work together:
 * - `config` populates the provider (and probes the model list) the moment opencode.json loads,
 *   so a router reachable via env vars or an already-saved connection needs no extra step.
 * - `auth` is the interactive path (`opencode auth login`) for entering the router's URL and an
 *   optional API key when one isn't set via env vars.
 * - `provider.models` refreshes the model list on demand using whatever connection is active
 *   (env vars, opencode.json options, or the saved auth), the same way OpenCode's own
 *   Modal/DigitalOcean provider plugins keep their catalogs current.
 */
export const SocklessLlmRouterPlugin: Plugin = async () => {
	const hooks: Hooks = {
		config: async (cfg) => {
			cfg.provider ??= {};
			const existing = cfg.provider[PROVIDER_ID] ?? {};
			const baseURL = resolveBaseUrl(existing.options);
			const apiKey = resolveApiKey(existing.options);

			const options: Record<string, unknown> = { ...existing.options, baseURL };
			if (apiKey) {
				options.apiKey = apiKey;
			}

			let models = existing.models;
			try {
				const capabilities = await fetchModelCapabilities(baseURL, apiKey);
				if (capabilities.length > 0) {
					models = { ...existing.models, ...toProviderConfigModelMap(capabilities) } as NonNullable<
						ProviderConfig["models"]
					>;
				}
			} catch {
				// Router not reachable at config-load time (e.g. not started yet) — keep whatever
				// models are already declared; provider.models retries later with live auth.
			}

			cfg.provider[PROVIDER_ID] = {
				...existing,
				name: existing.name ?? PROVIDER_NAME,
				npm: existing.npm ?? OPENAI_COMPATIBLE_NPM,
				env: existing.env ?? [ENV_API_KEY],
				options,
				...(models ? { models } : {}),
			};
		},

		auth: {
			provider: PROVIDER_ID,
			methods: [
				{
					type: "api",
					label: "Connect to Sockless LLM Router",
					prompts: [
						{
							type: "text",
							key: "baseURL",
							message: "Router API base URL (the API port, not the admin UI)",
							placeholder: DEFAULT_BASE_URL,
							validate(value) {
								if (!value) return undefined;
								try {
									const url = new URL(value);
									if (url.protocol !== "http:" && url.protocol !== "https:") {
										return "Enter a valid http:// or https:// URL";
									}
								} catch {
									return "Enter a valid http:// or https:// URL";
								}
								return undefined;
							},
						},
						{
							type: "text",
							key: "apiKey",
							message: "API key (optional — only needed if the router requires one)",
							placeholder: "leave blank if not required",
						},
					],
					async authorize(input = {}) {
						const baseURL = normalizeBaseUrl(input.baseURL || DEFAULT_BASE_URL);
						const apiKey = input.apiKey?.trim() || undefined;
						try {
							// Best-effort reachability check — a router that's simply not running yet
							// shouldn't block saving the connection, since provider.models retries later.
							await fetchModelCapabilities(baseURL, apiKey);
						} catch {
							// Ignored — see above.
						}
						return {
							type: "success" as const,
							provider: PROVIDER_ID,
							key: apiKey ?? "",
							metadata: { baseURL },
						};
					},
				},
			],
		},

		provider: {
			id: PROVIDER_ID,
			async models(provider, ctx) {
				const baseURL = resolveBaseUrl(provider.options, ctx.auth);
				const apiKey = resolveApiKey(provider.options, ctx.auth);
				try {
					const capabilities = await fetchModelCapabilities(baseURL, apiKey);
					return toModelMap(capabilities, PROVIDER_ID, baseURL, provider.models);
				} catch {
					return {};
				}
			},
		},
	};

	return hooks;
};

export default SocklessLlmRouterPlugin;
