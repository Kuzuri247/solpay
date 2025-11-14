import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solpay } from "../target/types/solpay";
import { expect } from "chai";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("solpay", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solpay as Program<Solpay>;

  let paymentPda: PublicKey;
  let bump: number;

  async function getPaymentPda(sender: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), sender.toBuffer()],
      program.programId
    );
  }

  it("Initializes a payment", async () => {
    const sender = provider.wallet;
    
    const recipient = anchor.web3.Keypair.generate().publicKey;
    
    const amount = new anchor.BN(0.001 * LAMPORTS_PER_SOL);

    [paymentPda, bump] = await getPaymentPda(sender.publicKey);

    console.log("Test Setup:");
    console.log("  Sender:", sender.publicKey.toString());
    console.log("  Recipient:", recipient.toString());
    console.log("  Amount:", amount.toString(), "lamports");
    console.log("  Payment PDA:", paymentPda.toString());

    // Call initialize_payment instruction
    const tx = await program.methods
      .initializePayment(amount, recipient)
      .accounts({
        payment: paymentPda,
        sender: sender.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("  Transaction signature:", tx);

    const paymentAccount = await program.account.payment.fetch(paymentPda);

    expect(paymentAccount.sender.toString()).to.equal(
      sender.publicKey.toString(),
      "Sender address should match"
    );
    
    expect(paymentAccount.recipient.toString()).to.equal(
      recipient.toString(),
      "Recipient address should match"
    );
    
    expect(paymentAccount.amount.toNumber()).to.equal(
      amount.toNumber(),
      "Amount should match"
    );
    
    expect(paymentAccount.status).to.deep.equal(
      { pending: {} },
      "Initial status should be Pending"
    );
    
    expect(paymentAccount.timestamp).to.be.greaterThan(
      0,
      "Timestamp should be set"
    );

    console.log("✓ Payment initialized successfully");
    console.log("  Status:", paymentAccount.status);
    console.log("  Timestamp:", new Date(paymentAccount.timestamp * 1000).toISOString());
  });

  it("Confirms a payment", async () => {
    const sender = provider.wallet;

    console.log("\nConfirming payment...");
    console.log("  Payment PDA:", paymentPda.toString());

    // Call confirm_payment instruction
    const tx = await program.methods
      .confirmPayment()
      .accounts({
        payment: paymentPda,
        authority: sender.publicKey,
      })
      .rpc();

    console.log("  Transaction signature:", tx);

    // Fetch updated payment account
    const paymentAccount = await program.account.payment.fetch(paymentPda);

    // Verify status changed to Completed
    expect(paymentAccount.status).to.deep.equal(
      { completed: {} },
      "Status should be Completed after confirmation"
    );

    console.log("✓ Payment confirmed successfully");
    console.log("  New status:", paymentAccount.status);
  });

  it("Prevents double confirmation", async () => {
    const sender = provider.wallet;

    console.log("\nAttempting double confirmation...");

    // Try to confirm again - should fail
    try {
      await program.methods
        .confirmPayment()
        .accounts({
          payment: paymentPda,
          authority: sender.publicKey,
        })
        .rpc();

      // If we reach here, test should fail
      expect.fail("Should not be able to confirm already completed payment");
    } catch (error: any) {
      // Verify we get the correct error
      expect(error.toString()).to.include(
        "AlreadyProcessed",
        "Should return AlreadyProcessed error"
      );
      console.log("✓ Double confirmation correctly prevented");
      console.log("  Error:", error.error?.errorMessage || error.message);
    }
  });

  it("Cancels a payment", async () => {
    const sender = provider.wallet;
    const recipient = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(0.002 * LAMPORTS_PER_SOL);

    const [newPaymentPda] = await PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), sender.publicKey.toBuffer()],
      program.programId
    );

    console.log("\nCreating new payment for cancellation test...");

    try {
      await program.methods
        .initializePayment(amount, recipient)
        .accounts({
          payment: newPaymentPda,
          sender: sender.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      console.log("  Payment account already exists, using existing one");
    }

    console.log("Cancelling payment...");

    const tx = await program.methods
      .cancelPayment()
      .accounts({
        payment: newPaymentPda,
        sender: sender.publicKey,
      })
      .rpc();

    console.log("  Transaction signature:", tx);

    const paymentAccount = await program.account.payment.fetch(newPaymentPda);

    expect(paymentAccount.status).to.deep.equal(
      { cancelled: {} },
      "Status should be Cancelled"
    );

    console.log("✓ Payment cancelled successfully");
    console.log("  Final status:", paymentAccount.status);
  });

  it("Prevents unauthorized cancellation", async () => {
    const sender = provider.wallet;
    const unauthorizedUser = anchor.web3.Keypair.generate();

    // Derive payment PDA
    const [paymentPda] = await getPaymentPda(sender.publicKey);

    console.log("\nAttempting unauthorized cancellation...");
    console.log("  Authorized sender:", sender.publicKey.toString());
    console.log("  Unauthorized user:", unauthorizedUser.publicKey.toString());

    try {
      // Try to cancel with different wallet - should fail
      await program.methods
        .cancelPayment()
        .accounts({
          payment: paymentPda,
          sender: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();

      expect.fail("Should not allow unauthorized cancellation");
    } catch (error: any) {
      const errorMsg = error.toString();
      const hasConstraintError = errorMsg.includes("ConstraintSeeds") || 
                                 errorMsg.includes("Unauthorized");
      
      expect(hasConstraintError).to.be.true;
      console.log("✓ Unauthorized cancellation correctly prevented");
      console.log("  Error:", error.error?.errorMessage || error.message);
    }
  });

  it("Validates payment account data structure", async () => {
    const sender = provider.wallet;
    const [paymentPda] = await getPaymentPda(sender.publicKey);

    console.log("\nValidating payment account structure...");

    const paymentAccount = await program.account.payment.fetch(paymentPda);

    expect(paymentAccount).to.have.property("sender");
    expect(paymentAccount).to.have.property("recipient");
    expect(paymentAccount).to.have.property("amount");
    expect(paymentAccount).to.have.property("status");
    expect(paymentAccount).to.have.property("timestamp");

    expect(paymentAccount.sender).to.be.instanceOf(PublicKey);
    expect(paymentAccount.recipient).to.be.instanceOf(PublicKey);
    expect(paymentAccount.amount).to.be.instanceOf(anchor.BN);
    expect(typeof paymentAccount.timestamp).to.equal("number");

    console.log("✓ Payment account structure validated");
    console.log("  Account data:", {
      sender: paymentAccount.sender.toString().substring(0, 8) + "...",
      recipient: paymentAccount.recipient.toString().substring(0, 8) + "...",
      amount: paymentAccount.amount.toString(),
      status: paymentAccount.status,
      timestamp: paymentAccount.timestamp,
    });
  });
});
