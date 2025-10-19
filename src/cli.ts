import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import loadConfig, { Config } from "./config";
import { createToken, createTokenCfg } from "./actions/createToken";
import { createSeries, createSeriesCfg } from "./actions/createSeries";
import { mintNftToken, mintNftTokenCfg } from "./actions/mintNftToken";

/**
 * CLI for carbon-token-deployment-tool-ts.
 *
 * Modes:
 *  - CLI one-shot: use flags to perform actions immediately
 *  - TOML-driven: use `--config` or default `config.toml` for config values
 *
 * Actions:
 *  - create-token
 *  - create-series
 *  - mint-nft
 */

function requireArg<T>(
  value: T,
  name: string,
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`${name} is required`);
  }
}

/* ----------------------------- Actions ----------------------------- */
async function actionCreateToken(cfg: Config, dryRun: boolean) {
  requireArg(cfg.rpc, "rpc");
  requireArg(cfg.nexus, "nexus");
  requireArg(cfg.wif, "wif");
  requireArg(cfg.symbol, "symbol");
  requireArg(cfg.gasFeeBase, "gas_fee_base");
  requireArg(cfg.gasFeeCreateTokenBase, "gas_fee_create_token_base");
  requireArg(cfg.gasFeeCreateTokenSymbol, "gas_fee_create_token_symbol");
  requireArg(cfg.gasFeeMultiplier, "gas_fee_multiplier");
  requireArg(cfg.createTokenMaxData, "create_token_max_data");

  await createToken(
    new createTokenCfg(
      cfg.rpc,
      cfg.nexus,
      cfg.wif,
      cfg.symbol,
      cfg.gasFeeBase,
      cfg.gasFeeCreateTokenBase,
      cfg.gasFeeCreateTokenSymbol,
      cfg.gasFeeMultiplier,
      cfg.createTokenMaxData,
      cfg.tokenMetadataFields,
    ),
    dryRun,
  );
}

async function actionCreateSeries(cfg: Config, dryRun: boolean) {
  requireArg(cfg.rpc, "rpc");
  requireArg(cfg.nexus, "nexus");
  requireArg(cfg.wif, "wif");
  requireArg(cfg.carbonTokenId, "carbon_token_id");
  requireArg(cfg.gasFeeBase, "gas_fee_base");
  requireArg(cfg.gasFeeCreateTokenSeries, "gas_fee_create_token_series");
  requireArg(cfg.gasFeeMultiplier, "gas_fee_multiplier");
  requireArg(cfg.createTokenSeriesMaxData, "create_token_series_max_data");

  await createSeries(
    new createSeriesCfg(
      cfg.rpc,
      cfg.nexus,
      cfg.wif,
      cfg.carbonTokenId,
      cfg.gasFeeBase,
      cfg.gasFeeCreateTokenSeries,
      cfg.gasFeeMultiplier,
      cfg.createTokenSeriesMaxData,
    ),
    dryRun,
  );
}

async function actionMintNft(cfg: Config, dryRun: boolean) {
  requireArg(cfg.rpc, "rpc");
  requireArg(cfg.nexus, "nexus");
  requireArg(cfg.wif, "wif");
  requireArg(cfg.carbonTokenId, "carbon_token_id");
  requireArg(cfg.carbonTokenSeriesId, "carbon_token_series_id");
  requireArg(cfg.nftName, "nft_name");
  requireArg(cfg.nftDescription, "nft_description");
  requireArg(cfg.nftImageUrl, "nft_image_url");
  requireArg(cfg.nftInfoUrl, "nft_info_url");
  requireArg(cfg.nftRoyalties, "nft_royalties");
  requireArg(cfg.gasFeeBase, "gas_fee_base");
  requireArg(cfg.gasFeeMultiplier, "gas_fee_multiplier");
  requireArg(cfg.mintTokenMaxData, "mint_token_max_data");

  await mintNftToken(
    new mintNftTokenCfg(
      cfg.rpc,
      cfg.nexus,
      cfg.wif,
      cfg.carbonTokenId,
      cfg.carbonTokenSeriesId,
      cfg.nftName,
      cfg.nftDescription,
      cfg.nftImageUrl,
      cfg.nftInfoUrl,
      cfg.nftRoyalties,
      cfg.gasFeeBase,
      cfg.gasFeeMultiplier,
      cfg.mintTokenMaxData,
    ),
    dryRun,
  );
}

/* ------------------------------- Main ------------------------------- */

async function main() {
  // Pre-parse --config early so the TOML file can be loaded before the main yargs parsing.
  const pre = yargs(hideBin(process.argv))
    .option("config", {
      type: "string",
      alias: "c",
      description: "Path to TOML config file (default: config.toml)",
    })
    .help(false)
    .parseSync();

  // Load TOML configuration (if present) before doing full parsing
  const cfg = loadConfig({ configPath: pre.config ?? null });

  // Minimal yargs parsing for the top-level CLI behavior
  const argv = await yargs(hideBin(process.argv))
    .scriptName("carbon-token-deployment-tool-ts")
    .usage("Usage: $0 [options] [--create-token|--mint-nft|--transfer]")
    .option("rpc", { type: "string", describe: "RPC endpoint" })
    .option("nexus", { type: "string", describe: "Chain nexus" })
    .option("wif", { type: "string", describe: "WIF for signing" })
    .option("symbol", { type: "string", describe: "Token symbol" })
    .option("token-metadata-fields", {
      type: "string",
      describe: "JSON string with token metadata fields",
    })
    .option("nft-name", { type: "string", describe: "NFT metadata name" })
    .option("dry-run", {
      type: "boolean",
      describe: "Do not broadcast transactions; just show payloads",
    })
    .option("config", {
      type: "string",
      describe:
        "Path to TOML config file (default: config.toml). Takes precedence as the file used for defaults.",
    })
    .option("create-token", { type: "boolean", describe: "Create a token" })
    .option("create-series", {
      type: "boolean",
      describe: "Create a token series",
    })
    .option("mint-nft", { type: "boolean", describe: "Mint tokens" })
    .help()
    .alias("h", "help")
    .epilog("carbon-token-deployment-tool-ts - minimal template")
    .parseAsync();

  // Determine dry-run (CLI flag overrides config)
  const dryRun = Boolean((argv as any)["dry-run"]) || cfg.dryRun || false;

  // One-shot actions: pick the first matching action
  const actions = ["create-token", "create-series", "mint-nft"];
  for (const action of actions) {
    if ((argv as any)[action]) {
      switch (action) {
        case "create-token": {
          await actionCreateToken(cfg, dryRun);
          return;
        }
        case "create-series": {
          await actionCreateSeries(cfg, dryRun);
          return;
        }
        case "mint-nft": {
          await actionMintNft(cfg, dryRun);
          return;
        }
      }
    }
  }

  // No action requested -> show help
  console.log(
    "No action specified. Pass an action flag (e.g. --create-token or --mint-nft).",
  );
  console.log("Use --help to see available flags.");
}

/* ----------------------------- Run Script ---------------------------- */

if (require.main === module) {
  main().catch((err) => {
    console.error(
      "Unhandled error in CLI:",
      err && err.stack ? err.stack : err,
    );
    process.exit(2);
  });
}

export default main;
