import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network';
import { 
  uintCV, 
  principalCV,
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  cvToJSON
} from '@stacks/transactions';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export const network = new StacksMainnet();

export const CONTRACT_ADDRESS = 'SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979';
export const CONTRACT_NAMES = {
  vault: 'coinrise-vault',
  core: 'coinrise-core',
  rewards: 'coinrise-rewards',
  governance: 'coinrise-governance',
};

export const connectWallet = () => {
  showConnect({
    appDetails: {
      name: 'CoinRise',
      icon: '/logo.png',
    },
    redirectTo: '/',
    onFinish: () => {
      window.location.reload();
    },
    userSession,
  });
};

export const disconnectWallet = () => {
  userSession.signUserOut('/');
  window.location.reload();
};

export const createStake = async (amount: number, lockPeriod: number) => {
  const functionArgs = [
    uintCV(amount),
    uintCV(lockPeriod),
  ];

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAMES.core,
    functionName: 'create-stake',
    functionArgs,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data: any) => {
      console.log('Transaction submitted:', data.txId);
    },
  };

  await makeContractCall(txOptions);
};

export const claimRewards = async () => {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAMES.rewards,
    functionName: 'claim-rewards',
    functionArgs: [],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data: any) => {
      console.log('Rewards claimed:', data.txId);
    },
  };

  await makeContractCall(txOptions);
};

export const compoundRewards = async () => {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAMES.rewards,
    functionName: 'compound-rewards',
    functionArgs: [],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data: any) => {
      console.log('Rewards compounded:', data.txId);
    },
  };

  await makeContractCall(txOptions);
};

export const withdrawStake = async () => {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAMES.core,
    functionName: 'withdraw-stake',
    functionArgs: [],
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data: any) => {
      console.log('Stake withdrawn:', data.txId);
    },
  };

  await makeContractCall(txOptions);
};

// Helper to convert microSTX to STX
export const microStxToStx = (microStx: number): number => {
  return microStx / 1000000;
};

// Helper to convert STX to microSTX
export const stxToMicroStx = (stx: number): number => {
  return Math.floor(stx * 1000000);
};
