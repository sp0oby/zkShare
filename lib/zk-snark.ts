import "server-only";

/**
 * Groth16 / Circom integration (v1.0+).
 *
 * **Today:** Proofs in production use commitments + HMAC-sealed payloads in `lib/zk.ts`.
 * **Next:** After you compile `circuits/commit.circom` → `commit.wasm` + `commit.zkey` (see `circuits/README.md`),
 * load them here with `snarkjs.groth16.fullProve` / `verify` and attach the serialized proof next to the HMAC envelope.
 *
 * ```ts
 * const snarkjs = await import("snarkjs");
 * const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
 * ```
 *
 * AWS Nitro / other TEE hooks belong in `lib/enclave.ts`, not here.
 */
export async function loadSnarkjs(): Promise<typeof import("snarkjs")> {
  return import("snarkjs");
}
