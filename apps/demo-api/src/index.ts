import express from "express";
import { createSolpayMiddleware } from "@solpay/middleware";
import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4021;

if (!process.env.RECIPIENT_WALLET || !process.env.USDC_MINT) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const solpayMiddleware = createSolpayMiddleware({
  config: {
    recipient: new PublicKey(process.env.RECIPIENT_WALLET),
    rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
    network: "devnet",
    usdcMint: new PublicKey(process.env.USDC_MINT),
  },
  routes: [
    {
      path: "/api/premium",
      price: 1000,
      scheme: "exact",
      description: "Premium content access",
    },
    {
      path: "/api/data",
      price: 500,
      scheme: "exact",
      description: "Data API endpoint",
    },
  ],
  onPaymentVerified: async (payment) => {
    console.log("Payment verified:", payment.transactionSignature);
  },
  onPaymentFailed: async (error) => {
    console.error("Payment failed:", error.message);
  },
});

app.use(express.json());
app.use(solpayMiddleware);

app.get("/", (req, res) => {
  res.json({
    message: "Solpay x402 Demo API",
    version: "0.1.0",
    endpoints: [
      {
        path: "/api/premium",
        price: "0.001 USDC",
        description: "Premium content endpoint",
      },
      {
        path: "/api/data",
        price: "0.0005 USDC",
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
  console.log(`Demo API running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.RPC_URL || "devnet"}`);
  console.log(`Recipient: ${process.env.RECIPIENT_WALLET}`);
});