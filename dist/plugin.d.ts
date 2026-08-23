import type { Plugin } from "@opencode-ai/plugin";
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
export declare const SocklessLlmRouterPlugin: Plugin;
export default SocklessLlmRouterPlugin;
