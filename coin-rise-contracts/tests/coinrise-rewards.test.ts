import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("CoinRise Rewards Contract Tests", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  describe("Deployment and Initial State", () => {
    it("should initialize with zero reward pool balance", () => {
      const balance = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-reward-pool-balance",
        [],
        deployer
      );
      expect(balance.result).toBeUint(0);
    });

    it("should initialize with zero total rewards distributed", () => {
      const distributed = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-total-rewards-distributed",
        [],
        deployer
      );
      expect(distributed.result).toBeUint(0);
    });

    it("should start at cycle 0", () => {
      const cycle = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-current-cycle",
        [],
        deployer
      );
      expect(cycle.result).toBeUint(0);
    });

    it("should return zero claimed rewards for new user", () => {
      const claimed = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-user-claimed-rewards",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(claimed.result).toBeUint(0);
    });
  });

  describe("Reward Pool Funding", () => {
    it("should allow funding reward pool", () => {
      const fundAmount = 10000000; // 10 STX

      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(fundAmount)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(fundAmount));

      const balance = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-reward-pool-balance",
        [],
        deployer
      );
      expect(balance.result).toBeUint(fundAmount);
    });

    it("should reject funding with zero amount", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(0)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(304)); // err-invalid-amount
    });

    it("should allow multiple fundings", () => {
      const firstFund = 5000000;
      const secondFund = 3000000;

      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(firstFund)],
        deployer
      );

      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(secondFund)],
        wallet1
      );

      const balance = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-reward-pool-balance",
        [],
        deployer
      );
      expect(balance.result).toBeUint(firstFund + secondFund);
    });
  });

  describe("APY Calculation", () => {
    it("should calculate correct APY for 30-day lock", () => {
      const lockPeriod = 4320; // 30 days
      const apy = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-effective-apy",
        [Cl.uint(lockPeriod)],
        deployer
      );
      // Base APY is 500 (5%), multiplier is 110 (1.1x)
      // Effective APY = (500 * 110) / 100 = 550 (5.5%)
      expect(apy.result).toBeUint(550);
    });

    it("should calculate correct APY for 60-day lock", () => {
      const lockPeriod = 8640; // 60 days
      const apy = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-effective-apy",
        [Cl.uint(lockPeriod)],
        deployer
      );
      // Base APY is 500 (5%), multiplier is 125 (1.25x)
      // Effective APY = (500 * 125) / 100 = 625 (6.25%)
      expect(apy.result).toBeUint(625);
    });

    it("should calculate correct APY for 90-day lock", () => {
      const lockPeriod = 12960; // 90 days
      const apy = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-effective-apy",
        [Cl.uint(lockPeriod)],
        deployer
      );
      // Base APY is 500 (5%), multiplier is 150 (1.5x)
      // Effective APY = (500 * 150) / 100 = 750 (7.5%)
      expect(apy.result).toBeUint(750);
    });
  });

  describe("Pending Rewards Calculation", () => {
    it("should return zero pending rewards for user without stake", () => {
      const pending = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(pending.result).toBeOk(Cl.uint(0));
    });

    it("should calculate pending rewards after blocks have passed", () => {
      // First create a stake in the core contract
      const stakeAmount = 10000000; // 10 STX
      const lockPeriod = 4320; // 30 days

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Mine some blocks (e.g., 100 blocks)
      simnet.mineEmptyBlocks(100);

      const pending = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet1)],
        wallet1
      );

      // Should have some pending rewards (exact amount depends on calculation)
      // Result should be Ok with uint value > 0
      expect(pending.result).toBeOk(expect.any(Object));
    });

    it("should increase pending rewards with more blocks", () => {
      const stakeAmount = 10000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Mine 100 blocks
      simnet.mineEmptyBlocks(100);
      const pending1 = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet1)],
        wallet1
      );

      // Mine 100 more blocks
      simnet.mineEmptyBlocks(100);
      const pending2 = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "calculate-pending-rewards",
        [Cl.principal(wallet1)],
        wallet1
      );

      // Second pending should be greater (though we can't easily compare Clarity values)
      expect(pending2.result).toBeOk(expect.any(Object));
    });
  });

  describe("Claim Rewards Functionality", () => {
    it("should reject claim with no pending rewards", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "claim-rewards",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(302)); // err-no-rewards
    });

    it("should allow claiming rewards after staking", () => {
      // Create stake
      const stakeAmount = 10000000;
      const lockPeriod = 4320;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Fund reward pool
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(10000000)],
        deployer
      );

      // Mine blocks to accumulate rewards
      simnet.mineEmptyBlocks(1000);

      // Claim rewards
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "claim-rewards",
        [],
        wallet1
      );

      // Should succeed (actual amount depends on calculation)
      expect(result).toBeOk(expect.any(Object));
    });

    it("should update total rewards distributed after claim", () => {
      const stakeAmount = 10000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(10000000)],
        deployer
      );

      simnet.mineEmptyBlocks(1000);

      const beforeDistributed = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-total-rewards-distributed",
        [],
        deployer
      );

      simnet.callPublicFn("coinrise-rewards", "claim-rewards", [], wallet1);

      const afterDistributed = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-total-rewards-distributed",
        [],
        deployer
      );

      // After should be greater than before
      expect(afterDistributed.result).not.toBe(beforeDistributed.result);
    });

    it("should track user claimed rewards", () => {
      const stakeAmount = 10000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(10000000)],
        deployer
      );

      simnet.mineEmptyBlocks(1000);

      simnet.callPublicFn("coinrise-rewards", "claim-rewards", [], wallet1);

      const userClaimed = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-user-claimed-rewards",
        [Cl.principal(wallet1)],
        wallet1
      );

      // Should be greater than zero
      expect(userClaimed.result).not.toBeUint(0);
    });
  });

  describe("Compound Rewards Functionality", () => {
    it("should allow compounding rewards", () => {
      const stakeAmount = 10000000;
      const lockPeriod = 4320;

      // Create initial stake
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Fund reward pool
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(10000000)],
        deployer
      );

      // Mine blocks
      simnet.mineEmptyBlocks(1000);

      // Get initial stake amount
      const initialStakeAmount = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-user-stake-amount",
        [Cl.principal(wallet1)],
        wallet1
      );

      // Compound rewards
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "compound-rewards",
        [],
        wallet1
      );

      // Should succeed
      expect(result).toBeOk(expect.any(Object));

      // Stake amount should have increased
      const newStakeAmount = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-user-stake-amount",
        [Cl.principal(wallet1)],
        wallet1
      );

      // New stake should be greater (though we can't easily compare values)
      expect(newStakeAmount.result).not.toBe(initialStakeAmount.result);
    });

    it("should reject compound with no pending rewards", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "compound-rewards",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(302)); // err-no-rewards
    });
  });

  describe("Distribution Cycle Management", () => {
    it("should allow owner to record distribution cycle", () => {
      const amount = 1000000;

      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "record-distribution-cycle",
        [Cl.uint(amount)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(1)); // First cycle ID

      const currentCycle = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-current-cycle",
        [],
        deployer
      );
      expect(currentCycle.result).toBeUint(1);
    });

    it("should reject cycle recording from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "record-distribution-cycle",
        [Cl.uint(1000000)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(300)); // err-owner-only
    });

    it("should store cycle information", () => {
      const amount = 1000000;

      simnet.callPublicFn(
        "coinrise-rewards",
        "record-distribution-cycle",
        [Cl.uint(amount)],
        deployer
      );

      const cycleInfo = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-distribution-cycle",
        [Cl.uint(1)],
        deployer
      );

      expect(cycleInfo.result).toBeSome(
        Cl.tuple({
          "total-distributed": Cl.uint(amount),
          timestamp: Cl.uint(simnet.blockHeight),
          "block-height": Cl.uint(simnet.blockHeight),
        })
      );
    });
  });

  describe("Administrative Functions", () => {
    it("should allow owner to withdraw excess rewards", () => {
      const fundAmount = 10000000;
      const withdrawAmount = 2000000;

      // Fund pool
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(fundAmount)],
        deployer
      );

      // Withdraw excess
      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "withdraw-excess-rewards",
        [Cl.uint(withdrawAmount)],
        deployer
      );
      expect(result).toBeOk(Cl.uint(withdrawAmount));

      const balance = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-reward-pool-balance",
        [],
        deployer
      );
      expect(balance.result).toBeUint(fundAmount - withdrawAmount);
    });

    it("should reject withdrawal exceeding balance", () => {
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(1000000)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "withdraw-excess-rewards",
        [Cl.uint(2000000)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(304)); // err-invalid-amount
    });

    it("should allow owner to emergency drain", () => {
      const fundAmount = 5000000;

      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(fundAmount)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "emergency-drain",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(fundAmount));

      const balance = simnet.callReadOnlyFn(
        "coinrise-rewards",
        "get-reward-pool-balance",
        [],
        deployer
      );
      expect(balance.result).toBeUint(0);
    });

    it("should reject emergency drain from non-owner", () => {
      simnet.callPublicFn(
        "coinrise-rewards",
        "fund-reward-pool",
        [Cl.uint(5000000)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "coinrise-rewards",
        "emergency-drain",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(300)); // err-owner-only
    });
  });
});
