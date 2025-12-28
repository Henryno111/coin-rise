# CoinRise Deployment Guide

## Deployment Order

The contracts must be deployed in the following order due to dependencies:

1. **coinrise-vault** (no dependencies)
2. **coinrise-core** (depends on vault)
3. **coinrise-rewards** (depends on core and vault)
4. **coinrise-governance** (depends on core)

## Post-Deployment Setup

After deploying all contracts, run these configuration steps:

### 1. Configure Core Contract

```clarity
;; Set vault contract reference
(contract-call? .coinrise-core set-vault-contract .coinrise-vault)

;; Set rewards contract reference
(contract-call? .coinrise-core set-rewards-contract .coinrise-rewards)
```

### 2. Configure Vault Contract

```clarity
;; Authorize core contract to interact with vault
(contract-call? .coinrise-vault authorize-contract .coinrise-core)

;; Authorize rewards contract to interact with vault (for compounding)
(contract-call? .coinrise-vault authorize-contract .coinrise-rewards)
```

### 3. Configure Rewards Contract

```clarity
;; Set core contract reference
(contract-call? .coinrise-rewards set-core-contract .coinrise-core)

;; Set vault contract reference
(contract-call? .coinrise-rewards set-vault-contract .coinrise-vault)

;; Fund initial reward pool (example: 100,000 STX)
(contract-call? .coinrise-rewards fund-reward-pool u100000000000)
```

### 4. Optional: Add Platform Admins

```clarity
;; Add trusted admin addresses
(contract-call? .coinrise-governance add-admin 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

## Deployment Checklist

- [ ] Deploy coinrise-vault
- [ ] Deploy coinrise-core
- [ ] Deploy coinrise-rewards
- [ ] Deploy coinrise-governance
- [ ] Set vault contract in core
- [ ] Set rewards contract in core
- [ ] Authorize core in vault
- [ ] Authorize rewards in vault
- [ ] Set core contract in rewards
- [ ] Set vault contract in rewards
- [ ] Fund reward pool
- [ ] Test deposit function
- [ ] Test stake creation
- [ ] Test reward calculation
- [ ] Test governance proposal

## Environment-Specific Notes

### Devnet
- Use test addresses
- Lower stake amounts for testing
- Shorter lock periods for faster testing

### Testnet
- Use realistic amounts
- Test full governance cycle
- Verify all emergency functions

### Mainnet
- Audit all contracts
- Start with conservative parameters
- Monitor initial transactions closely
- Have emergency procedures ready

## Contract Parameters

### Default Values

**Core Contract:**
- Min stake: 0.1 STX (100,000 microSTX)
- Lock periods: 4,320 / 8,640 / 12,960 blocks (~30/60/90 days)
- Lock multipliers: 110 / 125 / 150 (1.1x / 1.25x / 1.5x)

**Rewards Contract:**
- Base APY: 500 basis points (5%)
- Blocks per year: 52,560

**Governance Contract:**
- Platform fee: 100 basis points (1%)
- Min proposal stake: 1 STX (1,000,000 microSTX)
- Voting period: 10,080 blocks (~7 days)

## Verification Steps

After deployment, verify each contract:

```bash
# Check contract deployment
clarinet deployments check

# Verify contract is active
stacks-cli get-contract-info <address> coinrise-vault
stacks-cli get-contract-info <address> coinrise-core
stacks-cli get-contract-info <address> coinrise-rewards
stacks-cli get-contract-info <address> coinrise-governance
```

## Troubleshooting

### Common Issues

1. **"Contract not found" errors**
   - Ensure contracts are deployed in correct order
   - Verify contract names match exactly
   - Check principal addresses are correct

2. **"Not authorized" errors**
   - Verify authorization steps were completed
   - Check tx-sender is contract owner
   - Ensure contract references are set

3. **Reward calculation errors**
   - Verify reward pool is funded
   - Check stake exists before claiming
   - Ensure sufficient blocks have passed

## Security Recommendations

1. **Initial Launch**
   - Start with lower maximum stakes
   - Monitor first few transactions
   - Keep emergency pause ready

2. **Ongoing Operations**
   - Regularly audit reward pool balance
   - Monitor governance proposals
   - Track platform statistics

3. **Emergency Procedures**
   - Document emergency contacts
   - Test pause functionality
   - Have rollback plan ready

## Support

For deployment assistance:
- Check contract documentation
- Review test files for examples
- Contact support team
