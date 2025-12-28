#!/bin/bash

# CoinRise Mainnet Post-Deployment Configuration
# Run this AFTER deploying all contracts

echo "⚠️  WARNING: Make sure all 4 contracts are deployed before running this script!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Set your deployer address
DEPLOYER_ADDRESS="<YOUR_MAINNET_ADDRESS_HERE>"
NETWORK="--mainnet"

echo "Configuring CoinRise contracts..."

# Step 1: Set vault contract in core
echo "1. Setting vault contract reference in core..."
stx call_contract_func \
  $NETWORK \
  $DEPLOYER_ADDRESS \
  coinrise-core \
  set-vault-contract \
  -p "$DEPLOYER_ADDRESS.coinrise-vault"

# Step 2: Set rewards contract in core
echo "2. Setting rewards contract reference in core..."
stx call_contract_func \
  $NETWORK \
  $DEPLOYER_ADDRESS \
  coinrise-core \
  set-rewards-contract \
  -p "$DEPLOYER_ADDRESS.coinrise-rewards"

# Step 3: Authorize core contract in vault
echo "3. Authorizing core contract in vault..."
stx call_contract_func \
  $NETWORK \
  $DEPLOYER_ADDRESS \
  coinrise-vault \
  authorize-contract \
  -p "$DEPLOYER_ADDRESS.coinrise-core"

# Step 4: Authorize rewards contract in vault
echo "4. Authorizing rewards contract in vault..."
stx call_contract_func \
  $NETWORK \
  $DEPLOYER_ADDRESS \
  coinrise-vault \
  authorize-contract \
  -p "$DEPLOYER_ADDRESS.coinrise-rewards"

# Step 5: Set core contract in rewards
echo "5. Setting core contract reference in rewards..."
stx call_contract_func \
  $NETWORK \
  $DEPLOYER_ADDRESS \
  coinrise-rewards \
  set-core-contract \
  -p "$DEPLOYER_ADDRESS.coinrise-core"

# Step 6: Set vault contract in rewards
echo "6. Setting vault contract reference in rewards..."
stx call_contract_func \
  $NETWORK \
  $DEPLOYER_ADDRESS \
  coinrise-rewards \
  set-vault-contract \
  -p "$DEPLOYER_ADDRESS.coinrise-vault"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next steps:"
echo "1. Fund the reward pool: stx call_contract_func $NETWORK $DEPLOYER_ADDRESS coinrise-rewards fund-reward-pool -u <amount>"
echo "2. Monitor contracts on explorer: https://explorer.hiro.so/address/$DEPLOYER_ADDRESS?chain=mainnet"
echo "3. Test with small amounts first!"
