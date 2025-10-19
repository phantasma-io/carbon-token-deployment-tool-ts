import fs from "fs";
import path from "path";
import toml from "@iarna/toml";
import yargs from "yargs/yargs";

type TokenMetadataFields = Record<string, string>;

export interface Config {
  // Core / connection
  rpc: string;
  nexus?: string | null;
  wif?: string | null;

  // Token defaults
  symbol?: string | null;
  carbonTokenId?: bigint | null;
  carbonTokenSeriesId?: number | null;
  rom?: string | null;
  tokenMetadataFields?: TokenMetadataFields | null;

  // NFT-specific defaults
  nftName?: string | null;
  nftDescription?: string | null;
  nftImageUrl?: string | null;
  nftInfoUrl?: string | null;
  nftRoyalties?: number | null;

  // Limits / sizes
  createTokenMaxData?: bigint | null;
  createTokenSeriesMaxData?: bigint | null;
  mintTokenMaxData?: bigint | null;

  // Gas / fees
  gasFeeBase?: bigint | null;
  gasFeeCreateTokenBase?: bigint | null;
  gasFeeCreateTokenSymbol?: bigint | null;
  gasFeeCreateTokenSeries?: bigint | null;
  gasFeeMultiplier?: bigint | null;

  // Runtime flags
  configPath?: string | null;
  dryRun?: boolean;
}

/**
 * Try to parse a JSON string, returning undefined if parsing fails.
 */
function tryParseJSON<T = unknown>(value?: string | null): T | undefined {
  if (!value) return undefined;
  try {
    // Some users may provide single-quoted JSON; normalize quotes if necessary
    const trimmed = value.trim();
    return JSON.parse(trimmed) as T;
  } catch {
    // ignore parse errors; caller will handle fallback
    return undefined;
  }
}

/**
 * Parse a numeric-ish value into a number or undefined.
 */
