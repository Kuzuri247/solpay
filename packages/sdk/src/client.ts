import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
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
    // Validate RPC URL
    if (!config.rpcUrl || typeof config.rpcUrl !== 'string' || config.rpcUrl.trim() === '') {
      throw new Error('Invalid config: rpcUrl must be a non-empty string');
    }

    // Validate recipient PublicKey
    try {
      if (!config.recipient) {
        throw new Error('Recipient is required');
      }
      // Verify it's a valid PublicKey
      new PublicKey(config.recipient.toString());
    } catch (error) {
      throw new Error(`Invalid config: recipient must be a valid Solana PublicKey. ${(error as Error).message}`);
    }

    // Validate USDC mint PublicKey
    try {
      if (!config.usdcMint) {
        throw new Error('USDC mint is required');
      }
      // Verify it's a valid PublicKey
      new PublicKey(config.usdcMint.toString());
    } catch (error) {
      throw new Error(`Invalid config: usdcMint must be a valid Solana PublicKey. ${(error as Error).message}`);
    }

    // Validate network
    const allowedNetworks = ['mainnet-beta', 'devnet'];
    if (!config.network || !allowedNetworks.includes(config.network)) {
      throw new Error(`Invalid config: network must be one of: ${allowedNetworks.join(', ')}`);
    }

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

  private validateRecipientAddress(recipient: string): PublicKey {
    try {
      // Check if string is not empty and looks like a valid base58 address
      if (!recipient || typeof recipient !== 'string' || recipient.trim() === '') {
        throw new Error('Recipient address cannot be empty');
      }

      // Attempt to create PublicKey
      const pubkey = new PublicKey(recipient);
      
      // Additional validation: ensure it's on the curve
      if (!PublicKey.isOnCurve(pubkey.toBytes())) {
        throw new Error('Recipient address is not on the ed25519 curve');
      }

      return pubkey;
    } catch (error) {
      throw new Error(`Invalid recipient address: ${(error as Error).message}`);
    }
  }

  private parseAmount(amount: number | string): bigint {
    try {
      // Convert to number if string
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

      if (isNaN(numAmount) || numAmount < 0) {
        throw new Error('Amount must be a positive number');
      }

      // Convert to base units (USDC has 6 decimals)
      // Use BigInt to avoid floating-point precision issues
      const baseUnits = BigInt(Math.round(numAmount * 1_000_000));

      if (baseUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('Amount exceeds maximum safe value');
      }

      return baseUnits;
    } catch (error) {
      throw new Error(`Invalid amount: ${(error as Error).message}`);
    }
  }

  private async ensureTokenAccount(
    mint: PublicKey,
    owner: PublicKey,
    payer: Keypair
  ): Promise<{ address: PublicKey; needsCreation: boolean }> {
    const associatedToken = await getAssociatedTokenAddress(
      mint,
      owner
    );

    try {
      // Check if account exists
      await getAccount(this.connection, associatedToken);
      return { address: associatedToken, needsCreation: false };
    } catch (error) {
      // Account doesn't exist
      return { address: associatedToken, needsCreation: true };
    }
  }

  private async createExactPayment(
    request: X402PaymentRequest,
    payer: Keypair
  ): Promise<X402PaymentResponse> {
    // Validate recipient
    const recipientPubkey = this.validateRecipientAddress(request.recipient);

    // Parse and convert amount to base units
    const amountInBaseUnits = this.parseAmount(request.amount);

    // Get or create payer's token account
    const payerTokenInfo = await this.ensureTokenAccount(
      this.config.usdcMint,
      payer.publicKey,
      payer
    );

    // Get or create recipient's token account
    const recipientTokenInfo = await this.ensureTokenAccount(
      this.config.usdcMint,
      recipientPubkey,
      payer
    );

    const transaction = new Transaction();

    // Add instruction to create payer's ATA if needed
    if (payerTokenInfo.needsCreation) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          payerTokenInfo.address,
          payer.publicKey,
          this.config.usdcMint
        )
      );
    }

    // Add instruction to create recipient's ATA if needed
    if (recipientTokenInfo.needsCreation) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer.publicKey,
          recipientTokenInfo.address,
          recipientPubkey,
          this.config.usdcMint
        )
      );
    }

    // Add transfer instruction with base units
    transaction.add(
      createTransferInstruction(
        payerTokenInfo.address,
        recipientTokenInfo.address,
        payer.publicKey,
        Number(amountInBaseUnits), // Convert BigInt to Number for instruction
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await this.connection.sendTransaction(transaction, [
      payer,
    ]);
    await this.connection.confirmTransaction(signature, "confirmed");

    // Verify the payment after confirmation
    const verified = await this.verifyPayment(
      signature,
      Number(amountInBaseUnits),
      recipientPubkey,
      this.config.usdcMint
    );

    return {
      transactionSignature: signature,
      timestamp: Date.now(),
      verified,
    };
  }

  private async createChannelPayment(
    request: X402PaymentRequest,
    payer: Keypair
  ): Promise<X402PaymentResponse> {
    throw new Error("Channel payments not yet implemented");
  }

  async verifyPayment(
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

        // Check if this is the recipient's account
        const accountKey = tx.transaction.message.accountKeys[postBalance.accountIndex];
        if (!accountKey || accountKey.pubkey.toString() !== expectedRecipient.toString()) {
          // Find by owner instead
          const isRecipientAccount = postBalance.owner === expectedRecipient.toString();
          if (!isRecipientAccount) {
            continue;
          }
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

        // All checks passed
        return true;
      }

      // If we didn't find a matching transfer, check instructions
      const instructions = tx.transaction.message.instructions;
      for (const instruction of instructions) {
        if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
          const info = instruction.parsed.info;
          if (
            info.destination === expectedRecipient.toString() &&
            Math.abs(parseFloat(info.amount) - expectedAmount) <= 1
          ) {
            return true;
          }
        }
      }

      console.error('No matching transfer found in transaction');
      return false;
    } catch (error) {
      console.error('Payment verification error:', error);
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