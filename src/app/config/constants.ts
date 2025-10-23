export const SOLANA_PAY_CONFIG = {
  label: 'SolPay Merchant',
  icon: 'https://solana.com/src/img/branding/solanaLogoMark.svg',
  defaultAmount: 0.001,
  memo: 'SolPay Transaction',
} as const;

export const UI_CONFIG = {
  qrSize: 300,
  pollInterval: 2000, // ms
  confirmationTimeout: 60000, // 1 minute
} as const;
