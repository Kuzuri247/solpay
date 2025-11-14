'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface PaymentFormProps {
  onPaymentCreated: (reference: PublicKey) => void;
}

export default function PaymentForm({ onPaymentCreated }: PaymentFormProps) {
  const [amount, setAmount] = useState<string>('0.001');
  const [recipient, setRecipient] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate payment request
      const reference = PublicKey.unique();
      onPaymentCreated(reference);
      
      // Show success message
      alert('Payment request created! Scan QR code to complete.');
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to create payment request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium mb-2">
          Amount (SOL)
        </label>
        <input
          type="number"
          step="0.001"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          Recipient Address (Optional)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Merchant wallet address"
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 text-white p-3 rounded font-semibold hover:bg-purple-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Payment Request'}
      </button>
    </form>
  );
}
