import { NextRequest, NextResponse } from 'next/server';
import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair
} from '@solana/web3.js';
import BigNumber from 'bignumber.js';

// Environment configuration
const MERCHANT_WALLET = process.env.MERCHANT_WALLET_ADDRESS!;
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

// Payment request storage interface
interface PaymentRequest {
  recipient: string;
  amount: string;
  reference: string;
  label: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'expired';
}

// In-memory storage (replace with database in production)
const paymentRequests = new Map<string, PaymentRequest>();

// Cleanup function - removes expired payment requests
function cleanupExpired() {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  for (const [key, payment] of paymentRequests.entries()) {
    if (now - payment.timestamp > FIVE_MINUTES && payment.status === 'pending') {
      payment.status = 'expired';
    }
  }
}

// GET handler - Returns merchant information to wallet apps
export async function GET(request: NextRequest) {
  const label = process.env.NEXT_PUBLIC_STORE_NAME || 'SolPay Merchant';
  const icon = 'https://solana.com/src/img/branding/solanaLogoMark.svg';
  
  return NextResponse.json(
    { label, icon },
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );
}

// POST handler - Creates and returns payment transaction
export async function POST(request: NextRequest) {
  try {
    // Clean up old payment requests
    cleanupExpired();
    
    // Parse request body from wallet
    const body = await request.json();
    const { account } = body;

    // Validate required account field
    if (!account) {
      return NextResponse.json(
        { error: 'Missing account field' },
        { status: 400 }
      );
    }

    // Ensure merchant wallet is configured
    if (!MERCHANT_WALLET) {
      console.error('MERCHANT_WALLET_ADDRESS not configured in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate public keys
    let accountPubkey: PublicKey;
    let recipientPubkey: PublicKey;
    
    try {
      accountPubkey = new PublicKey(account);
      recipientPubkey = new PublicKey(MERCHANT_WALLET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid public key format' },
        { status: 400 }
      );
    }

    // Generate unique reference key for tracking this transaction
    const referenceKeypair = Keypair.generate();
    const reference = referenceKeypair.publicKey;

    console.log('Creating payment request:', {
      account: accountPubkey.toString(),
      recipient: recipientPubkey.toString(),
      reference: reference.toString(),
    });

    // Fetch recent blockhash from Solana network
    let blockhash: string;
    let lastValidBlockHeight: number;
    
    try {
      const blockhashResponse = await connection.getLatestBlockhash('confirmed');
      blockhash = blockhashResponse.blockhash;
      lastValidBlockHeight = blockhashResponse.lastValidBlockHeight;
    } catch (error) {
      console.error('Failed to get blockhash:', error);
      return NextResponse.json(
        { error: 'Failed to connect to Solana network' },
        { status: 503 }
      );
    }

    // Create new transaction
    const transaction = new Transaction({
      feePayer: accountPubkey,
      blockhash,
      lastValidBlockHeight,
    });

    // Define payment amount (0.001 SOL for testing)
    const paymentAmount = 0.001;
    const lamports = paymentAmount * LAMPORTS_PER_SOL;

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: accountPubkey,
      toPubkey: recipientPubkey,
      lamports: Math.floor(lamports),
    });

    // Add reference as a read-only, non-signing key
    // This allows us to find this specific transaction later
    transferInstruction.keys.push({
      pubkey: reference,
      isSigner: false,
      isWritable: false,
    });

    // Add instruction to transaction
    transaction.add(transferInstruction);

    // Serialize transaction to base64 for wallet to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');
    const message = `Thank you for your payment of ${paymentAmount} SOL!`;

    // Store payment request for later verification
    const paymentData: PaymentRequest = {
      recipient: recipientPubkey.toString(),
      amount: paymentAmount.toString(),
      reference: reference.toString(),
      label: 'SolPay Payment',
      message,
      timestamp: Date.now(),
      status: 'pending',
    };

    paymentRequests.set(reference.toString(), paymentData);

    console.log('Payment request created successfully:', reference.toString());

    // Return transaction to wallet for signing
    return NextResponse.json(
      { 
        transaction: base64Transaction, 
        message 
      },
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
