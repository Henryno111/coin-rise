import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("CoinRise Integration Tests", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  describe("Full Staking Flow", () => {
    it("should complete full stake lifecycle: create -> earn -> claim -> withdraw", () => {
      const stakeAmount = 10000000; // 10 STX
      const lockPeriod = 4320; // 30 days

      // 1. Create stake
      const createResult = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );
      expect(createResult.result).toBeOk(Cl.uint(stakeAmount));

      // 2. Fund reward pool
      const rewardPoolFund = 20000000; // 20 STX for rewards
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(rewardPoolFund)],
        deployer
      );

      // 3. Mine blocks to accumulate rewards
      simnet.mineEmptyBlocks(1000);

      // 4. Check pending rewards
      const pendingRewards = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(pendingRewards.result).toBeOk(expect.any(Object));

      // 5. Claim rewards
      const claimResult = simnet.callPublicFn(
        "coinrise-rewards",
        "claim-rewards",
        [],
        wallet1
      );
      expect(claimResult.result).toBeOk(expect.any(Object));

      // 6. Mine blocks to unlock stake
      simnet.mineEmptyBlocks(lockPeriod + 100);

      // 7. Withdraw stake
      const withdrawResult = simnet.callPublicFn(
        "coinrise-core",
        "withdraw-stake",
        [],
        wallet1
      );
      expect(withdrawResult.result).toBeOk(Cl.uint(stakeAmount));

      // 8. Verify final state
      const finalStake = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-stake",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(finalStake.result).toBeNone();
    });

    it("should handle compound rewards flow", () => {
      const stakeAmount = 5000000;
      const lockPeriod = 8640; // 60 days

      // Create initial stake
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Fund rewards
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(10000000)],
        deployer
      );

      // Accumulate rewards
      simnet.mineEmptyBlocks(500);

      // Get initial stake amount
      const initialStake = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-user-stake-amount",
        [Cl.principal(wallet1)],
        wallet1
      );

      // Compound rewards
      const compoundResult = simnet.callPublicFn(
        "coinrise-rewards",
        "compound-rewards",
        [],
        wallet1
      );
      expect(compoundResult.result).toBeOk(expect.any(Object));

      // Verify stake increased
      const newStake = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-user-stake-amount",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(newStake.result).not.toBe(initialStake.result);
    });
  });

  describe("Multi-User Scenarios", () => {
    it("should handle multiple users staking with different lock periods", () => {
      // User 1: 30-day lock
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(5000000), Cl.uint(4320)],
        wallet1
      );

      // User 2: 60-day lock
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(7000000), Cl.uint(8640)],
        wallet2
      );

      // User 3: 90-day lock
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(10000000), Cl.uint(12960)],
        wallet3
      );

      // Check total staked
      const totalStaked = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );
      expect(totalStaked.result).toBeUint(22000000);

      // Check total stakers
      const totalStakers = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-stakers",
        [],
        deployer
      );
      expect(totalStakers.result).toBeUint(3);

      // Fund rewards
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(30000000)],
        deployer
      );

      // Mine blocks
      simnet.mineEmptyBlocks(500);

      // Each user should have different rewards based on multiplier
      const rewards1 = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet1)],
        wallet1
      );
      const rewards2 = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet2)],
        wallet2
      );
      const rewards3 = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet3)],
        wallet3
      );

      expect(rewards1.result).toBeOk(expect.any(Object));
      expect(rewards2.result).toBeOk(expect.any(Object));
      expect(rewards3.result).toBeOk(expect.any(Object));
    });

    it("should handle sequential stakes and withdrawals", () => {
      const stakeAmount = 3000000;
      const lockPeriod = 4320;

      // User 1 stakes
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // User 2 stakes
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet2
      );

      // Advance past lock period
      simnet.mineEmptyBlocks(lockPeriod + 10);

      // User 1 withdraws
      simnet.callPublicFn("coinrise-core", "withdraw-stake", [], wallet1);

      // Total should update
      const totalAfterWithdraw = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );
      expect(totalAfterWithdraw.result).toBeUint(stakeAmount);

      // Stakers count should update
      const stakersCount = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-stakers",
        [],
        deployer
      );
      expect(stakersCount.result).toBeUint(1);

      // User 2 can still withdraw
      const user2Withdraw = simnet.callPublicFn(
        "coinrise-core",
        "withdraw-stake",
        [],
        wallet2
      );
      expect(user2Withdraw.result).toBeOk(Cl.uint(stakeAmount));
    });
  });

  describe("Governance Integration", () => {
    it("should allow stakers to participate in governance", () => {
      // Create stakes for voting power
      const stake1 = 8000000;
      const stake2 = 5000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stake1), Cl.uint(lockPeriod)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stake2), Cl.uint(lockPeriod)],
        wallet2
      );

      // Create proposal
      const proposalResult = simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8("Increase min stake"),
          Cl.stringUtf8("Proposal to increase minimum stake requirement"),
          Cl.stringAscii("min-stake-required"),
          Cl.uint(200000),
        ],
        wallet1
      );
      expect(proposalResult.result).toBeOk(Cl.uint(1));

      // Both users vote
      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet2
      );

      // Check proposal passed
      const hasPassed = simnet.callReadOnlyFn(
        "coinrise-governance",
        "has-proposal-passed",
        [Cl.uint(1)],
        deployer
      );
      expect(hasPassed.result).toBeOk(Cl.bool(true));

      // Execute after voting period
      simnet.mineEmptyBlocks(10081);
      const executeResult = simnet.callPublicFn(
        "coinrise-governance",
        "execute-proposal",
        [Cl.uint(1)],
        deployer
      );
      expect(executeResult.result).toBeOk(Cl.bool(true));

      // Verify parameter changed
      const newMinStake = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-min-stake-required",
        [],
        deployer
      );
      expect(newMinStake.result).toBeUint(200000);
    });
  });

  describe("Emergency Scenarios", () => {
    it("should handle emergency pause across all contracts", () => {
      // Create some stakes first
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(5000000), Cl.uint(4320)],
        wallet1
      );

      // Emergency pause core
      simnet.callPublicFn("coinrise-core", "emergency-pause", [], deployer);

      // Lock vault
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(true)],
        deployer
      );

      // Shutdown governance
      simnet.callPublicFn(
        "coinrise-governance",
        "emergency-shutdown",
        [],
        deployer
      );

      // Verify new operations are blocked
      const stakeResult = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(1000000), Cl.uint(4320)],
        wallet2
      );
      expect(stakeResult.result).toBeErr(Cl.uint(205)); // err-pool-inactive

      const depositResult = simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(1000000)],
        wallet2
      );
      expect(depositResult.result).toBeErr(Cl.uint(101)); // err-not-authorized

      const proposalResult = simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8("Test"),
          Cl.stringUtf8("Test"),
          Cl.stringAscii("platform-fee-rate"),
          Cl.uint(50),
        ],
        wallet1
      );
      expect(proposalResult.result).toBeErr(Cl.uint(401)); // err-not-authorized
    });

    it("should allow resuming operations after emergency", () => {
      // Pause everything
      simnet.callPublicFn("coinrise-core", "emergency-pause", [], deployer);
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(true)],
        deployer
      );
      simnet.callPublicFn(
        "coinrise-governance",
        "emergency-shutdown",
        [],
        deployer
      );

      // Resume operations
      simnet.callPublicFn("coinrise-core", "emergency-resume", [], deployer);
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(false)],
        deployer
      );
      simnet.callPublicFn(
        "coinrise-governance",
        "emergency-resume",
        [],
        deployer
      );

      // Verify operations work again
      const stakeResult = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(1000000), Cl.uint(4320)],
        wallet1
      );
      expect(stakeResult.result).toBeOk(Cl.uint(1000000));
    });
  });

  describe("Vault Authorization Flow", () => {
    it("should allow core contract to interact with vault when authorized", () => {
      // Authorize core contract
      const coreContract = `${deployer}.coinrise-core`;
      const authResult = simnet.callPublicFn(
        "coinrise-vault",
        "authorize-contract",
        [Cl.principal(coreContract)],
        deployer
      );
      expect(authResult.result).toBeOk(Cl.bool(true));

      // Verify authorization
      const isAuthorized = simnet.callReadOnlyFn(
        "coinrise-vault",
        "is-authorized",
        [Cl.principal(coreContract)],
        deployer
      );
      expect(isAuthorized.result).toBeBool(true);
    });
  });

  describe("Reward Distribution Cycles", () => {
    it("should track distribution cycles correctly", () => {
      // Fund reward pool
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(50000000)],
        deployer
      );

      // Create some stakes
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(10000000), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(5000000), Cl.uint(8640)],
        wallet2
      );

      // Record first distribution cycle
      simnet.callPublicFn(
        "coinrise-rewards",
        "record-distribution-cycle",
        [Cl.uint(1000000)],
        deployer
      );

      const cycle1 = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-distribution-cycle",
        [Cl.uint(1)],
        deployer
      );
      expect(cycle1.result).toBeSome(expect.any(Object));

      // Record second cycle
      simnet.mineEmptyBlocks(100);
      simnet.callPublicFn(
        "coinrise-rewards",
        "record-distribution-cycle",
        [Cl.uint(2000000)],
        deployer
      );

      const currentCycle = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-current-cycle",
        [],
        deployer
      );
      expect(currentCycle.result).toBeUint(2);
    });
  });

  describe("Platform Statistics", () => {
    it("should track platform-wide statistics", () => {
      // Create multiple stakes
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(5000000), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(7000000), Cl.uint(8640)],
        wallet2
      );

      // Update statistics
      const totalStaked = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );

      simnet.callPublicFn(
        "coinrise-governance",
        "update-platform-stat",
        [Cl.stringAscii("total-value-locked"), totalStaked.result],
        deployer
      );

      simnet.callPublicFn(
        "coinrise-governance",
        "update-platform-stat",
        [Cl.stringAscii("active-users"), Cl.uint(2)],
        deployer
      );

      // Verify stats
      const tvlStat = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-platform-stat",
        [Cl.stringAscii("total-value-locked")],
        deployer
      );
      expect(tvlStat.result).toBeSome(expect.any(Object));

      const usersStat = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-platform-stat",
        [Cl.stringAscii("active-users")],
        deployer
      );
      expect(usersStat.result).toBeSome(expect.any(Object));
    });
  });

  describe("Lock Period Extensions", () => {
    it("should allow extending lock period and update rewards", () => {
      const stakeAmount = 10000000;
      const initialLockPeriod = 4320; // 30 days
      const extendedLockPeriod = 12960; // 90 days

      // Create stake
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(initialLockPeriod)],
        wallet1
      );

      // Check initial multiplier (1.1x for 30 days)
      const initialMultiplier = simnet.callReadOnlyFn(
        "coinrise-core",
        "calculate-lock-multiplier",
        [Cl.uint(initialLockPeriod)],
        wallet1
      );
      expect(initialMultiplier.result).toBeUint(110);

      // Extend lock period
      const extendResult = simnet.callPublicFn(
        "coinrise-core",
        "extend-lock-period",
        [Cl.uint(extendedLockPeriod)],
        wallet1
      );
      expect(extendResult.result).toBeOk(Cl.bool(true));

      // Check new multiplier (1.5x for 90 days)
      const newMultiplier = simnet.callReadOnlyFn(
        "coinrise-core",
        "calculate-lock-multiplier",
        [Cl.uint(extendedLockPeriod)],
        wallet1
      );
      expect(newMultiplier.result).toBeUint(150);
    });
  });
});
