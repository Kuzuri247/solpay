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

// Temporary in-memory storage (replace with database later)
interface PaymentRequest {
  recipient: string;
  amount: string;
  reference: string;
  label: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'expired';
}

const paymentRequests = new Map<string, PaymentRequest>();

// Clean up expired payments (older than 5 minutes)
function cleanupExpired() {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  
  for (const [key, payment] of paymentRequests.entries()) {
    if (now - payment.timestamp > FIVE_MINUTES && payment.status === 'pending') {
      payment.status = 'expired';
    }
  }
}

// GET handler - Returns merchant info to wallet
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

// POST handler - Creates and returns transaction
export async function POST(request: NextRequest) {
  try {
    cleanupExpired();
    
    // Parse request body
    const body = await request.json();
    const { account } = body;

    // Validate account parameter
    if (!account) {
      return NextResponse.json(
        { error: 'Missing account field' },
        { status: 400 }
      );
    }

    // Validate merchant wallet is configured
    if (!MERCHANT_WALLET) {
      console.error('MERCHANT_WALLET_ADDRESS not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse public keys
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

    // Generate unique reference for tracking
    const referenceKeypair = Keypair.generate();
    const reference = referenceKeypair.publicKey;

    console.log('Creating payment request:', {
      account: accountPubkey.toString(),
      recipient: recipientPubkey.toString(),
      reference: reference.toString(),
    });

    // Get recent blockhash with retry logic
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

    // Create transaction
    const transaction = new Transaction({
      feePayer: accountPubkey,
      blockhash,
      lastValidBlockHeight,
    });

    // Define payment amount (hardcoded for now, make dynamic later)
    const paymentAmount = 0.001; // 0.001 SOL
    const lamports = paymentAmount * LAMPORTS_PER_SOL;

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: accountPubkey,
      toPubkey: recipientPubkey,
      lamports: Math.floor(lamports),
    });

    // Add reference as read-only key for tracking
    transferInstruction.keys.push({
      pubkey: reference,
      isSigner: false,
      isWritable: false,
    });

    transaction.add(transferInstruction);

    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base64Transaction = serializedTransaction.toString('base64');
    const message = `Thank you for your payment of ${paymentAmount} SOL!`;

    // Store payment request for verification
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

    // Return transaction to wallet
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
