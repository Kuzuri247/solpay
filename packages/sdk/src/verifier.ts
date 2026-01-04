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
    expectedRecipient: PublicKey
  ): Promise<boolean> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Verification error:", error);
      return false;
    }
  }

  async verifyPaymentResponse(
    payment: X402PaymentResponse,
    expectedAmount: number
  ): Promise<boolean> {
    if (!payment.verified) {
      return false;
    }

    if (payment.transactionSignature) {
      return await this.verifyTransaction(
        payment.transactionSignature,
        expectedAmount,
        this.config.recipient
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