import { NextRequest, NextResponse } from "next/server";
import { SolpayMiddlewareOptions, X402ErrorResponse } from "@solpay/types";
import { Connection } from "@solana/web3.js";

export function createSolpayNextMiddleware(options: SolpayMiddlewareOptions) {
  const connection = new Connection(options.config.rpcUrl, "confirmed");

  return async (req: NextRequest) => {
    const pathname = new URL(req.url).pathname;
    const route = options.routes.find((r) => pathname === r.path);

    if (!route) {
      return NextResponse.next();
    }

    const xPaymentHeader = req.headers.get("X-Payment");

    if (!xPaymentHeader) {
      const errorResponse: X402ErrorResponse = {
        error: "Payment Required",
        accepts: [
          {
            scheme: route.scheme || "exact",
            amount: route.price,
            currency: "USDC",
            recipient: options.config.recipient.toString(),
            metadata: route.metadata,
          },
        ],
      };

      return NextResponse.json(errorResponse, { status: 402 });
    }

    try {
      const paymentData = JSON.parse(
        Buffer.from(xPaymentHeader, "base64").toString()
      );

      const signature = paymentData.transactionSignature;
      if (!signature) {
        throw new Error("Missing transaction signature");
      }

      const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) {
        throw new Error("Payment verification failed");
      }

      if (options.onPaymentVerified) {
        await options.onPaymentVerified(paymentData);
      }

      return NextResponse.next();
    } catch (error) {
      if (options.onPaymentFailed) {
        await options.onPaymentFailed(error as Error);
      }

      return NextResponse.json(
        {
          error: "Invalid payment",
          message: (error as Error).message,
        },
        { status: 402 }
      );
    }
  };
}