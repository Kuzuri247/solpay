'use client';

import { useEffect, useState, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { findReference, FindReferenceError, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

interface TransactionStatusProps {
  reference: PublicKey | null;
  amount: BigNumber;
  recipient: PublicKey;
  onStatusChange?: (status: 'pending' | 'confirmed' | 'error') => void;
}

export default function TransactionStatus({ 
  reference, 
  amount,
  recipient,
  onStatusChange 
}: TransactionStatusProps) {
  const [status, setStatus] = useState<'idle' | 'searching' | 'confirmed' | 'error'>('idle');
  const [signature, setSignature] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [attempts, setAttempts] = useState(0);

  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const checkPayment = useCallback(async () => {
    if (!reference) return;

    setStatus('searching');
    setAttempts(prev => prev + 1);

    try {
      console.log(`Checking for transaction... Attempt ${attempts + 1}`);
      
      // Find transaction with reference
      const signatureInfo = await findReference(connection, reference, {
        finality: 'confirmed'
      });

      console.log('Transaction found:', signatureInfo.signature);
      setSignature(signatureInfo.signature);

      // Validate the transfer
      try {
        await validateTransfer(
          connection,
          signatureInfo.signature,
          {
            recipient,
            amount,
            splToken: undefined,
            reference,
          },
          { commitment: 'confirmed' }
        );

        console.log('Payment validated successfully');
        setStatus('confirmed');
        onStatusChange?.('confirmed');
        
      } catch (validationError) {
        console.error('Payment validation failed:', validationError);
        setError('Payment amount or recipient mismatch');
        setStatus('error');
        onStatusChange?.('error');
      }

    } catch (error: any) {
      // Transaction not found yet - this is expected while waiting
      if (error instanceof FindReferenceError) {
        console.log('Transaction not found yet, continuing to poll...');
        return;
      }

      // Other errors
      console.error('Error checking payment:', error);
      if (attempts > 60) { // Stop after 60 attempts (2 minutes)
        setError('Payment verification timeout');
        setStatus('error');
        onStatusChange?.('error');
      }
    }
  }, [reference, connection, amount, recipient, attempts, onStatusChange]);

  useEffect(() => {
    if (!reference || status === 'confirmed' || status === 'error') {
      return;
    }

    // Poll every 2 seconds
    const interval = setInterval(checkPayment, 2000);

    // Initial check
    checkPayment();

    // Cleanup
    return () => clearInterval(interval);
  }, [reference, checkPayment, status]);

  if (!reference) {
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Waiting for payment request...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold mb-2 text-gray-800">Transaction Status</h3>
      
      {status === 'idle' && (
        <p className="text-sm text-gray-600">Ready to monitor payment</p>
      )}

      {status === 'searching' && (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
          <p className="text-sm text-gray-600">
            Searching for payment... (Attempt {attempts})
          </p>
        </div>
      )}

      {status === 'confirmed' && (
        <div className="space-y-2">
          <p className="text-sm text-green-600 font-semibold">✓ Payment Confirmed!</p>
          {signature && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Signature:</p>
              <code className="text-xs bg-white p-2 rounded block break-all">
                {signature}
              </code>
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline block mt-2"
              >
                View on Solana Explorer →
              </a>
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 font-semibold">✗ Verification Failed</p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {reference && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Reference:</p>
          <code className="text-xs bg-white p-2 rounded block break-all mt-1">
            {reference.toString()}
          </code>
        </div>
      )}
    </div>
  );
}
