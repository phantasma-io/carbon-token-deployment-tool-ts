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
  VmStructSchema,
} from "phantasma-sdk-ts";
import { waitForTx } from "./waitForTx";
import { bigintReplacer, Metadata } from "./helpers";

export class mintNftTokenCfg {
  constructor(
    public rpc: string,
    public nexus: string,
    public wif: string,
    public carbonTokenId: bigint,
    public carbonSeriesId: number,
    public nftRomSchema: VmStructSchema,
    public nftMetadata: Metadata,
    public gasFeeBase: bigint,
    public gasFeeMultiplier: bigint,
    public mintTokenMaxData: bigint,
  ) {
    this.rpc = rpc;
    this.nexus = nexus;
    this.wif = wif;
    this.carbonTokenId = carbonTokenId;
    this.carbonSeriesId = carbonSeriesId;
    this.nftRomSchema = nftRomSchema;
    this.nftMetadata = nftMetadata;
    this.gasFeeBase = gasFeeBase;
    this.gasFeeMultiplier = gasFeeMultiplier;
    this.mintTokenMaxData = mintTokenMaxData;
  }

  toPrintable() {
    // Do not leak WIF; derive owner
    const { wif: _omit, nftMetadata, ...rest } =
      this; // rest has all public fields except wif/metadata strings
    const owner = PhantasmaKeys.fromWIF(this.wif).Address.toString();

    return {
      ...rest,
      owner,
      nftMetadata: nftMetadata.fields
        ? Object.fromEntries(Object.entries(nftMetadata.fields))
        : null
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

  const rom = NftRomBuilder.buildAndSerialize(
    cfg.nftRomSchema,
    newPhantasmaNftId,
    cfg.nftMetadata.pickString(false, "name"),
    cfg.nftMetadata.pickString(false, "description"),
    cfg.nftMetadata.pickString(false, "imageURL"),
    cfg.nftMetadata.pickString(false, "infoURL"),
    cfg.nftMetadata.pickNumber(false, "royalties"),
    cfg.nftMetadata.pickHexAndDecode(false, "ROM")
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
    const carbonNftAddresses = MintNonFungibleTxHelper.parseResult(
      cfg.carbonTokenId,
      result,
    );
    console.log(
      `Deployed NFT with phantasma ID ${newPhantasmaNftId} and carbon NFT address ${carbonNftAddresses[0]}`,
    );
  } else {
    console.log("Could not mint NFT");
  }
}
