import { Request, Response, NextFunction } from "express";
import { SolpayMiddlewareOptions, X402ErrorResponse } from "@solpay/types";
import { Connection } from "@solana/web3.js";

export function createSolpayMiddleware(options: SolpayMiddlewareOptions) {
  const connection = new Connection(options.config.rpcUrl, "confirmed");

  return async (req: Request, res: Response, next: NextFunction) => {
    const route = options.routes.find((r) => req.path === r.path);

    if (!route) {
      return next();
    }

    const xPaymentHeader = req.header("X-Payment");

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

      return res.status(402).json(errorResponse);
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

      next();
    } catch (error) {
      if (options.onPaymentFailed) {
        await options.onPaymentFailed(error as Error);
      }

      return res.status(402).json({
        error: "Invalid payment",
        message: (error as Error).message,
      });
    }
  };
}