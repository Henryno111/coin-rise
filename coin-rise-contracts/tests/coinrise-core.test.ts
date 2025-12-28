import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("CoinRise Core Contract Tests", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  describe("Deployment and Initial State", () => {
    it("should initialize with zero staked amount", () => {
      const totalStaked = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );
      expect(totalStaked.result).toBeUint(0);
    });

    it("should initialize with zero stakers", () => {
      const totalStakers = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-stakers",
        [],
        deployer
      );
      expect(totalStakers.result).toBeUint(0);
    });

    it("should have pool active by default", () => {
      const isActive = simnet.callReadOnlyFn(
        "coinrise-core",
        "is-pool-active",
        [],
        deployer
      );
      expect(isActive.result).toBeBool(true);
    });

    it("should return no stake for new user", () => {
      const stake = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-stake",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(stake.result).toBeNone();
    });
  });

  describe("Lock Period Configuration", () => {
    it("should calculate correct multiplier for 30-day lock", () => {
      const multiplier = simnet.callReadOnlyFn(
        "coinrise-core",
        "calculate-lock-multiplier",
        [Cl.uint(4320)], // 30 days
        deployer
      );
      expect(multiplier.result).toBeUint(110); // 1.1x
    });

    it("should calculate correct multiplier for 60-day lock", () => {
      const multiplier = simnet.callReadOnlyFn(
        "coinrise-core",
        "calculate-lock-multiplier",
        [Cl.uint(8640)], // 60 days
        deployer
      );
      expect(multiplier.result).toBeUint(125); // 1.25x
    });

    it("should calculate correct multiplier for 90-day lock", () => {
      const multiplier = simnet.callReadOnlyFn(
        "coinrise-core",
        "calculate-lock-multiplier",
        [Cl.uint(12960)], // 90 days
        deployer
      );
      expect(multiplier.result).toBeUint(150); // 1.5x
    });
  });

  describe("Create Stake Functionality", () => {
    it("should allow user to create stake with 30-day lock", () => {
      const stakeAmount = 1000000; // 1 STX
      const lockPeriod = 4320; // 30 days

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(stakeAmount));

      // Verify stake was created
      const stake = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-stake",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(stake.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(stakeAmount),
          "lock-period": Cl.uint(lockPeriod),
          "start-block": Cl.uint(simnet.blockHeight),
          "unlock-block": Cl.uint(simnet.blockHeight + lockPeriod),
          "last-claim-block": Cl.uint(simnet.blockHeight),
        })
      );
    });

    it("should reject stake below minimum amount", () => {
      const stakeAmount = 50000; // Below 0.1 STX
      const lockPeriod = 4320;

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(203)); // err-invalid-amount
    });

    it("should reject invalid lock period", () => {
      const stakeAmount = 1000000;
      const invalidLockPeriod = 5000; // Not a valid period

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(invalidLockPeriod)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(207)); // err-invalid-period
    });

    it("should reject duplicate stake creation", () => {
      const stakeAmount = 1000000;
      const lockPeriod = 4320;

      // Create first stake
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Try to create another
      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(202)); // err-already-exists
    });

    it("should update total staked and stakers count", () => {
      const stakeAmount = 1000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      const totalStaked = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );
      expect(totalStaked.result).toBeUint(stakeAmount);

      const totalStakers = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-stakers",
        [],
        deployer
      );
      expect(totalStakers.result).toBeUint(1);
    });

    it("should handle multiple users staking", () => {
      const amount1 = 1000000;
      const amount2 = 2000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(amount1), Cl.uint(lockPeriod)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(amount2), Cl.uint(lockPeriod)],
        wallet2
      );

      const totalStaked = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );
      expect(totalStaked.result).toBeUint(amount1 + amount2);

      const totalStakers = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-stakers",
        [],
        deployer
      );
      expect(totalStakers.result).toBeUint(2);
    });
  });

  describe("Increase Stake Functionality", () => {
    it("should allow user to increase existing stake", () => {
      const initialStake = 1000000;
      const additionalStake = 500000;
      const lockPeriod = 4320;

      // Create initial stake
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(initialStake), Cl.uint(lockPeriod)],
        wallet1
      );

      // Increase stake
      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "increase-stake",
        [Cl.uint(additionalStake)],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(additionalStake));

      // Verify increased amount
      const userStakeAmount = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-user-stake-amount",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(userStakeAmount.result).toBeUint(initialStake + additionalStake);
    });

    it("should reject increase for non-existent stake", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "increase-stake",
        [Cl.uint(500000)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(201)); // err-not-found
    });

    it("should reject zero increase amount", () => {
      const initialStake = 1000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(initialStake), Cl.uint(lockPeriod)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "increase-stake",
        [Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(203)); // err-invalid-amount
    });
  });

  describe("Withdraw Stake Functionality", () => {
    it("should reject withdrawal before unlock period", () => {
      const stakeAmount = 1000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Try to withdraw immediately
      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "withdraw-stake",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(204)); // err-stake-locked
    });

    it("should allow withdrawal after unlock period", () => {
      const stakeAmount = 1000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Mine blocks to pass lock period
      simnet.mineEmptyBlocks(lockPeriod + 1);

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "withdraw-stake",
        [],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(stakeAmount));

      // Verify stake was removed
      const stake = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-stake",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(stake.result).toBeNone();
    });

    it("should update totals after withdrawal", () => {
      const stakeAmount = 1000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Mine blocks and withdraw
      simnet.mineEmptyBlocks(lockPeriod + 1);
      simnet.callPublicFn("coinrise-core", "withdraw-stake", [], wallet1);

      const totalStaked = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-staked",
        [],
        deployer
      );
      expect(totalStaked.result).toBeUint(0);

      const totalStakers = simnet.callReadOnlyFn(
        "coinrise-core",
        "get-total-stakers",
        [],
        deployer
      );
      expect(totalStakers.result).toBeUint(0);
    });

    it("should correctly report unlock status", () => {
      const stakeAmount = 1000000;
      const lockPeriod = 4320;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(lockPeriod)],
        wallet1
      );

      // Check locked status
      let isUnlocked = simnet.callReadOnlyFn(
        "coinrise-core",
        "is-stake-unlocked",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(isUnlocked.result).toBeBool(false);

      // Mine blocks and check again
      simnet.mineEmptyBlocks(lockPeriod + 1);
      isUnlocked = simnet.callReadOnlyFn(
        "coinrise-core",
        "is-stake-unlocked",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(isUnlocked.result).toBeBool(true);
    });
  });

  describe("Extend Lock Period Functionality", () => {
    it("should allow extending lock period", () => {
      const stakeAmount = 1000000;
      const initialLockPeriod = 4320; // 30 days
      const newLockPeriod = 8640; // 60 days

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(initialLockPeriod)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "extend-lock-period",
        [Cl.uint(newLockPeriod)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject shortening lock period", () => {
      const stakeAmount = 1000000;
      const initialLockPeriod = 8640; // 60 days
      const shorterPeriod = 4320; // 30 days

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(initialLockPeriod)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "extend-lock-period",
        [Cl.uint(shorterPeriod)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(207)); // err-invalid-period
    });
  });

  describe("Administrative Functions", () => {
    it("should allow owner to pause pool", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "emergency-pause",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isActive = simnet.callReadOnlyFn(
        "coinrise-core",
        "is-pool-active",
        [],
        deployer
      );
      expect(isActive.result).toBeBool(false);
    });

    it("should reject new stakes when paused", () => {
      simnet.callPublicFn("coinrise-core", "emergency-pause", [], deployer);

      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(1000000), Cl.uint(4320)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(205)); // err-pool-inactive
    });

    it("should allow owner to resume pool", () => {
      simnet.callPublicFn("coinrise-core", "emergency-pause", [], deployer);
      simnet.callPublicFn("coinrise-core", "emergency-resume", [], deployer);

      const isActive = simnet.callReadOnlyFn(
        "coinrise-core",
        "is-pool-active",
        [],
        deployer
      );
      expect(isActive.result).toBeBool(true);
    });

    it("should reject pause from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-core",
        "emergency-pause",
        [],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(200)); // err-owner-only
    });
  });
});
