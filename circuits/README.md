# Circom circuits (ZKshare)

v1.0 ships with **HMAC-sealed proof transcripts** in API responses. For **Groth16** proofs (`snarkjs` + Circom), add a circuit here and wire `lib/zk-snark.ts`.

## Suggested starter circuit

Create `commit.circom` that proves knowledge of `(value, salt)` for a public commitment compatible with your app’s `computeCommitment()` (e.g. Poseidon or SHA-256 gadget via `circomlib`).

```bash
# Install circom + snarkjs globally or use npx
circom commit.circom --r1cs --wasm --sym
snarkjs groth16 setup commit.r1cs pot12_final.ptau commit_0000.zkey
# ... contribute / finalize zkey per your security model
snarkjs zkey export verificationkey commit_final.zkey verification_key.json
```

Place outputs where the app can load them (e.g. `public/zk/commit.wasm`, `public/zk/commit.zkey`) and call `snarkjs.groth16.fullProve` from `lib/zk-snark.ts`.

## Dependencies

- `snarkjs` (runtime, already in root `package.json`)
- Circom compiler (dev machine / CI)

## v1.1

For **real TEE** attestation alongside ZK, see comments in `lib/sandbox.ts` (e.g. AWS Nitro Enclaves).
