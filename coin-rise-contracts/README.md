# CoinRise - Collaborative Staking Platform

CoinRise is a decentralized staking platform built on the Stacks blockchain that enables users to jointly stake STX tokens and earn rewards, similar to interest-bearing savings platforms but fully on-chain and transparent.

## 🏗️ Architecture

The platform is built with a modular architecture consisting of four main smart contracts:

### 1. **coinrise-vault.clar** - Secure Fund Storage
- Manages all deposited STX tokens in a secure vault
- Tracks individual user balances
- Provides authorization mechanism for other contracts
- Includes emergency lock/unlock functionality
- Handles deposits and withdrawals

### 2. **coinrise-core.clar** - Staking Logic
- Core staking functionality with flexible lock periods
- Three lock period options: 30, 60, and 90 days
- Lock period multipliers for enhanced rewards (1.1x, 1.25x, 1.5x)
- Stake creation, increase, and withdrawal
- Lock period extension capability
- Emergency pause/resume controls

### 3. **coinrise-rewards.clar** - Reward Distribution
- Calculates and distributes staking rewards
- Base APY of 5% with lock period multipliers
- Claim rewards functionality
- Compound rewards (auto-restaking)
- Reward pool funding mechanism
- Distribution cycle tracking

### 4. **coinrise-governance.clar** - Platform Governance
- Decentralized governance for platform parameters
- Proposal creation and voting system
- Stake-weighted voting
- Platform statistics tracking
- Admin role management
- Parameter management (fees, min/max stakes, etc.)

## 🎯 Key Features

### For Stakers
- **Flexible Lock Periods**: Choose from 30, 60, or 90-day lock periods
- **Higher Returns for Longer Locks**: Earn up to 1.5x rewards with 90-day locks
- **Compound Rewards**: Automatically reinvest rewards to maximize returns
- **Transparent Calculations**: All reward calculations are on-chain
- **Stake Extension**: Extend lock periods to earn higher multipliers

### For the Platform
- **Modular Design**: Separated concerns for easier maintenance and upgrades
- **Secure Vault**: Centralized fund management with authorization controls
- **Governance**: Community-driven parameter adjustments
- **Emergency Controls**: Platform-wide pause functionality for security
- **Statistics Tracking**: On-chain analytics and metrics

## 📊 Reward Structure

### Base APY: 5% (500 basis points)

### Lock Period Multipliers:
- **30 Days**: 1.1x → Effective APY: 5.5%
- **60 Days**: 1.25x → Effective APY: 6.25%
- **90 Days**: 1.5x → Effective APY: 7.5%

### Reward Calculation:
```
Rewards = (stake_amount × base_apy × blocks_staked × lock_multiplier) / (blocks_per_year × 10,000)
```

## 🚀 Getting Started

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Node.js 18+ for running tests

### Installation

```bash
# Clone the repository
cd coin-rise-contracts

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:report
```

### Project Structure

```
coin-rise-contracts/
├── contracts/
│   ├── coinrise-vault.clar       # Secure storage contract
│   ├── coinrise-core.clar        # Main staking logic
│   ├── coinrise-rewards.clar     # Reward distribution
│   └── coinrise-governance.clar  # Governance & admin
├── tests/
│   ├── coinrise-vault.test.ts
│   ├── coinrise-core.test.ts
│   ├── coinrise-rewards.test.ts
│   ├── coinrise-governance.test.ts
│   └── coinrise-integration.test.ts
├── Clarinet.toml
├── package.json
└── README.md
```

## 💡 Usage Examples

### Creating a Stake

```clarity
;; Stake 10 STX for 60 days
(contract-call? .coinrise-core create-stake u10000000 u8640)
```

### Claiming Rewards

```clarity
;; Claim accumulated rewards
(contract-call? .coinrise-rewards claim-rewards)
```

### Compounding Rewards

```clarity
;; Automatically reinvest rewards
(contract-call? .coinrise-rewards compound-rewards)
```

