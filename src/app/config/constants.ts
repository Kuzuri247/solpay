
export const SOLANA_PAY_CONFIG = {
 
  label: 'SolPay Merchant',
  icon: 'https://solana.com/src/img/branding/solanaLogoMark.svg',
  
 
  defaultAmount: 0.001,
 
  memo: 'SolPay Transaction',
  
  minAmount: 0.000001, 
  maxAmount: 1000,     
} as const;


export const UI_CONFIG = {
  
  qrSize: 300,
  
  pollInterval: 2000, 
  
  maxPollAttempts: 60,
  
  confirmationTimeout: 60000, 
  
  inputDebounceMs: 300,
} as const;


export const FEE_CONFIG = {
  estimatedFee: 0.000005,
  
  priorityFees: {
    none: 0,
    low: 1000,
    medium: 5000,
    high: 10000,
  },
} as const;

export const ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete payment',
  INVALID_AMOUNT: 'Please enter a valid payment amount',
  NETWORK_ERROR: 'Network connection error. Please try again.',
  WALLET_NOT_FOUND: 'Wallet not found. Please install a Solana wallet.',
  TRANSACTION_TIMEOUT: 'Transaction confirmation timeout',
  INVALID_ADDRESS: 'Invalid Solana address',
  MERCHANT_NOT_CONFIGURED: 'Merchant wallet not configured',
} as const;

export const SUCCESS_MESSAGES = {
  PAYMENT_CREATED: 'Payment request created successfully',
  PAYMENT_CONFIRMED: 'Payment received and confirmed',
  PAYMENT_CANCELLED: 'Payment cancelled',
} as const;

export const NETWORK_URLS = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  
  quicknode: process.env.NEXT_PUBLIC_QUICKNODE_URL || '',
  helius: process.env.NEXT_PUBLIC_HELIUS_URL || '',
} as const;

export const EXPLORER_URLS = {
  devnet: 'https://explorer.solana.com?cluster=devnet',
  testnet: 'https://explorer.solana.com?cluster=testnet',
  mainnet: 'https://explorer.solana.com',
} as const;

export const STORAGE_KEYS = {
  PAYMENT_HISTORY: 'solpay_payment_history',
  MERCHANT_PREFERENCES: 'solpay_merchant_prefs',
  LAST_NETWORK: 'solpay_last_network',
} as const;

export const API_ROUTES = {
  CREATE_PAYMENT: '/api/pay',
  VERIFY_PAYMENT: '/api/verify',
  PAYMENT_STATUS: '/api/status',
} as const;

export const VALIDATION_PATTERNS = {
  PUBLIC_KEY: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  
  SIGNATURE: /^[1-9A-HJ-NP-Za-km-z]{88}$/,
  
  SOL_AMOUNT: /^\d+(\.\d{1,9})?$/,
} as const;
