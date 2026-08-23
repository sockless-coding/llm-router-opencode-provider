import type { Hooks, Plugin } from "@opencode-ai/plugin";
import type { ProviderConfig } from "@opencode-ai/sdk";
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
import { fetchModelCapabilities, stripApiVersion, toChatBaseUrl } from "./client.js";
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
export const SocklessLlmRouterPlugin: Plugin = async (ctx) => {
	const hooks: Hooks = {
		config: async (cfg) => {
			cfg.provider ??= {};
			const existing = cfg.provider[PROVIDER_ID] ?? {};
			const baseURL = resolveBaseUrl(existing.options);
			const apiKey = resolveApiKey(existing.options);

			const options: Record<string, unknown> = { ...existing.options, baseURL: toChatBaseUrl(baseURL) };
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
						const baseURL = stripApiVersion(input.baseURL || DEFAULT_BASE_URL);
						const apiKey = input.apiKey?.trim() || undefined;
						try {
							// Best-effort reachability check — a router that's simply not running yet
							// shouldn't block saving the connection, since provider.models retries later.
							await fetchModelCapabilities(baseURL, apiKey);
						} catch {
							// Ignored — see above.
						}
						try {
							// Write straight into the live provider config so chat requests use this
							// connection immediately — the `config` hook has no visibility into
							// `ctx.auth`, so without this a base URL entered here would only ever reach
							// `provider.models` (used for model discovery) and never the AI SDK provider
							// that actually sends chat requests. Built lazily, here, rather than once at
							// the top of the plugin: `ctx.serverUrl` isn't necessarily populated every
							// time OpenCode invokes this plugin (e.g. while just listing providers), and
							// touching it unconditionally there took the whole plugin down with it.
							const options: Record<string, unknown> = { baseURL: toChatBaseUrl(baseURL) };
							if (apiKey) {
								options.apiKey = apiKey;
							}
							const client = createOpencodeClient({ baseUrl: ctx.serverUrl.toString(), throwOnError: true });
							await client.global.config.update({
								config: { provider: { [PROVIDER_ID]: { options } } },
							});
						} catch {
							// The connection is still saved via the returned auth result below even if
							// this live-config write fails (e.g. an older server without this endpoint);
							// it'll take effect on the next restart via the `config` hook instead.
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
