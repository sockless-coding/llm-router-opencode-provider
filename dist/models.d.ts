import type { ProviderConfig } from "@opencode-ai/sdk";
import type { Model } from "@opencode-ai/sdk/v2";
import type { RouterModelCapability } from "./client.js";
/**
 * The `config` hook sees the plugin package's own `Config` type, which is built on
 * `@opencode-ai/sdk` (v1) — a plainer, non-optional-`modalities`, no-`variants` shape than the
 * `Model` (v2) type below that `provider.models()` returns. Both are kept here so the config
 * hook can do a same-tick best-effort registration while the provider hook stays the rich,
 * authoritative source once OpenCode calls it.
 */
type ProviderConfigModel = NonNullable<ProviderConfig["models"]>[string];
/**
 * Maps a router capability entry to the declarative shape used in `opencode.json`'s
 * `provider.<id>.models` block — this is what the `config` hook writes at config-load time.
 * The router reports no pricing (it's a local gateway, not a paid API), so `cost` is left unset.
 * This shape has no `variants` field, so reasoning-effort options only surface once the richer
 * `provider.models()` hook (see {@link toModel}) refreshes the catalog.
 */
export declare function toProviderConfigModel(cap: RouterModelCapability): ProviderConfigModel;
export declare function toProviderConfigModelMap(capabilities: RouterModelCapability[]): NonNullable<ProviderConfig["models"]>;
/**
 * Maps a router capability entry to the full runtime `Model` shape returned by the
 * `provider.models()` hook. `template` (the model's previous entry, if any) carries forward
 * fields the router doesn't report, mirroring how the built-in Modal provider plugin merges a
 * freshly-fetched model list onto whatever was already known.
 */
export declare function toModel(cap: RouterModelCapability, providerID: string, baseURL: string, template?: Model): Model;
export declare function toModelMap(capabilities: RouterModelCapability[], providerID: string, baseURL: string, existing?: Record<string, Model>): Record<string, Model>;
export {};
