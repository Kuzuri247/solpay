import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solpay } from "../target/types/solpay";
import { expect } from "chai";

describe("solpay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solpay as Program<Solpay>;

  it("Initializes a payment", async () => {
    const sender = provider.wallet;
    const recipient = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(1000000); // 0.001 SOL

    const [paymentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), sender.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializePayment(amount, recipient)
      .accounts({
        payment: paymentPda,
        sender: sender.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const paymentAccount = await program.account.payment.fetch(paymentPda);
    expect(paymentAccount.amount.toNumber()).to.equal(1000000);
    expect(paymentAccount.recipient.toString()).to.equal(recipient.toString());
  });
});
