import {
  Bytes32,
  CarbonBlob,
  CreateTokenFeeOptions,
  CreateTokenTxHelper,
  hexToBytes,
  IntX,
  SignedTxMsg,
  PhantasmaAPI,
  PhantasmaKeys,
  TokenInfoBuilder,
  TokenMetadataBuilder,
} from "phantasma-sdk-ts";
import { waitForTx } from "./waitForTx";
import { bigintReplacer } from "./helpers";

export class createTokenCfg {
  constructor(
    public rpc: string,
    public nexus: string,
    public wif: string,
    public symbol: string,
    public gasFeeBase: bigint,
    public gasFeeCreateTokenBase: bigint,
    public gasFeeCreateTokenSymbol: bigint,
    public gasFeeMultiplier: bigint,
    public createTokenMaxData: bigint,
    public tokenMetadataFields: Record<string, string> | undefined | null,
  ) {
    this.rpc = rpc;
    this.nexus = nexus;
    this.wif = wif;
    this.symbol = symbol;
    this.gasFeeBase = gasFeeBase;
    this.gasFeeCreateTokenBase = gasFeeCreateTokenBase;
    this.gasFeeCreateTokenSymbol = gasFeeCreateTokenSymbol;
    this.gasFeeMultiplier = gasFeeMultiplier;
    this.createTokenMaxData = createTokenMaxData;
    this.tokenMetadataFields = tokenMetadataFields;
  }

  toPrintable() {
    // Do not leak WIF; derive owner
    const { wif: _omit, ...rest } = this; // rest has all public fields except wif
    const owner = PhantasmaKeys.fromWIF(this.wif).Address.toString();

    return {
      ...rest,
      owner,
    };
  }
}

export async function createToken(cfg: createTokenCfg, dryRun: boolean) {
  const txSender = PhantasmaKeys.fromWIF(cfg.wif);
  const senderPubKey = new Bytes32(txSender.PublicKey);

  console.log(
    "Deploying new token using these settings:",
    JSON.stringify(cfg.toPrintable(), bigintReplacer, 2),
  );

  const info = TokenInfoBuilder.build(
    cfg.symbol,
    IntX.fromI64(0n),
    true,
    0,
    senderPubKey,
    TokenMetadataBuilder.buildAndSerialize(cfg.tokenMetadataFields),
  );

  const feeOptions = new CreateTokenFeeOptions(
    cfg.gasFeeBase,
    cfg.gasFeeCreateTokenBase,
    cfg.gasFeeCreateTokenSymbol,
    cfg.gasFeeMultiplier,
  );

  const tx = CreateTokenTxHelper.buildTxAndSignHex(
    info,
    txSender,
    feeOptions,
    cfg.createTokenMaxData,
  );

  if (dryRun) {
    console.log(`[dry-run] Prepared tx (not sent): ${tx}`);
    console.log(CarbonBlob.NewFromBytes(SignedTxMsg, hexToBytes(tx), 0));
    return;
  }

  console.log("Broadcasting transaction...");

  const rpc = new PhantasmaAPI(cfg.rpc, null, cfg.nexus);

  let txHash = await rpc.sendCarbonTransaction(tx);
  console.log("txHash: ", txHash);

  const { success, result } = await waitForTx(rpc, txHash);

  if (success) {
    var tokenId = CreateTokenTxHelper.parseResult(result);
    console.log("Deployed carbon token ID:", tokenId);
  } else {
    console.log("Could not deploy token");
  }
}
