// Helper: stringify BigInt as string
export const bigintReplacer = (_: string, v: unknown) =>
  typeof v === "bigint" ? v.toString() : v;
