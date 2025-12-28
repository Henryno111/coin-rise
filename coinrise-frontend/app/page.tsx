import WalletConnect from '@/components/WalletConnect';
import StakingCard from '@/components/StakingCard';
import RewardsPanel from '@/components/RewardsPanel';
import { TrendingUp, Shield, Zap, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  CoinRise
                </h1>
                <p className="text-sm text-purple-300">Collaborative Staking Platform</p>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Stake STX,{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Earn Rewards
            </span>
          </h2>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-8">
            Join thousands of users earning up to 7.5% APY on your STX tokens. Choose your lock period and maximize your returns.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Users, label: 'Total Stakers', value: '0' },
              { icon: TrendingUp, label: 'Total Staked', value: '-- STX' },
              { icon: Shield, label: 'Security', value: 'Audited' },
              { icon: Zap, label: 'Max APY', value: '7.5%' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <stat.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Staking Options */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white text-center mb-8">
            Choose Your Staking Period
          </h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <StakingCard
              period={4320}
              days={30}
              apy="5.5"
              multiplier="1.1x"
              icon="clock"
            />
            <StakingCard
              period={8640}
              days={60}
              apy="6.25"
              multiplier="1.25x"
              icon="trending"
            />
            <StakingCard
              period={12960}
              days={90}
              apy="7.5"
              multiplier="1.5x"
              icon="zap"
            />
          </div>
        </div>

        {/* Rewards Panel */}
        <div className="max-w-2xl mx-auto mb-16">
          <RewardsPanel />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: 'Secure & Transparent',
              description: 'All transactions are on-chain and verifiable. Your funds are secured by smart contracts.',
              icon: Shield,
            },
            {
              title: 'Flexible Lock Periods',
              description: 'Choose from 30, 60, or 90-day lock periods. Longer locks earn higher rewards.',
              icon: Zap,
            },
            {
              title: 'Auto-Compound',
              description: 'Automatically reinvest your rewards to maximize your earnings over time.',
              icon: TrendingUp,
            },
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl w-fit mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 backdrop-blur-lg mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-400">
            <p className="mb-2">
              Built on <span className="text-purple-400 font-semibold">Stacks Blockchain</span>
            </p>
            <p className="text-sm">
              Contract: {' '}
              <a
                href="https://explorer.hiro.so/address/SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979?chain=mainnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                SPD7WQ5...D979
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
