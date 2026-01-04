# Solpay x402 Demo API

A demonstration API showing HTTP 402 payment integration with Solana.

## Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables:
- `RECIPIENT_WALLET`: Your Solana wallet public key
- `RPC_URL`: Solana RPC endpoint (default: devnet)
- `USDC_MINT`: USDC token mint address
- `PORT`: API server port (default: 4021)

3. Install dependencies:
```bash
pnpm install
```

4. Start the development server:
```bash
pnpm dev
```

## Testing Payment Flow

### 1. Request without payment:
```bash
curl http://localhost:4021/api/premium
```

Response (402):
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

### 2. Create payment and retry with X-Payment header:
```bash
curl http://localhost:4021/api/premium \
  -H "X-Payment: BASE64_ENCODED_PAYMENT_DATA"
```

## Endpoints

- `GET /` - API information
- `GET /api/premium` - Premium content (requires 0.001 USDC payment)
- `GET /api/data` - Data API (requires 0.0005 USDC payment)
