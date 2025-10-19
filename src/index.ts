/**
 * Barrel file for carbon-token-deployment-tool-ts
 *
 * Re-exports config utilities and the CLI entrypoint so consumers can:
 *  - import { loadConfig, Config } from 'carbon-token-deployment-tool-ts'
 *  - import { main } from 'carbon-token-deployment-tool-ts'      (to run CLI programmatically)
 *
 * This file is intentionally small — it simply re-exports the pieces implemented
 * in `src/config.ts` and `src/cli.ts`.
 */

export { default as loadConfig } from "./config";

export type { Config } from "./config";

// Export the CLI entrypoint (default export from ./cli)
export { default as main } from "./cli";