function parseNumber(value?: string | number | null): number | undefined {
  if (value == null) return undefined;

  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  const v = value.toString().trim();
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseBigInt(value?: string | bigint | null): bigint | undefined {
  if (value == null) return undefined;

  if (typeof value === "bigint") return value;

  const v = value.toString().trim();
  if (v === "") return undefined;
  return BigInt(v);
}

/**
 * Load TOML configuration from a provided path (if exists) or from default `config.toml`.
 * The parsed result is stored in the module-scoped `tomlConfig` object and used as
 * the source of truth for configuration values unless overridden by CLI flags.
 */
let tomlConfig: Record<string, any> = {};

function loadToml(configPath?: string | null) {
  const file = configPath ? configPath : "config.toml";
  try {
    const resolved = path.resolve(process.cwd(), file);
    if (fs.existsSync(resolved)) {
      const raw = fs.readFileSync(resolved, { encoding: "utf8" });
      // Parse TOML into a plain object. If parse fails, keep an empty config.
      try {
        tomlConfig = toml.parse(raw) as Record<string, any>;
      } catch {
        tomlConfig = {};
      }
    } else {
      tomlConfig = {};
    }
  } catch {
    tomlConfig = {};
  }
}

/**
 * Helper to obtain a value by preferring CLI args -> TOML config -> fallback.
 * Accepts multiple possible CLI keys (kebab-case and camelCase).
 */
function pickValue<T = string | undefined>(
  argv: Record<string, unknown>,
  cliKey: string, // prefer these (kebab/camel)
  tomlKey: string,
): T | undefined {
  // try as-is from CLI
  if (Object.prototype.hasOwnProperty.call(argv, cliKey)) {
    const v = argv[cliKey];
    // yargs may map flags to boolean when not provided with value
    if (!(v === undefined)) {
      return v as unknown as T;
    }
  }

  // Fall back to TOML configuration.
  if (tomlConfig) {
    return tomlConfig[tomlKey] as unknown as T;
  }

  return undefined;
}

/**
 * Build Config by merging:
 *  - TOML config file (config.toml) values
 *  - CLI flags (override TOML)
 *  - defaults (where applicable)
 *
 * Usage:
 *  loadConfig(); // uses process.argv and config.toml if present
 *  loadConfig({ argv: ['--rpc','https://...'], configPath: 'custom-config.toml' })
 */
export function loadConfig(options?: {
  argv?: string[];
  configPath?: string | null;
}): Config {
  // Load TOML config (if any)
  loadToml(options?.configPath ?? null);

  // Parse CLI args using yargs; pass provided argv or process.argv
  const rawArgv = options?.argv ?? process.argv.slice(2);
  const argv = yargs(rawArgv).parseSync();

  const cfg: Config = {
    rpc: "",
    nexus: "",
    wif: null,
    symbol: null,
    carbonTokenId: null,
    carbonTokenSeriesId: null,
    rom: null,
    tokenMetadataFields: null,
    nftName: null,
    nftDescription: null,
    nftImageUrl: null,
    nftInfoUrl: null,
    nftRoyalties: null,
    createTokenMaxData: null,
    createTokenSeriesMaxData: null,
    mintTokenMaxData: null,
    gasFeeBase: null,
    gasFeeCreateTokenBase: null,
    gasFeeCreateTokenSymbol: null,
    gasFeeCreateTokenSeries: null,
    gasFeeMultiplier: null,
    configPath: null,
    dryRun: false,
  };

  // Core / connection
  cfg.rpc =
    (pickValue(argv, "rpc", "rpc") as string | undefined) ??
    "https://testnet.phantasma.info/rpc";
  cfg.nexus = (pickValue(argv, "nexus", "nexus") as string | undefined) ?? null;
  cfg.wif = (pickValue(argv, "wif", "wif") as string | undefined) ?? null;

  // Token defaults
  cfg.symbol =
    (pickValue(argv, "symbol", "symbol") as string | undefined) ?? null;
  cfg.carbonTokenId =
    parseBigInt(
      pickValue(argv, "carbon-token-id", "carbon_token_id") as
        | string
        | bigint
        | undefined,
    ) ?? null;
  cfg.carbonTokenSeriesId =
    parseNumber(
      pickValue(argv, "carbon-token-series-id", "carbon_token_series_id") as
        | string
        | number
        | undefined,
    ) ?? null;
  cfg.rom = (pickValue(argv, "rom", "rom") as string | undefined) ?? null;

  // tokenMetadataFields: attempt CLI -> env -> undefined; parse JSON if string
  const tmfRaw = pickValue<string>(
    argv,
    "token-metadata-fields",
    "token_metadata_fields",
  );
  if (typeof tmfRaw === "string") {
    cfg.tokenMetadataFields = tryParseJSON<TokenMetadataFields>(tmfRaw) ?? {
      raw: tmfRaw,
    };
  } else if (tmfRaw && typeof tmfRaw === "object") {
    // yargs may coerce JSON-like strings if shell expands, but unlikely; handle defensively
    cfg.tokenMetadataFields = tmfRaw as TokenMetadataFields;
  } else {
    cfg.tokenMetadataFields = null;
  }

  // NFT metadata
  cfg.nftName =
    (pickValue(argv, "nft-name", "nft_metadata_name") as string | undefined) ??
    null;
  cfg.nftDescription =
    (pickValue(argv, "nft-description", "nft_metadata_description") as
      | string
      | undefined) ?? null;
  cfg.nftImageUrl =
    (pickValue(argv, "nft-image-url", "nft_metadata_image_url") as
      | string
      | undefined) ?? null;
  cfg.nftInfoUrl =
    (pickValue(argv, "nft-info-url", "nft_metadata_info_url") as
      | string
      | undefined) ?? null;
  cfg.nftRoyalties =
    parseNumber(
      pickValue(argv, "nft-royalties", "nft_metadata_royalties") as
        | string
        | number
        | undefined,
    ) ?? null;

  // Limits and sizes
  cfg.createTokenMaxData =
    parseBigInt(
      pickValue(argv, "create-token-max-data", "create_token_max_data") as
        | string
        | bigint
        | undefined,
    ) ?? null;
  cfg.createTokenSeriesMaxData =
    parseBigInt(
      pickValue(
        argv,
        "create-token-series-max-data",
        "create_token_series_max_data",
      ) as string | bigint | undefined,
    ) ?? null;
  cfg.mintTokenMaxData =
    parseBigInt(
      pickValue(argv, "mint-token-max-data", "mint_token_max_data") as
        | string
        | bigint
        | undefined,
    ) ?? null;

  // Gas / fees
  cfg.gasFeeBase =
    parseBigInt(
      pickValue(argv, "gas-fee-base", "gas_fee_base") as
        | string
        | bigint
        | undefined,
    ) ?? null;
  cfg.gasFeeCreateTokenBase =
    parseBigInt(
      pickValue(
        argv,
        "gas-fee-create-token-base",
        "gas_fee_create_token_base",
      ) as string | bigint | undefined,
    ) ?? null;
  cfg.gasFeeCreateTokenSymbol =
    parseBigInt(
      pickValue(
        argv,
        "gas-fee-create-token-symbol",
        "gas_fee_create_token_symbol",
      ) as string | bigint | undefined,
    ) ?? null;
  cfg.gasFeeCreateTokenSeries =
    parseBigInt(
      pickValue(
        argv,
        "gas-fee-create-token-series",
        "gas_fee_create_token_series",
      ) as string | bigint | undefined,
    ) ?? null;
  cfg.gasFeeMultiplier =
    parseBigInt(
      pickValue(argv, "gas-fee-multiplier", "gas_fee_multiplier") as
        | string
        | bigint
        | undefined,
    ) ?? null;

  // Runtime flags
  cfg.configPath =
    (pickValue(argv, "config", "CONFIG_PATH") as string | undefined) ??
    options?.configPath ??
    null;
  cfg.dryRun = Boolean(pickValue(argv, "dry-run", "dry_run")) || false;

  return cfg;
}

export default loadConfig;