### Withdrawing Stake

```clarity
;; Withdraw stake after lock period
(contract-call? .coinrise-core withdraw-stake)
```

### Creating a Governance Proposal

```clarity
;; Create proposal to change platform fee
(contract-call? .coinrise-governance create-proposal
    u"Reduce Platform Fee"
    u"Proposal to reduce fee from 1% to 0.5%"
    "platform-fee-rate"
    u50)
```

## 🧪 Testing

The project includes comprehensive test suites:

### Unit Tests
- **Vault Tests**: 30+ tests covering deposits, withdrawals, authorization
- **Core Tests**: 40+ tests covering staking, lock periods, withdrawals
- **Rewards Tests**: 35+ tests covering calculations, claims, compounds
- **Governance Tests**: 45+ tests covering proposals, voting, execution

### Integration Tests
- Full lifecycle testing
- Multi-user scenarios
- Emergency procedures
- Cross-contract interactions

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test coinrise-core.test.ts

# Run with coverage and cost analysis
npm run test:report

# Watch mode for development
npm run test:watch
```

## 🔐 Security Features

### Multi-layered Security
1. **Owner Controls**: Critical functions restricted to contract owner
2. **Authorization System**: Vault access controlled via whitelist
3. **Emergency Mechanisms**: Platform-wide pause functionality
4. **Input Validation**: All user inputs validated
5. **Locked Funds Protection**: Time-locked stakes cannot be withdrawn early

### Error Codes

Each contract has specific error codes for debugging:

**Vault (100-199)**
- 100: Owner only
- 101: Not authorized
- 102: Insufficient balance
- 103: Transfer failed
- 104: Invalid amount

**Core (200-299)**
- 200: Owner only
- 201: Not found
- 202: Already exists
- 203: Invalid amount
- 204: Stake locked
- 205: Pool inactive
- 207: Invalid period

**Rewards (300-399)**
- 300: Owner only
- 301: Not found
- 302: No rewards
- 304: Invalid amount

**Governance (400-499)**
- 400: Owner only
- 401: Not authorized
- 402: Invalid parameter
- 405: Already voted
- 406: Voting ended
- 407: Insufficient stake

## 🛣️ Roadmap

### Phase 1: Core Platform ✅
- ✅ Vault implementation
- ✅ Staking mechanics
- ✅ Reward distribution
- ✅ Governance system
- ✅ Comprehensive tests

### Phase 2: Enhancement (Planned)
- [ ] Frontend dApp
- [ ] Advanced reward strategies
- [ ] NFT rewards for long-term stakers
- [ ] Multi-token support
- [ ] Mobile app

### Phase 3: Expansion (Future)
- [ ] Cross-chain staking
- [ ] Liquid staking tokens
- [ ] DeFi integrations
- [ ] DAO treasury management

## 📝 Contract Deployment

### Deployment Order
1. Deploy `coinrise-vault.clar`
2. Deploy `coinrise-core.clar`
3. Deploy `coinrise-rewards.clar`
4. Deploy `coinrise-governance.clar`
5. Set contract references
6. Authorize core contract in vault

### Post-Deployment Configuration

```clarity
;; Set vault contract in core
(contract-call? .coinrise-core set-vault-contract .coinrise-vault)

;; Set rewards contract in core
(contract-call? .coinrise-core set-rewards-contract .coinrise-rewards)

;; Authorize core contract in vault
(contract-call? .coinrise-vault authorize-contract .coinrise-core)

;; Fund initial reward pool
(contract-call? .coinrise-rewards fund-reward-pool u100000000000)
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Links

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarinet Documentation](https://docs.hiro.so/clarinet/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)

## 👥 Team

Built with ❤️ for the Stacks ecosystem

## 📞 Support

For questions and support:
- Open an issue on GitHub
- Join our Discord community
- Check our documentation

---

**Disclaimer**: This is experimental software. Use at your own risk. Always audit smart contracts before deploying to mainnet.
