/**
 * Entry for the standalone core bundle (`dist-core/astra-core.js`).
 * Exposes `AstraCore` on the global object so JavaScriptCore, a WebView or
 * Node can load one file with no module system.
 */
import { CORE_VERSION, createAstraCore, memoryStorage } from "./astraCore";

const api = { version: CORE_VERSION, create: createAstraCore, memoryStorage };

(globalThis as unknown as { AstraCore: typeof api }).AstraCore = api;

export { api as AstraCore };
