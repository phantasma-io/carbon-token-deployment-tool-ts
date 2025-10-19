import {
  Bytes32,
  CarbonBlob,
  hexToBytes,
  getRandomPhantasmaId,
  MintNftFeeOptions,
  MintNonFungibleTxHelper,
  NftRomBuilder,
  PhantasmaAPI,
  PhantasmaKeys,
  SignedTxMsg,
} from "phantasma-sdk-ts";
import { waitForTx } from "./waitForTx";
import { bigintReplacer } from "./helpers";

export class mintNftTokenCfg {
  constructor(
    public rpc: string,
    public nexus: string,
    public wif: string,
    public carbonTokenId: bigint,
    public carbonSeriesId: number,
    public metadataName: string,
    public metadataDescription: string,
    public metadataImageUrl: string,
    public metadataInfoUrl: string,
    public metadataRoyalties: number,
    public gasFeeBase: bigint,
    public gasFeeMultiplier: bigint,
    public mintTokenMaxData: bigint,
  ) {
    this.rpc = rpc;
    this.nexus = nexus;
    this.wif = wif;
    this.carbonTokenId = carbonTokenId;
    this.carbonSeriesId = carbonSeriesId;
    this.metadataName = metadataName;
    this.metadataDescription = metadataDescription;
    this.metadataImageUrl = metadataImageUrl;
    this.metadataInfoUrl = metadataInfoUrl;
    this.metadataRoyalties = metadataRoyalties;
    this.gasFeeBase = gasFeeBase;
    this.gasFeeMultiplier = gasFeeMultiplier;
    this.mintTokenMaxData = mintTokenMaxData;
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

export async function mintNftToken(cfg: mintNftTokenCfg, dryRun: boolean) {
  const txSender = PhantasmaKeys.fromWIF(cfg.wif);
  const senderPubKey = new Bytes32(txSender.PublicKey);

  const newPhantasmaNftId = await getRandomPhantasmaId();

  console.log(
    `Minting new token '${newPhantasmaNftId}' using these settings:`,
    JSON.stringify(cfg.toPrintable(), bigintReplacer, 2),
  );

  const phantasmaRomData = new Uint8Array();

  const rom = NftRomBuilder.BuildAndSerialize(
    newPhantasmaNftId,
    cfg.metadataName,
    cfg.metadataDescription,
    cfg.metadataImageUrl,
    cfg.metadataInfoUrl,
    cfg.metadataRoyalties,
    phantasmaRomData,
  );

  const feeOptions = new MintNftFeeOptions(
    cfg.gasFeeBase,
    cfg.gasFeeMultiplier,
  );

  const tx = MintNonFungibleTxHelper.buildTxAndSignHex(
    cfg.carbonTokenId,
    cfg.carbonSeriesId,
    txSender,
    senderPubKey,
    rom,
    new Uint8Array(),
    feeOptions,
    cfg.mintTokenMaxData,
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
    console.log("Deployed NFT with phantasma ID:", newPhantasmaNftId);
  } else {
    console.log("Could not mint NFT");
  }
}
