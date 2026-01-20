# pha-deploy

CLI utility for deploying fungible tokens and NFTs on the Phantasma blockchain. The tool consumes structured metadata and token schemas defined in TOML configuration files and relies on the latest `phantasma-sdk-ts` builders for serialization.

- Three primary actions: `--create-token`, `--create-series`, `--mint-nft`.
- Configuration-first workflow: fill in `config.toml` (JSON blobs embedded in TOML) and let the CLI generate and submit Carbon transactions.
- Dry-run mode available for payload inspection without broadcasting.

---

## Quick Start

```bash
# install globally (recommended for CLI usage)
npm i -g pha-deploy

# or run once via npx
npx pha-deploy --help

# local dev install
npm install

# copy the sample configuration and adjust it to your needs
cp config/config.example.toml config.toml

# build the CLI
npm run build

# run an action (uses config.toml by default)
pha-deploy --create-token
```

Helper `just` recipes are available (`just ct`, `just cs`, `just mn`, etc.) if you have [`just`](https://github.com/casey/just) installed.

---

## Configuration Overview

All configuration is read from `config.toml` (or an alternate file passed via `--config`). CLI flags remain available for overrides, but the recommended flow is to edit `config.toml` and keep secrets outside of version control.

Key sections in `config/config.example.toml`:

- **Connection**  
  `rpc`, `nexus`, `wif`. `wif` may be left empty for dry runs.

- **Token definition**  
  `symbol`, `token_type` (`"nft"` or `"fungible"`), optional `token_max_supply` / `fungible_max_supply` and `fungible_decimals` (mandatory for fungible tokens), optional `rom` (hex string) for Carbon token ROM.

- **Carbon identifiers**  
  `carbon_token_id` (required for series creation or minting against an existing token) and `carbon_token_series_id` (required for minting).

- **Metadata blobs**  
  Each metadata block is a multi-line JSON string embedded in TOML:

  ```toml
  token_metadata = """
  {
    "name": "My test token!",
    "icon": "data:image/webp;base64,...",
    "url": "https://example.com",
    "description": "Token description",
    "extraField": "Optional custom data"
  }
  """
  ```

  - `token_metadata` is **mandatory** for all tokens. Required fields: `name`, `icon`, `url`, `description`.  
    The `icon` must be a base64 encoded data URI (`data:image/png;base64,...`, `data:image/jpeg;base64,...`, or `data:image/webp;base64,...`).
  - `series_metadata` (optional) defines shared metadata for NFT series. Populate when metadata should be stored once at the series level.
  - `nft_metadata` (optional) defines per-instance defaults for minting. You can override fields per mint by editing this block before running `--mint-nft`.
  - Numeric settings such as `royalties` should be plain numbers (e.g. `10000000` for 1%).

- **Token schemas**  
  `token_schemas` is a JSON object describing the Carbon VM schemas used for series metadata, NFT ROM, and NFT RAM. Example structure:

  ```toml
  token_schemas = """
  {
    "seriesMetadata": [
      { "name": "extraSharedSampleField", "type": "String" }
    ],
    "rom": [
      { "name": "name", "type": "String" },
      { "name": "description", "type": "String" },
      { "name": "imageURL", "type": "String" },
      { "name": "infoURL", "type": "String" },
      { "name": "royalties", "type": "Int32" },
      { "name": "extraSampleField", "type": "String" }
    ],
    "ram": []
  }
  """
  ```

  Rules enforced by the SDK:
  - Mandatory fields `name`, `description`, `imageURL`, `infoURL`, `royalties` must appear either in `seriesMetadata` (shared) or in `rom` (per NFT); the builder fills core structural fields such as the Carbon `id`, `mode`, and `rom` placeholders automatically.
  - Field `type` values must match `VmType` names understood by the SDK. Supported values:

    ```
    Dynamic
    Array
    Bytes
    Struct
    Int8
    Int16
    Int32
    Int64
    Int256
    Bytes16
    Bytes32
    Bytes64
    String
    Array_Dynamic
    Array_Bytes
    Array_Struct
    Array_Int8
    Array_Int16
    Array_Int32
    Array_Int64
    Array_Int256
    Array_Bytes16
    Array_Bytes32
    Array_Bytes64
    Array_String
    ```
  - Leave `ram` empty (`[]`) to use a dynamic RAM schema; provide field definitions if you need strict RAM layout.

- **Limits and fees**  
  `create_token_max_data`, `create_token_series_max_data`, `mint_token_max_data`, `gas_fee_*` entries are numeric boundaries passed to the transaction helpers. The bundled defaults are tuned for typical deployments and are a safe starting point; change them only if you know you need higher caps or different fee multipliers.

- **Runtime flags**  
  `dry_run` toggles dry-run mode when set to `true` in TOML. `config_path` is automatically injected when you load a custom file via `--config`.

Ensure every value present in `config.example.toml` is reviewed and updated (or deliberately left as default) before sending real transactions.

---

## Running Actions

Each action reads the active configuration, prints a summary (without exposing your WIF), and either broadcasts or exits depending on `--dry-run`.

- **Create a token**

  ```bash
  pha-deploy --create-token --config path/to/config.toml
  ```

  Requirements:
  - `token_type` must be set (`nft` or `fungible`).
  - For fungible tokens provide `token_max_supply` / `fungible_max_supply` and `fungible_decimals`.
  - `token_metadata` and (for NFTs) `token_schemas` must be present.

- **Create an NFT series**

  ```bash
  pha-deploy --create-series --config path/to/config.toml
  ```

  Requirements:
  - `carbon_token_id` referencing the deployed token.
  - `token_schemas.seriesMetadata` describing the shared schema used for the series.
  - Optional metadata comes from `series_metadata`.

- **Mint an NFT**

  ```bash
  pha-deploy --mint-nft --config path/to/config.toml
  ```

  Requirements:
  - `carbon_token_id` and `carbon_token_series_id`.
  - `token_schemas.rom` to drive ROM serialization.
  - `nft_metadata` containing per-instance values.

Append `--dry-run` to any command to inspect the serialized payload without submitting it:

```bash
pha-deploy --create-token --dry-run
```

---

## CLI Flags and Overrides

Action selectors (first match wins):

- `--create-token`
- `--create-series`
- `--mint-nft`

Common utility flags:

- `--config <path>` – load an alternate TOML file.
- `--dry-run` – skip broadcasting even if the config has `dry_run = false`.
- `--rpc-log` – enable verbose SDK JSON-RPC logging (full response payloads).
- `--settings-log` – print resolved settings before executing an action.

Configuration overrides (values override `config.toml` when provided):

- `--rpc <url>` – RPC endpoint.
- `--nexus <nexus>` – nexus name.
- `--wif <wif>` – signer WIF.
- `--symbol <symbol>` – token symbol.
- `--token-type <nft|fungible>` – token kind.
- `--token-max-supply <number>` / `--fungible-max-supply <number>` – maximum supply.
- `--fungible-decimals <number>` – decimals for fungible token.
- `--carbon-token-id <id>` – existing Carbon token id.
- `--carbon-token-series-id <id>` – existing Carbon series id.
- `--rom <hex>` – token ROM as hex string.
- `--token-schemas '<json>'` – inline JSON for schemas.
- `--token-metadata '<json>'` – inline JSON for token metadata.
- `--series-metadata '<json>'` – inline JSON for series metadata.
- `--nft-metadata '<json>'` – inline JSON for NFT metadata.
- `--create-token-max-data <number>` – payload limit for token creation.
- `--create-token-series-max-data <number>` – payload limit for series creation.
- `--mint-token-max-data <number>` – payload limit for minting.
- `--gas-fee-base <number>` – base gas fee.
- `--gas-fee-create-token-base <number>` – gas fee for token creation.
- `--gas-fee-create-token-symbol <number>` – symbol registration fee.
- `--gas-fee-create-token-series <number>` – fee for series creation.
- `--gas-fee-multiplier <number>` – multiplier applied to gas fee.

Notes:
- JSON arguments must be passed as single-line quoted strings; for substantial edits, updating `config.toml` is usually more convenient.
- Unknown flags are ignored by the loader; prefer editing the TOML file for long-lived configuration changes.
