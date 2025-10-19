import {
  Bytes32,
  CarbonBlob,
  CreateSeriesFeeOptions,
  CreateTokenSeriesTxHelper,
  getRandomPhantasmaId,
  hexToBytes,
  SeriesInfoBuilder,
  SignedTxMsg,
  PhantasmaAPI,
  PhantasmaKeys,
} from "phantasma-sdk-ts";
import { waitForTx } from "./waitForTx";
import { bigintReplacer } from "./helpers";

export class createSeriesCfg {
  constructor(
    public rpc: string,
    public nexus: string,
    public wif: string,
    public carbonTokenId: bigint,
    public gasFeeBase: bigint,
    public gasFeeCreateTokenSeries: bigint,
    public gasFeeMultiplier: bigint,
    public createSeriesMaxData: bigint,
  ) {
    this.rpc = rpc;
    this.nexus = nexus;
    this.wif = wif;
    this.carbonTokenId = carbonTokenId;
    this.gasFeeBase = gasFeeBase;
    this.gasFeeCreateTokenSeries = gasFeeCreateTokenSeries;
    this.gasFeeMultiplier = gasFeeMultiplier;
    this.createSeriesMaxData = createSeriesMaxData;
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

export async function createSeries(cfg: createSeriesCfg, dryRun: boolean) {
  const txSender = PhantasmaKeys.fromWIF(cfg.wif);
  const senderPubKey = new Bytes32(txSender.PublicKey);

  const newPhantasmaSeriesId = await getRandomPhantasmaId();

  console.log(
    `Creating new series '${newPhantasmaSeriesId}' using these settings:`,
    JSON.stringify(cfg.toPrintable(), bigintReplacer, 2),
  );

  const info = SeriesInfoBuilder.Build(
    newPhantasmaSeriesId,
    0,
    0,
    senderPubKey,
    new Uint8Array(),
  );

  const feeOptions = new CreateSeriesFeeOptions(
    cfg.gasFeeBase,
    cfg.gasFeeCreateTokenSeries,
    cfg.gasFeeMultiplier,
  );

  const tx = CreateTokenSeriesTxHelper.buildTxAndSignHex(
    cfg.carbonTokenId,
    info,
    txSender,
    feeOptions,
    cfg.createSeriesMaxData,
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
    var seriesId = CreateTokenSeriesTxHelper.parseResult(result);
    console.log("Deployed carbon series ID:", seriesId);
  } else {
    console.log("Could not deploy series");
  }
}
