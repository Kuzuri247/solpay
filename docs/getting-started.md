# Getting Started with Solpay x402

This guide will walk you through integrating Solpay x402 into your application.

## Prerequisites

- Node.js 18 or higher
- Basic understanding of Solana
- A Solana wallet for receiving payments
- USDC on devnet (for testing)

## Installation

```bash
pnpm add @solpay/middleware @solpay/sdk @solpay/types
```

Or with npm:

```bash
npm install @solpay/middleware @solpay/sdk @solpay/types
```

## Basic Setup

### 1. Configure Environment Variables

Create a `.env` file:

```env
RECIPIENT_WALLET=YOUR_SOLANA_WALLET_ADDRESS
RPC_URL=https://api.devnet.solana.com
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

**Note**: The USDC mint address above is for Solana devnet. For mainnet, use: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### 2. Express Integration

```typescript
import express from "express";
import { createSolpayMiddleware } from "@solpay/middleware";
import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Create Solpay middleware
const solpay = createSolpayMiddleware({
  config: {
    recipient: new PublicKey(process.env.RECIPIENT_WALLET!),
    rpcUrl: process.env.RPC_URL!,
    network: "devnet",
    usdcMint: new PublicKey(process.env.USDC_MINT!),
  },
  routes: [
    {
      path: "/api/premium",
      price: 1000, // 1000 base units = 0.001 USDC (USDC has 6 decimals)
      scheme: "exact",
      description: "Premium content",
    },
  ],
  onPaymentVerified: (payment) => {
    console.log("Payment verified:", payment.transactionSignature);
  },
});

// Apply middleware
app.use(solpay);

// Protected route
app.get("/api/premium", (req, res) => {
  res.json({
    data: "This is premium content!",
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

// middleware.ts
import { NextRequest } from 'next/server';
import { createSolpayNextMiddleware } from "@solpay/middleware";
import { PublicKey } from "@solana/web3.js";

const solpayMiddleware = createSolpayNextMiddleware({
  config: {
    recipient: new PublicKey(process.env.RECIPIENT_WALLET!),
    rpcUrl: process.env.RPC_URL!,
    network: "devnet",
    usdcMint: new PublicKey(process.env.USDC_MINT!),
  },
  routes: [
    {
      path: "/api/premium",
      price: 1000, // Base units
      scheme: "exact",
    },
  ],
});

export async function middleware(request: NextRequest) {
  return solpayMiddleware(request);
}

export const config = {
  matcher: "/api/:path*",
};

## Understanding Price Units

**Important**: All prices in Solpay are specified in base units (smallest denomination).

- **USDC has 6 decimals**: 1 USDC = 1,000,000 base units
- **Example**: `price: 1000` = 0.001 USDC
- **Example**: `price: 500` = 0.0005 USDC

This ensures precision and avoids floating-point issues in payment calculations.

## Payment Flow

### Client Side

```typescript
import { SolpayClient } from "@solpay/sdk";
import { PublicKey, Keypair } from "@solana/web3.js";

// Initialize client
const client = new SolpayClient({
  recipient: new PublicKey("RECIPIENT_ADDRESS"),
  rpcUrl: "https://api.devnet.solana.com",
  network: "devnet",
  usdcMint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
});

// Create payment
const payment = await client.createPayment(
  {
    amount: 1000, // Base units
    currency: "USDC",
    recipient: "RECIPIENT_ADDRESS",
    scheme: "exact",
  },
  payerKeypair
);

// Encode for header
const paymentHeader = client.encodePaymentHeader(payment);

// Make request with payment
const response = await fetch("http://localhost:3000/api/premium", {
  headers: {
    "X-Payment": paymentHeader,
  },
});
```

## Configuration Options

### Middleware Options

```typescript
interface SolpayMiddlewareOptions {
  config: {
    recipient: PublicKey;        // Your wallet address
    rpcUrl: string;              // Solana RPC endpoint
    network: "devnet" | "mainnet-beta";
    usdcMint: PublicKey;         // USDC token mint
    facilitatorUrl?: string;     // Optional facilitator
    channelEnabled?: boolean;    // Enable payment channels
  };
  routes: Array<{
    path: string;                // Route to protect
    price: number;               // Price in base units
    scheme?: "exact" | "channel"; // Payment scheme
    description?: string;        // Human-readable description
    metadata?: Record<string, unknown>;
  }>;
  onPaymentVerified?: (payment) => void | Promise<void>;
  onPaymentFailed?: (error) => void | Promise<void>;
  onError?: (error) => void;
}
```

## Testing

### 1. Request Without Payment

```bash
curl http://localhost:3000/api/premium
```

Expected response (402):
```json
{
  "error": "Payment Required",
  "accepts": [
    {
      "scheme": "exact",
      "amount": 1000,
      "currency": "USDC",
      "recipient": "YOUR_WALLET_ADDRESS"
    }
  ]
}
```

### 2. Get Devnet USDC

```bash
# Get devnet SOL
solana airdrop 2

# Use faucet for devnet USDC
# Visit: https://spl-token-faucet.com
```

### 3. Create Payment and Retry

Use the SDK to create a payment and include the proof in the `X-Payment` header.

## Common Use Cases

### API Rate Limiting

```typescript
const solpay = createSolpayMiddleware({
  config: { /* ... */ },
  routes: [
    { path: "/api/basic", price: 100 },     // 0.0001 USDC
    { path: "/api/standard", price: 500 },  // 0.0005 USDC
    { path: "/api/premium", price: 1000 },  // 0.001 USDC
  ],
});
```

### Content Paywall

```typescript
app.get("/article/:id", solpayMiddleware, async (req, res) => {
  const article = await getArticle(req.params.id);
  res.json({ article });
});
```

### AI Agent Payments

```typescript
// Agent pays per LLM request
const solpay = createSolpayMiddleware({
  config: { /* ... */ },
  routes: [
    { path: "/api/llm/query", price: 50 }, // 0.00005 USDC per query
  ],
});
```

## Troubleshooting

### Payment Verification Fails

- Check transaction is confirmed on-chain
- Verify correct RPC endpoint
- Ensure sufficient SOL for transaction fees
- Check wallet has USDC balance
- Verify using correct USDC mint for network (devnet vs mainnet)

### 402 Response Always Returned

- Verify `X-Payment` header is properly formatted
- Check payment signature is valid
- Ensure transaction sent to correct recipient

### TypeScript Errors

- Install type definitions: `@solpay/types`
- Check TypeScript version (5.0+)
- Verify imports are correct

## Next Steps

- Explore [demo applications](../apps/demo-api)
- Read [API reference](./api-reference.md)
- Join community Discord
- Review [examples](../packages/examples)

## Resources

- [Solana Documentation](https://docs.solana.com)
- [x402 Standard](https://www.x402.org)
- [GitHub Repository](https://github.com/Kuzuri247/solpay)