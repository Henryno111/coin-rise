'use client';

import { useEffect, useState } from 'react';
import { userSession, connectWallet, disconnectWallet } from '@/lib/stacks';
import { Wallet, LogOut } from 'lucide-react';

export default function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setAddress(userData.profile.stxAddress.mainnet);
    }
  }, []);

  if (!mounted) return null;

  const handleConnect = () => {
    connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };

  if (address) {
    return (
      <button
        onClick={handleDisconnect}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
      >
        <Wallet className="w-5 h-5" />
        <span className="hidden sm:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <LogOut className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl animate-pulse"
    >
      <Wallet className="w-5 h-5" />
      <span>Connect Wallet</span>
    </button>
  );
}
