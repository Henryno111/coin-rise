# CoinRise API Quick Reference

## Core Contract (.coinrise-core)

### Create Stake
```clarity
(contract-call? .coinrise-core create-stake amount lock-period)
```
- `amount`: uint - Amount in microSTX (1 STX = 1,000,000 microSTX)
- `lock-period`: uint - 4320 (30d) | 8640 (60d) | 12960 (90d)
- **Returns**: (response uint uint)
- **Min amount**: 100,000 microSTX (0.1 STX)

### Increase Stake
```clarity
(contract-call? .coinrise-core increase-stake additional-amount)
```
- `additional-amount`: uint - Additional microSTX to stake
- **Returns**: (response uint uint)

### Withdraw Stake
```clarity
(contract-call? .coinrise-core withdraw-stake)
```
- **Returns**: (response uint uint)
- **Requires**: Stake must be unlocked

### Extend Lock Period
```clarity
(contract-call? .coinrise-core extend-lock-period new-lock-period)
```
- `new-lock-period`: uint - Must be longer than current
- **Returns**: (response bool uint)

### Read Functions
```clarity
;; Get user's stake details
(contract-call? .coinrise-core get-stake user-principal)

;; Get user's stake amount
(contract-call? .coinrise-core get-user-stake-amount user-principal)

;; Check if stake is unlocked
(contract-call? .coinrise-core is-stake-unlocked user-principal)

;; Get total staked in platform
(contract-call? .coinrise-core get-total-staked)

;; Get total number of stakers
(contract-call? .coinrise-core get-total-stakers)

;; Check if pool is active
(contract-call? .coinrise-core is-pool-active)

;; Calculate lock multiplier
(contract-call? .coinrise-core calculate-lock-multiplier lock-period)
```

## Rewards Contract (.coinrise-rewards)

### Claim Rewards
```clarity
(contract-call? .coinrise-rewards claim-rewards)
```
- **Returns**: (response uint uint)
- **Requires**: Must have pending rewards

### Compound Rewards
```clarity
(contract-call? .coinrise-rewards compound-rewards)
```
- **Returns**: (response uint uint)
- **Effect**: Claims rewards and adds to stake

### Fund Reward Pool
```clarity
(contract-call? .coinrise-rewards fund-reward-pool amount)
```
- `amount`: uint - Amount in microSTX
- **Returns**: (response uint uint)

### Read Functions
```clarity
;; Calculate pending rewards for user
(contract-call? .coinrise-rewards calculate-pending-rewards user-principal)

;; Get effective APY for lock period
(contract-call? .coinrise-rewards calculate-effective-apy lock-period)

;; Get reward pool balance
(contract-call? .coinrise-rewards get-reward-pool-balance)

;; Get total rewards distributed
(contract-call? .coinrise-rewards get-total-rewards-distributed)

;; Get user's claimed rewards
(contract-call? .coinrise-rewards get-user-claimed-rewards user-principal)

;; Get current distribution cycle
(contract-call? .coinrise-rewards get-current-cycle)
```

## Vault Contract (.coinrise-vault)

### Deposit
```clarity
(contract-call? .coinrise-vault deposit amount)
```
- `amount`: uint - Amount in microSTX
- **Returns**: (response uint uint)

### Withdraw
```clarity
(contract-call? .coinrise-vault withdraw amount)
```
- `amount`: uint - Amount in microSTX
- **Returns**: (response uint uint)

### Read Functions
```clarity
;; Get user's vault balance
(contract-call? .coinrise-vault get-user-balance user-principal)

;; Get total vault balance
(contract-call? .coinrise-vault get-total-balance)

;; Check if vault is locked
(contract-call? .coinrise-vault is-vault-locked)

;; Check if contract is authorized
(contract-call? .coinrise-vault is-authorized contract-principal)
```

## Governance Contract (.coinrise-governance)

### Create Proposal
```clarity
(contract-call? .coinrise-governance create-proposal 
    title 
    description 
    parameter 
    new-value)
```
- `title`: string-utf8 100
- `description`: string-utf8 500
- `parameter`: string-ascii 30
- `new-value`: uint
- **Returns**: (response uint uint)
- **Requires**: Min 1 STX stake

### Vote on Proposal
```clarity
(contract-call? .coinrise-governance vote-on-proposal proposal-id vote-for)
```
- `proposal-id`: uint
- `vote-for`: bool - true for yes, false for no
- **Returns**: (response bool uint)
- **Requires**: Must have stake

