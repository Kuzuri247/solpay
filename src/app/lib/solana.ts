import { Connection, PublicKey, Commitment, clusterApiUrl } from '@solana/web3.js';

const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet-beta' | 'testnet') || 'devnet';
const COMMITMENT: Commitment = 'confirmed';


export const connection = new Connection(
  process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl(NETWORK),
  COMMITMENT
);


export const MERCHANT_WALLET = process.env.NEXT_PUBLIC_MERCHANT_WALLET || '';


export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}


export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}


export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}


export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}


export function formatSOL(lamports: number, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return `${sol.toFixed(decimals)} SOL`;
}


export function getExplorerUrl(
  signature: string, 
  cluster: string = NETWORK
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
}

export function getAddressExplorerUrl(
  address: string,
  cluster: string = NETWORK
): string {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${clusterParam}`;
}


export function isMainnet(): boolean {
  return NETWORK === 'mainnet-beta';
}


export function getNetworkName(): string {
  return NETWORK === 'mainnet-beta' ? 'Mainnet' : 
         NETWORK === 'devnet' ? 'Devnet' : 
         NETWORK === 'testnet' ? 'Testnet' : 
         'Unknown';
}


export async function confirmTransaction(
  signature: string,
  timeoutMs: number = 30000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.confirmationStatus === 'confirmed' || 
        status.value?.confirmationStatus === 'finalized') {
      return;
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Transaction confirmation timeout');
}


export async function getBalance(address: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(address);
  return lamportsToSol(lamports);
}


export function isValidAmount(
  amount: number, 
  min: number = 0.000001, 
  max: number = 1000
): boolean {
  return amount >= min && amount <= max && !isNaN(amount);
}
