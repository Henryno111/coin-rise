# CoinRise - Testnet Deployment Guide

## Pre-Deployment Checklist

### ⚠️ CRITICAL - DO NOT SKIP
- [ ] Complete security audit by professional auditors
- [ ] Test all contracts on devnet
- [ ] Deploy and test on testnet for minimum 2-4 weeks
- [ ] Perform stress testing with multiple users
- [ ] Review all error codes and edge cases
- [ ] Get community feedback on testnet
- [ ] Insurance/bug bounty program in place
- [ ] Emergency response plan documented

## Testnet Deployment Steps

### 1. Setup Testnet Wallet

```bash
# Generate testnet wallet
stx-cli generate-wallet testnet

# Get testnet STX from faucet
# Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet
```

### 2. Update Settings for Testnet

Edit `settings/Testnet.toml`:

```toml
[network]
name = "testnet"

[accounts.deployer]
mnemonic = "your testnet mnemonic here"
balance = 100_000_000_000  # 100,000 STX for deployment

[accounts.wallet_1]
mnemonic = "test wallet 1 mnemonic"
balance = 10_000_000_000

[accounts.wallet_2]
mnemonic = "test wallet 2 mnemonic"
balance = 10_000_000_000
```

### 3. Deploy to Testnet

```bash
# Check contracts before deployment
clarinet check

# Deploy to testnet (will prompt for each contract)
clarinet deploy --testnet

# Or use deployment plan
clarinet deployments apply --testnet deployment-plan.yaml
```

### 4. Post-Deployment Configuration

After deploying, configure the contracts:

```bash
# Set contract references
stx-cli contract-call \
  <deployer-address> \
  coinrise-core \
  set-vault-contract \
  <vault-contract-principal>

# Authorize contracts
stx-cli contract-call \
  <deployer-address> \
  coinrise-vault \
  authorize-contract \
  <core-contract-principal>

# Fund reward pool with testnet STX
stx-cli contract-call \
  <deployer-address> \
  coinrise-rewards \
  fund-reward-pool \
  u10000000000
```

### 5. Testnet Validation (Minimum 2-4 Weeks)

#### Week 1: Basic Functionality
- [ ] Test stake creation with all lock periods
- [ ] Test deposits and withdrawals
- [ ] Verify reward calculations
- [ ] Test emergency pause/resume

#### Week 2: Multi-User Testing
- [ ] Get 10+ testnet users
- [ ] Test concurrent staking
- [ ] Test reward claims
- [ ] Test governance proposals

#### Week 3: Stress Testing
- [ ] Large stake amounts
- [ ] Multiple simultaneous transactions
- [ ] Edge cases (min/max values)
- [ ] Emergency scenarios

#### Week 4: Security Testing
- [ ] Attempt unauthorized access
- [ ] Test all error paths
- [ ] Verify authorization controls
- [ ] Test reentrancy protection

### 6. Known Issues to Address

Based on `clarinet check` errors:

1. **Contract Cross-References**
   - Contracts reference each other before deployment
   - Solution: Deploy in correct order and update references

2. **Missing `as-contract` Function**
   - Clarity 2.0+ required
   - Ensure network supports Clarity 2.0

### 7. Monitoring Checklist

- [ ] Set up block explorer monitoring
- [ ] Track all transactions
- [ ] Monitor reward pool balance
- [ ] Track total staked amounts
- [ ] Log all governance actions
- [ ] Set up alerts for anomalies

## Testnet Resources

- **Testnet Explorer**: https://explorer.hiro.so/?chain=testnet
- **Testnet Faucet**: https://explorer.hiro.so/sandbox/faucet?chain=testnet
- **API Endpoint**: https://api.testnet.hiro.so

## Moving to Mainnet (Only After Successful Testnet)

### Prerequisites for Mainnet
1. ✅ Minimum 4 weeks successful testnet operation
2. ✅ Professional security audit completed
3. ✅ All critical bugs fixed
4. ✅ Community review and feedback
5. ✅ Legal compliance review
6. ✅ Insurance/compensation fund established
7. ✅ 24/7 monitoring system ready
8. ✅ Emergency response team identified
9. ✅ Bug bounty program launched
10. ✅ Gradual rollout plan prepared

### Mainnet Deployment Risks

**Financial Risks:**
- Lost funds due to bugs
- Smart contract exploits
- Incorrect calculations
- Front-running attacks

**Operational Risks:**
- Network congestion
- Failed transactions
- Contract upgrade issues
- Governance attacks

**Legal Risks:**
- Regulatory compliance
- User agreements
- Liability issues
- Jurisdiction concerns

### Mainnet Safety Measures

1. **Gradual Rollout**
   - Start with low maximum stake limits
   - Increase limits gradually over weeks
   - Monitor each increase period

2. **Circuit Breakers**
   - Automatic pause on anomalies
   - Manual emergency pause ready
   - Rate limiting on deposits

3. **Insurance**
   - Bug bounty program ($50k+)
   - Insurance fund (10-20% of TVL)
   - Emergency reserve funds

4. **Monitoring**
   - 24/7 transaction monitoring
   - Automated anomaly detection
   - Alert system for admins
   - Regular security audits

## Contact Security Auditors

Before mainnet deployment, contact:

- **CertiK**: https://www.certik.com/
- **Trail of Bits**: https://www.trailofbits.com/
- **OpenZeppelin**: https://www.openzeppelin.com/security-audits
- **Quantstamp**: https://quantstamp.com/
- **Consensys Diligence**: https://consensys.net/diligence/

Estimated audit cost: $20,000 - $100,000
Estimated timeline: 4-8 weeks

## Emergency Contacts

Document emergency procedures:
- Who can pause contracts
- Communication channels
- User notification process
- Recovery procedures

---

**REMEMBER**: Testnet first, always. Mainnet deployment of unaudited financial contracts is extremely risky.