### Execute Proposal
```clarity
(contract-call? .coinrise-governance execute-proposal proposal-id)
```
- `proposal-id`: uint
- **Returns**: (response bool uint)
- **Requires**: Owner/admin, voting ended, proposal passed

### Read Functions
```clarity
;; Get proposal details
(contract-call? .coinrise-governance get-proposal proposal-id)

;; Check if proposal passed
(contract-call? .coinrise-governance has-proposal-passed proposal-id)

;; Get user's vote
(contract-call? .coinrise-governance get-user-vote proposal-id user-principal)

;; Get proposal count
(contract-call? .coinrise-governance get-proposal-count)

;; Get platform parameters
(contract-call? .coinrise-governance get-platform-fee-rate)
(contract-call? .coinrise-governance get-min-stake-required)
(contract-call? .coinrise-governance get-max-stake-allowed)

;; Check if user is admin
(contract-call? .coinrise-governance is-admin user-principal)

;; Get platform statistic
(contract-call? .coinrise-governance get-platform-stat "stat-name")
```

## Common Workflows

### New User Staking
```clarity
;; 1. Create stake
(contract-call? .coinrise-core create-stake u10000000 u8640)  ;; 10 STX, 60 days

;; 2. Wait for rewards to accumulate (mine blocks)

;; 3. Check pending rewards
(contract-call? .coinrise-rewards calculate-pending-rewards tx-sender)

;; 4. Claim rewards
(contract-call? .coinrise-rewards claim-rewards)

;; 5. After lock period, withdraw
(contract-call? .coinrise-core withdraw-stake)
```

### Compound Strategy
```clarity
;; 1. Create initial stake
(contract-call? .coinrise-core create-stake u5000000 u12960)  ;; 5 STX, 90 days

;; 2. Periodically compound (e.g., every 1000 blocks)
(contract-call? .coinrise-rewards compound-rewards)

;; 3. Repeat compounding for maximum returns
```

### Governance Participation
```clarity
;; 1. Ensure you have sufficient stake
(contract-call? .coinrise-core create-stake u2000000 u4320)  ;; 2 STX minimum

;; 2. Create proposal
(contract-call? .coinrise-governance create-proposal
    u"Lower platform fee"
    u"Reduce fee to 0.5%"
    "platform-fee-rate"
    u50)

;; 3. Vote on proposals
(contract-call? .coinrise-governance vote-on-proposal u1 true)

;; 4. After voting period, admin executes
(contract-call? .coinrise-governance execute-proposal u1)
```

## Constants

### Lock Periods (in blocks)
- 30 days: `u4320`
- 60 days: `u8640`
- 90 days: `u12960`

### Multipliers (basis points, 100 = 1x)
- 30 days: `u110` (1.1x)
- 60 days: `u125` (1.25x)
- 90 days: `u150` (1.5x)

### Amounts
- Min stake: `u100000` (0.1 STX)
- 1 STX: `u1000000` (1 million microSTX)
- Min proposal stake: `u1000000` (1 STX)

### APY
- Base APY: `u500` (5% in basis points)

### Time Periods
- Blocks per year: `u52560`
- Voting period: `u10080` (~7 days)

## Testing Examples

### TypeScript (Vitest)
```typescript
// Create stake
const { result } = simnet.callPublicFn(
  "coinrise-core",
  "create-stake",
  [Cl.uint(10000000), Cl.uint(4320)],
  wallet1
);
expect(result).toBeOk(Cl.uint(10000000));

// Check stake
const stake = simnet.callReadOnlyFn(
  "coinrise-core",
  "get-stake",
  [Cl.principal(wallet1)],
  wallet1
);
expect(stake.result).toBeSome(expect.any(Object));
```

## Error Handling

Check error codes to handle failures:

```typescript
if (result.isErr) {
  const errorCode = result.value;
  switch (errorCode) {
    case 203:
      console.log("Amount below minimum");
      break;
    case 204:
      console.log("Stake still locked");
      break;
    // ... handle other errors
  }
}
```

## Tips & Best Practices

1. **Always check unlock status** before withdrawing
2. **Compound regularly** for maximum returns
3. **Extend lock periods** for better multipliers
4. **Vote on proposals** to influence platform
5. **Monitor reward pool** balance for sustainability
6. **Use longer locks** for significantly better APY
7. **Track gas costs** when claiming small rewards
8. **Test on devnet** before mainnet deployment

## Resources

- Full documentation: `README.md`
- Deployment guide: `DEPLOYMENT.md`
- Technical details: `TECHNICAL_SUMMARY.md`
- Test examples: `tests/` directory
