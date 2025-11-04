import { hexToBytes } from "phantasma-sdk-ts";

// Helper: stringify BigInt as string
export const bigintReplacer = (_: string, v: unknown) =>
  typeof v === "bigint" ? v.toString() : v;

export type MetadataFields = Record<string, unknown>;

export class Metadata {
  fields?: MetadataFields | undefined;
  jsonName: string;

  constructor(fields: MetadataFields | undefined, jsonName: string ) {
    this.fields = fields
    this.jsonName = jsonName
  }

  pickString(
    mandatory: boolean,
    key: string
  ): string | undefined {
    if (!this.fields) {
      return undefined;
    }

    const value = this.fields[key];
    if (!value) {
      return undefined;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0 && mandatory) {
        throw new Error(`${this.jsonName}.${key} cannot be empty`);
      }
      return trimmed;
    }
    throw new Error(`${this.jsonName}.${key} must be a string`);
  }

  pickHexAndDecode(
    mandatory: boolean,
    key: string
  ): Uint8Array | undefined {
    const s = this.pickString(mandatory, key);
    if(!s){
      return undefined;
    }

    return hexToBytes(s);
  }

  pickNumber(
    mandatory: boolean,
    key: string
  ): number | undefined {
    if (!this.fields) {
      return undefined;
    }

    let value = this.fields[key];

    if (value == null) {
      if (mandatory) {
        throw new Error(`${this.jsonName}.${key} is required`);
      } else {
        return undefined;
      }
    }

    if (typeof value === "string") {
      const trimmed = (value as string).trim();
      if (trimmed.length === 0) {
        throw new Error(`${this.jsonName}.${key} cannot be empty`);
      }
      value = Number(trimmed);
    } else if (typeof value === "bigint") {
      value = Number(value);
    } else if(typeof value !== "number"){
      throw new Error(`${this.jsonName}.${key} must be a number or numeric string`);
    }

    if (typeof value !== "number") {
      throw new Error(`${this.jsonName}.${key} should be convertable to number`);
    }

    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`${this.jsonName}.${key} must be an integer`);
    }
    if (value < 0) {
      throw new Error(`${this.jsonName}.${key} must be non-negative`);
    }

    return value;
  }
}
