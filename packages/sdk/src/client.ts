import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  X402Config,
  X402PaymentRequest,
  X402PaymentResponse,
} from "@solpay/types";

export class SolpayClient {
  private connection: Connection;
  private config: X402Config;

  constructor(config: X402Config) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
  }

  async createPayment(
    request: X402PaymentRequest,
    payer: Keypair
  ): Promise<X402PaymentResponse> {
    try {
      if (request.scheme === "channel" && this.config.channelEnabled) {
        return await this.createChannelPayment(request, payer);
      }

      return await this.createExactPayment(request, payer);
    } catch (error) {
      throw new Error(`Payment creation failed: ${(error as Error).message}`);
    }
  }

  private async createExactPayment(
    request: X402PaymentRequest,
    payer: Keypair
  ): Promise<X402PaymentResponse> {
    const payerTokenAccount = await getAssociatedTokenAddress(
      this.config.usdcMint,
      payer.publicKey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      this.config.usdcMint,
      new PublicKey(request.recipient)
    );

    const transaction = new Transaction().add(
      createTransferInstruction(
        payerTokenAccount,
        recipientTokenAccount,
        payer.publicKey,
        request.amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await this.connection.sendTransaction(transaction, [
      payer,
    ]);
    await this.connection.confirmTransaction(signature, "confirmed");

    return {
      transactionSignature: signature,
      timestamp: Date.now(),
      verified: true,
    };
  }

  private async createChannelPayment(
    request: X402PaymentRequest,
    payer: Keypair
  ): Promise<X402PaymentResponse> {
    throw new Error("Channel payments not yet implemented");
  }

  async verifyPayment(signature: string): Promise<boolean> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      return tx !== null && !tx.meta?.err;
    } catch {
      return false;
    }
  }

  encodePaymentHeader(payment: X402PaymentResponse): string {
    return Buffer.from(JSON.stringify(payment)).toString("base64");
  }

  decodePaymentHeader(header: string): X402PaymentResponse {
    return JSON.parse(Buffer.from(header, "base64").toString());
  }
}