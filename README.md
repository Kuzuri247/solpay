# Solpay x402

HTTP 402 payment infrastructure for Solana APIs, content monetization, and AI agent micropayments.

## Overview

Solpay x402 transforms any API or content endpoint into a monetizable resource using the x402 HTTP payment standard on Solana. Built for developers who want to implement pay-per-call APIs, premium content gates, or AI agent payment flows with minimal code.

## Features

- Drop-in middleware for Express and Next.js
- Support for on-chain exact payments and payment channels
- TypeScript-first with full type safety
- USDC-native with configurable token support
- Facilitator and native payment modes
- Built-in payment verification
- Monorepo architecture for scalability

## Quick Start

### Installation

```bash
pnpm add @solpay/middleware @solpay/sdk @solpay/types
```

### Express Example

```typescript
import express from "express";
import { createSolpayMiddleware } from "@solpay/middleware";
import { PublicKey } from "@solana/web3.js";

const app = express();

const solpay = createSolpayMiddleware({
  config: {
    recipient: new PublicKey("YOUR_WALLET_ADDRESS"),
    rpcUrl: "https://api.devnet.solana.com",
    network: "devnet",
    usdcMint: new PublicKey("USDC_MINT_ADDRESS"),
  },
  routes: [
    {
      path: "/api/premium",
      price: 1000, // 0.001 USDC (6 decimals)
      scheme: "exact",
    },
  ],
});

app.use(solpay);

app.get("/api/premium", (req, res) => {
  res.json({ data: "Premium content" });
});

app.listen(3000);
```

## Use Cases

- **API Monetization**: Pay-per-request pricing for APIs
- **Content Paywalls**: Premium content gates for creators
- **AI Agent Payments**: Micropayments for tool usage and data access
- **Data Marketplaces**: Monetize data and analytics endpoints
- **ML Model Inference**: Pay-per-call for LLM and ML models

## Architecture

Solpay x402 uses a modular monorepo structure:

- `@solpay/sdk` - Client SDK for payment creation and verification
- `@solpay/middleware` - Server middleware for Express and Next.js
- `@solpay/types` - Shared TypeScript types
- Demo applications and examples

## Project Structure

```
solpay-x402/
├── packages/
│   ├── sdk/           # Core payment SDK
│   ├── middleware/    # Express & Next.js middleware
│   └── types/         # TypeScript definitions
├── apps/
│   └── demo-api/      # Example API implementation
├── docs/              # Documentation
└── turbo.json         # Turborepo configuration
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+
- Solana CLI (for testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/Kuzuri247/solpay.git
cd solpay

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run development mode
pnpm dev
```

## How It Works

### Payment Flow

1. Client requests protected endpoint
2. Server responds with 402 status and payment requirements
3. Client creates and sends payment transaction
4. Client retries request with `X-Payment` header containing transaction proof
5. Server verifies payment and returns content

### Example Flow

```bash
# 1. Request without payment
curl http://localhost:4021/api/premium

# Response: 402 Payment Required
{
  "error": "Payment Required",
  "accepts": [{
    "scheme": "exact",
    "amount": 1000,
    "currency": "USDC",
    "recipient": "WALLET_ADDRESS"
  }]
}

# 2. Create payment and retry with proof
curl http://localhost:4021/api/premium \
  -H "X-Payment: <base64-encoded-payment-proof>"

# Response: 200 OK with content
```

## Grant Application

This project is being developed for Solana ecosystem grants. We aim to provide production-ready x402 infrastructure that enables developers to monetize APIs and content with minimal integration effort.

See [docs/grant-proposal.md](docs/grant-proposal.md) for complete grant proposal details.

## Roadmap

### Phase 1: Core Infrastructure (Complete)
- ✅ SDK with payment creation and verification
- ✅ Express and Next.js middleware
- ✅ TypeScript type definitions
- ✅ Basic demo application

### Phase 2: Developer Experience (In Progress)
- 🚧 Developer dashboard
- 🚧 Comprehensive documentation
- 🚧 Starter templates and examples

### Phase 3: Advanced Features (Planned)
- ⏳ Payment channel integration
- ⏳ Facilitator mode support
- ⏳ Analytics and monitoring
- ⏳ Multi-token support

### Phase 4: Community & Growth (Planned)
- ⏳ Hackathon templates
- ⏳ Video tutorials
- ⏳ Ecosystem integrations

## Resources

- [x402 Standard](https://www.x402.org)
- [Solana x402 Guide](https://solana.com/developers/guides/getstarted/intro-to-x402)
- [Solana Documentation](https://docs.solana.com)
- [Grant Program](https://solana.org/grants-funding)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/Kuzuri247/solpay/issues)
- Documentation: [docs/](docs/)
- Examples: [apps/demo-api/](apps/demo-api/)

## Status

**Development Status**: Active development on Solana Devnet

This project is under active development. APIs and features are subject to change. Not recommended for production use until v1.0 release.
