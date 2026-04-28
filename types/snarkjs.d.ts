/** snarkjs ships without TypeScript types; minimal shim for strict builds. */
declare module "snarkjs" {
  export const groth16: {
    fullProve: (...args: unknown[]) => Promise<{ proof: unknown; publicSignals: unknown }>;
    verify: (...args: unknown[]) => Promise<boolean>;
  };
}
