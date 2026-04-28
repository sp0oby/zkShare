// Placeholder circuit — replace with Poseidon/SHA256 + circomlib to match `computeCommitment()` in lib/zk.ts.
// circom commit.circom --r1cs --wasm --sym
pragma circom 2.0.0;

template AddDemo() {
    signal input a;
    signal input b;
    signal output c;
    c <== a + b;
}

component main = AddDemo();
