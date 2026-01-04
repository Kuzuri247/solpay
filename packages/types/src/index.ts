import { PublicKey } from "@solana/web3.js";

export interface X402PaymentRequest {
  amount: number;
  currency: "USDC" | "SOL";
  recipient: string;
  scheme: "exact" | "channel" | "upto";
  metadata?: Record<string, unknown>;
}

export interface X402PaymentResponse {
  transactionSignature?: string;
  channelUpdate?: string;
  timestamp: number;
  verified: boolean;
}

export interface X402Config {
  recipient: PublicKey;
  rpcUrl: string;
  network: "devnet" | "mainnet-beta";
  usdcMint: PublicKey;
  facilitatorUrl?: string;
  channelEnabled?: boolean;
}

export interface ProtectedRouteConfig {
  path: string;
  price: number;
  scheme?: "exact" | "channel";
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SolpayMiddlewareOptions {
  config: X402Config;
  routes: ProtectedRouteConfig[];
  onPaymentVerified?: (payment: X402PaymentResponse) => void | Promise<void>;
  onPaymentFailed?: (error: Error) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface X402Headers {
  "X-Payment"?: string;
  "WWW-Authenticate"?: string;
}

export interface X402ErrorResponse {
  error: string;
  accepts: Array<{
    scheme: "exact" | "channel" | "upto";
    amount: number;
    currency: string;
    recipient: string;
    metadata?: Record<string, unknown>;
  }>;
}