# carbon-token-deployment-tool-ts

Tool for token deployment, token series creation and NFT minting on Phantasma blockchain.

- Provide a clear mapping between TOML keys and CLI flags.
- Support two modes of operation:
  1. Direct CLI: `node dist/cli.js --create-token --symbol NFTMY ...`
  2. TOML-driven: `node dist/cli.js --config config.toml`
- Provides an example `config/config.example.toml` file with the same keys/content so you can copy and customize.

---

## Quick start

1. Install dependencies:

```
# from project root:
cd carbon-token-deployment-tool-ts
npm install
```

2. Build and run (example):

```
npm run build
npm start -- --create-token
```

or

```
just ct
```

---

## Configuration (TOML)

Place a `config.toml` file in the project root (or pass `--config path/to/file`) to use TOML config mode.

Example `config.example.toml`:

```
# RPC endpoint to use
rpc = "https://testnet.phantasma.info/rpc"

# Chain nexus: "mainnet" or "testnet"
nexus = "testnet"

# Wallet private key in WIF format
wif = ""

# Token symbol used for create token operations
symbol = "NFTMY"

# To create new token series or NFT you need to provide carbon token identifier
carbon_token_id = ""

# To mint new NFT you need to also provide carbon token series identifier
carbon_token_series_id = ""

# Token ROM used during new token creation (HEX-encoded string, optional)
rom = ""

# Token metadata fields as a TOML table
[token_metadata_fields]
name = "My test token!"
url = "http://example.com"

# NFT metadata (examples)
nft_metadata_name = "Test NFT Name"
nft_metadata_description = "Test NFT Description"
nft_metadata_image_url = "images-assets.nasa.gov/image/PIA13227/PIA13227~orig.jpg"
nft_metadata_info_url = "https://images.nasa.gov/details/PIA13227"
nft_metadata_royalties = 10000000

# Data size limits (numeric)
create_token_max_data = 1000000000
create_token_series_max_data = 100000000
mint_token_max_data = 100000000

# Gas / fee configuration (numeric values)
gas_fee_base = 10000
gas_fee_create_token_base = 10000000000
gas_fee_create_token_symbol = 10000000000
gas_fee_create_token_series = 2500000000
gas_fee_multiplier = 10000
```

Copy `config.example.toml` to `config.toml` and edit the values. Use TOML idioms: snake_case keys, tables for nested metadata, and native numeric/boolean types where applicable.

---

## CLI arguments mapping

We expose CLI flags (kebab-case, long options). These flags map to the TOML keys described above (snake_case keys in the TOML file). CLI flags always override TOML values.

Main flags (examples):

- `--rpc <url>` (toml: `rpc`)
- `--nexus <nexus>` (toml: `nexus`)
- `--wif <wif>` (toml: `wif`)
- `--symbol <symbol>` (toml: `symbol`)
- `--carbon-token-id <id>` (toml: `carbon_token_id`)
- `--carbon-token-series-id <id>` (toml: `carbon_token_series_id`)
- `--rom <string>` (toml: `rom`)
- `--token-metadata-fields <json>` (toml: table `token_metadata_fields` or string `token_metadata_fields` containing JSON)
- `--nft-name <string>` (toml: `nft_metadata_name`)
- `--nft-description <string>` (toml: `nft_metadata_description`)
- `--nft-image-url <url>` (toml: `nft_metadata_image_url`)
- `--nft-info-url <url>` (toml: `nft_metadata_info_url`)
- `--nft-royalties <number>` (toml: `nft_metadata_royalties`)
- `--create-token-max-data <number>` (toml: `create_token_max_data`)
- `--create-token-series-max-data <number>` (toml: `create_token_series_max_data`)
- `--mint-token-max-data <number>` (toml: `mint_token_max_data`)
- `--gas-fee-base <number>` (toml: `gas_fee_base`)
- `--gas-fee-create-token-base <number>` (toml: `gas_fee_create_token_base`)
- `--gas-fee-create-token-symbol <number>` (toml: `gas_fee_create_token_symbol`)
- `--gas-fee-create-token-series <number>` (toml: `gas_fee_create_token_series`)
- `--gas-fee-multiplier <number>` (toml: `gas_fee_multiplier`)
- `--recipient <address>` (toml: `recipient`)
- `--amount <number>` (toml: `amount`)

Action flags (mutually exclusive):

- `--create-token` (create token)
- `--create-series` (create token series)
- `--mint` (mint tokens)

Additional flags:

- `--config <path>` (use a specific TOML config file; defaults to `./config.toml`)
- `--dry-run` (validate and print actions without broadcasting)
- `--help` / `-h` (show help)
- `--version` / `-v` (show version)

CLI design notes:
- If a flag is supplied it overrides the TOML configuration value.
