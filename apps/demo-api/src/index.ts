import express from "express";
import { createSolpayMiddleware } from "@solpay/middleware";
import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4021;

// Validate required environment variables exist
if (!process.env.RECIPIENT_WALLET || !process.env.USDC_MINT) {
  console.error("[ERROR] Missing required environment variables: RECIPIENT_WALLET and/or USDC_MINT");
  process.exit(1);
}

// Validate RECIPIENT_WALLET format
let recipientPubkey: PublicKey;
try {
  recipientPubkey = new PublicKey(process.env.RECIPIENT_WALLET);
  if (!PublicKey.isOnCurve(recipientPubkey.toBytes())) {
    throw new Error('Address is not on the ed25519 curve');
  }
} catch (error) {
  console.error(`[ERROR] Invalid RECIPIENT_WALLET: ${process.env.RECIPIENT_WALLET}`);
  console.error(`        Error: ${(error as Error).message}`);
  console.error(`        Please provide a valid Solana public key address`);
  process.exit(1);
}

// Validate USDC_MINT format
let usdcMintPubkey: PublicKey;
try {
  usdcMintPubkey = new PublicKey(process.env.USDC_MINT);
  if (!PublicKey.isOnCurve(usdcMintPubkey.toBytes())) {
    throw new Error('Address is not on the ed25519 curve');
  }
} catch (error) {
  console.error(`[ERROR] Invalid USDC_MINT: ${process.env.USDC_MINT}`);
  console.error(`        Error: ${(error as Error).message}`);
  console.error(`        Expected devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`);
  console.error(`        Expected mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`);
  process.exit(1);
}

const solpayMiddleware = createSolpayMiddleware({
  config: {
    recipient: recipientPubkey,
    rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
    network: "devnet",
    usdcMint: usdcMintPubkey,
  },
  routes: [
    {
      path: "/api/premium",
      price: 1000, // 1000 base units = 0.001 USDC (6 decimals)
      scheme: "exact",
      description: "Premium content access",
    },
    {
      path: "/api/data",
      price: 500, // 500 base units = 0.0005 USDC (6 decimals)
      scheme: "exact",
      description: "Data API endpoint",
    },
  ],
  onPaymentVerified: async (payment) => {
    console.log("[SUCCESS] Payment verified:", payment.transactionSignature);
  },
  onPaymentFailed: async (error) => {
    console.error("[ERROR] Payment failed:", error.message);
  },
});

app.use(express.json());
app.use(solpayMiddleware);

app.get("/", (req, res) => {
  res.json({
    message: "Solpay x402 Demo API",
    version: "0.1.0",
    note: "All prices are in base units. For USDC: 1,000,000 base units = 1 USDC",
    endpoints: [
      {
        path: "/api/premium",
        price: "1000 base units (0.001 USDC)",
        description: "Premium content endpoint",
      },
      {
        path: "/api/data",
        price: "500 base units (0.0005 USDC)",
        description: "Data API endpoint",
      },
    ],
  });
});

app.get("/api/premium", (req, res) => {
  res.json({
    message: "Premium content unlocked",
    data: {
      content: "This is premium content only accessible after payment",
      timestamp: new Date().toISOString(),
    },
  });
});

app.get("/api/data", (req, res) => {
  res.json({
    message: "Data endpoint",
    data: {
      results: [
        { id: 1, value: "Data point 1" },
        { id: 2, value: "Data point 2" },
        { id: 3, value: "Data point 3" },
      ],
      timestamp: new Date().toISOString(),
    },
  });
});

app.listen(PORT, () => {
  console.log(`[INFO] Demo API running on http://localhost:${PORT}`);
  console.log(`[INFO] Network: ${process.env.RPC_URL || "devnet"}`);
  console.log(`[INFO] Recipient: ${process.env.RECIPIENT_WALLET}`);
  console.log(`[INFO] USDC Mint: ${process.env.USDC_MINT}`);
});