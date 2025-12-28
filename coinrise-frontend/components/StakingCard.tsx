'use client';

import { useState } from 'react';
import { createStake, stxToMicroStx } from '@/lib/stacks';
import { TrendingUp, Clock, Zap } from 'lucide-react';

interface StakingCardProps {
  period: number;
  days: number;
  apy: string;
  multiplier: string;
  icon: 'clock' | 'trending' | 'zap';
}

const icons = {
  clock: Clock,
  trending: TrendingUp,
  zap: Zap,
};

export default function StakingCard({ period, days, apy, multiplier, icon }: StakingCardProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const Icon = icons[icon];

  const handleStake = async () => {
    if (!amount || parseFloat(amount) < 0.1) {
      alert('Minimum stake is 0.1 STX');
      return;
    }

    setLoading(true);
    try {
      const microStx = stxToMicroStx(parseFloat(amount));
      await createStake(microStx, period);
    } catch (error) {
      console.error('Staking error:', error);
      alert('Failed to create stake. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:border-purple-400/50 transition-all hover:shadow-2xl hover:shadow-purple-500/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">{days} Days</h3>
            <p className="text-purple-300 text-sm">{multiplier} Multiplier</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            {apy}%
          </div>
          <p className="text-sm text-gray-400">APY</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount to Stake (STX)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Min 0.1 STX"
            min="0.1"
            step="0.1"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          onClick={handleStake}
          disabled={loading || !amount}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? 'Processing...' : 'Stake Now'}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Lock Period</span>
          <span className="text-white font-medium">{days} days</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-400">Min. Stake</span>
          <span className="text-white font-medium">0.1 STX</span>
        </div>
      </div>
    </div>
  );
}
