import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js';

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta') || 'devnet';
const COMMITMENT: Commitment = 'confirmed';

export const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl(NETWORK),
  COMMITMENT
);

export const MERCHANT_WALLET = process.env.NEXT_PUBLIC_MERCHANT_WALLET || '';

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}
