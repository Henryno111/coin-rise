#!/bin/bash

# CoinRise Mainnet Configuration Script
# Run this to configure all contract references and authorizations

DEPLOYER="SPD7WQ5ZTDXV45D3ZCY00N1WTRF106SH9XA0D979"

echo "🔧 Configuring CoinRise contracts on mainnet..."
echo ""

# Configuration 1: Set vault in core
echo "1/6 Setting vault contract in core..."
stx call_contract_func mainnet $DEPLOYER coinrise-core set-vault-contract "'$DEPLOYER.coinrise-vault"

echo ""
echo "2/6 Setting rewards contract in core..."
stx call_contract_func mainnet $DEPLOYER coinrise-core set-rewards-contract "'$DEPLOYER.coinrise-rewards"

echo ""
echo "3/6 Authorizing core contract in vault..."
stx call_contract_func mainnet $DEPLOYER coinrise-vault authorize-contract "'$DEPLOYER.coinrise-core"

echo ""
echo "4/6 Authorizing rewards contract in vault..."
stx call_contract_func mainnet $DEPLOYER coinrise-vault authorize-contract "'$DEPLOYER.coinrise-rewards"

echo ""
echo "5/6 Setting core contract in rewards..."
stx call_contract_func mainnet $DEPLOYER coinrise-rewards set-core-contract "'$DEPLOYER.coinrise-core"

echo ""
echo "6/6 Setting vault contract in rewards..."
stx call_contract_func mainnet $DEPLOYER coinrise-rewards set-vault-contract "'$DEPLOYER.coinrise-vault"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Next: Fund the reward pool with:"
echo "stx call_contract_func mainnet $DEPLOYER coinrise-rewards fund-reward-pool -u 10000000000"
echo ""
echo "View contracts: https://explorer.hiro.so/address/$DEPLOYER?chain=mainnet"
