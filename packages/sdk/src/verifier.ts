import { Connection, PublicKey } from "@solana/web3.js";
import { X402Config, X402PaymentResponse } from "@solpay/types";

export class PaymentVerifier {
  private connection: Connection;
  private config: X402Config;

  constructor(config: X402Config) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
  }

  async verifyTransaction(
    signature: string,
    expectedAmount: number,
    expectedRecipient: PublicKey,
    expectedMint?: PublicKey
  ): Promise<boolean> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) {
        console.error('Transaction not found or failed');
        return false;
      }

      // Verify payment details by checking token balance changes
      const preTokenBalances = tx.meta.preTokenBalances || [];
      const postTokenBalances = tx.meta.postTokenBalances || [];

      // Find recipient's token account balance changes
      for (const postBalance of postTokenBalances) {
        const preBalance = preTokenBalances.find(
          (pre) => pre.accountIndex === postBalance.accountIndex
        );

        // Check if this is the recipient's account by owner
        const isRecipientAccount = postBalance.owner === expectedRecipient.toString();
        if (!isRecipientAccount) {
          continue;
        }

        // Verify mint if provided
        if (expectedMint && postBalance.mint !== expectedMint.toString()) {
          console.error(`Mint mismatch: expected ${expectedMint.toString()}, got ${postBalance.mint}`);
          return false;
        }

        // Calculate amount transferred
        const preAmount = preBalance ? parseFloat(preBalance.uiTokenAmount.amount) : 0;
        const postAmount = parseFloat(postBalance.uiTokenAmount.amount);
        const transferredAmount = postAmount - preAmount;

        // Verify amount (allow small rounding differences)
        if (Math.abs(transferredAmount - expectedAmount) > 1) {
          console.error(`Amount mismatch: expected ${expectedAmount}, got ${transferredAmount}`);
          return false;
        }

        return true;
      }

      console.error('No matching transfer found for recipient');
      return false;
    } catch (error) {
      console.error("Verification error:", error);
      return false;
    }
  }

  async verifyPaymentResponse(
    payment: X402PaymentResponse,
    expectedAmount: number,
    expectedRecipient?: PublicKey,
    expectedMint?: PublicKey
  ): Promise<boolean> {
    if (!payment.verified) {
      return false;
    }

    if (payment.transactionSignature) {
      return await this.verifyTransaction(
        payment.transactionSignature,
        expectedAmount,
        expectedRecipient || this.config.recipient,
        expectedMint || this.config.usdcMint
      );
    }

    if (payment.channelUpdate) {
      return await this.verifyChannelUpdate(payment.channelUpdate);
    }

    return false;
  }

  private async verifyChannelUpdate(update: string): Promise<boolean> {
    throw new Error("Channel verification not yet implemented");
  }
}