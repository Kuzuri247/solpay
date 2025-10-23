'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createQR, encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';
import Image from 'next/image';
import TransactionStatus from '../components/TransactionStatus';

export default function Home() {
  const [qrCode, setQrCode] = useState<string>('');
  const [reference, setReference] = useState<PublicKey | null>(null);
  const [amount] = useState(new BigNumber(0.001)); // 0.001 SOL
  const [recipient, setRecipient] = useState<PublicKey | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'error'>('pending');

  useEffect(() => {
    // Set recipient from environment
    const merchantWallet = process.env.NEXT_PUBLIC_MERCHANT_WALLET;
    if (merchantWallet) {
      setRecipient(new PublicKey(merchantWallet));
    }
    
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      // Create API URL for Solana Pay
      const apiUrl = `${window.location.protocol}//${window.location.host}/api/pay`;
      const label = 'SolPay Gateway';
      const message = 'Scan to pay with Solana';
      
      // Encode URL for Solana Pay
      const url = encodeURL({ 
        link: new URL(apiUrl), 
        label, 
        message 
      });
      
      console.log('Payment URL:', url.toString());
      
      // Create QR code
      const qr = createQR(url, 300, 'transparent');
      const qrBlob = await qr.getRawData('png');
      
      if (!qrBlob) {
        console.error('Failed to generate QR code');
        return;
      }
      
      // Convert to base64 for display
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          setQrCode(event.target.result);
        }
      };
      reader.readAsDataURL(qrBlob);

      // Generate reference for tracking (in production, get this from API)
      const newReference = PublicKey.unique();
      setReference(newReference);
      
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleRefresh = () => {
    setPaymentStatus('pending');
    setReference(null);
    setQrCode('');
    generateQRCode();
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            SolPay Gateway
          </h1>
          <p className="text-gray-600 text-lg">
            Fast, secure payments on Solana
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Scan to Pay
            </h2>
            
            {qrCode ? (
              <div className="flex flex-col items-center">
                <div className="border-4 border-purple-100 rounded-xl p-4 bg-white">
                  <Image
                    src={qrCode}
                    alt="Payment QR Code"
                    width={300}
                    height={300}
                    priority
                  />
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Amount: <span className="font-semibold">{amount.toString()} SOL</span>
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="text-purple-600 text-sm hover:underline"
                  >
                    Generate New Payment
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Status Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">
              Payment Status
            </h2>
            
            {recipient ? (
              <TransactionStatus
                reference={reference}
                amount={amount}
                recipient={recipient}
                onStatusChange={setPaymentStatus}
              />
            ) : (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Merchant wallet not configured. Please set NEXT_PUBLIC_MERCHANT_WALLET in .env.local
                </p>
              </div>
            )}

            {paymentStatus === 'confirmed' && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 font-semibold">
                  🎉 Payment received successfully!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            How to Pay
          </h3>
          <ol className="space-y-3 text-gray-600">
            <li className="flex gap-3">
              <span className="font-bold text-purple-600">1.</span>
              <span>Open your Solana wallet app (Phantom, Solflare, or Backpack)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-purple-600">2.</span>
              <span>Scan the QR code above</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-purple-600">3.</span>
              <span>Review the payment details and confirm</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-purple-600">4.</span>
              <span>Wait for confirmation (usually under 2 seconds!)</span>
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
