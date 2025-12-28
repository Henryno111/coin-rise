'use client';

import { useState } from 'react';
import { claimRewards, compoundRewards } from '@/lib/stacks';
import { Gift, Repeat2, TrendingUp } from 'lucide-react';

export default function RewardsPanel() {
  const [loading, setLoading] = useState<'claim' | 'compound' | null>(null);

  const handleClaim = async () => {
    setLoading('claim');
    try {
      await claimRewards();
    } catch (error) {
      console.error('Claim error:', error);
      alert('Failed to claim rewards. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCompound = async () => {
    setLoading('compound');
    try {
      await compoundRewards();
    } catch (error) {
      console.error('Compound error:', error);
      alert('Failed to compound rewards. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Your Rewards</h2>
          <p className="text-purple-300 text-sm">Claim or compound your earnings</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Pending Rewards</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              -- STX
            </p>
          </div>
          <TrendingUp className="w-12 h-12 text-green-400" />
        </div>
        <p className="text-gray-400 text-xs mt-4">
          Connect wallet to view your rewards
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleClaim}
          disabled={loading !== null}
          className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
        >
          {loading === 'claim' ? 'Processing...' : 'Claim Rewards'}
        </button>
        <button
          onClick={handleCompound}
          disabled={loading !== null}
          className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          <Repeat2 className="w-4 h-4" />
          {loading === 'compound' ? 'Processing...' : 'Compound'}
        </button>
      </div>
    </div>
  );
}
