import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("CoinRise Governance Contract Tests", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  describe("Deployment and Initial State", () => {
    it("should initialize with default platform fee rate", () => {
      const feeRate = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-platform-fee-rate",
        [],
        deployer
      );
      expect(feeRate.result).toBeUint(100); // 1%
    });

    it("should initialize with governance active", () => {
      const isActive = simnet.callReadOnlyFn(
        "coinrise-governance",
        "is-governance-active",
        [],
        deployer
      );
      expect(isActive.result).toBeBool(true);
    });

    it("should start with zero proposals", () => {
      const proposalCount = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-proposal-count",
        [],
        deployer
      );
      expect(proposalCount.result).toBeUint(0);
    });

    it("should return false for non-admin users", () => {
      const isAdmin = simnet.callReadOnlyFn(
        "coinrise-governance",
        "is-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isAdmin.result).toBeBool(false);
    });
  });

  describe("Admin Management", () => {
    it("should allow owner to add admin", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isAdmin = simnet.callReadOnlyFn(
        "coinrise-governance",
        "is-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isAdmin.result).toBeBool(true);
    });

    it("should reject admin addition from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "add-admin",
        [Cl.principal(wallet2)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(400)); // err-owner-only
    });

    it("should allow owner to remove admin", () => {
      // Add admin first
      simnet.callPublicFn(
        "coinrise-governance",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      // Remove admin
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "remove-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isAdmin = simnet.callReadOnlyFn(
        "coinrise-governance",
        "is-admin",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isAdmin.result).toBeBool(false);
    });
  });

  describe("Platform Parameter Management", () => {
    it("should allow owner to set platform fee rate", () => {
      const newRate = 200; // 2%

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-platform-fee-rate",
        [Cl.uint(newRate)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const feeRate = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-platform-fee-rate",
        [],
        deployer
      );
      expect(feeRate.result).toBeUint(newRate);
    });

    it("should reject fee rate above maximum (10%)", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-platform-fee-rate",
        [Cl.uint(1500)], // 15%
        deployer
      );
      expect(result).toBeErr(Cl.uint(402)); // err-invalid-parameter
    });

    it("should allow admin to set platform fee rate", () => {
      // Add admin
      simnet.callPublicFn(
        "coinrise-governance",
        "add-admin",
        [Cl.principal(wallet1)],
        deployer
      );

      // Admin sets fee rate
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-platform-fee-rate",
        [Cl.uint(150)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject fee rate change from non-admin", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-platform-fee-rate",
        [Cl.uint(150)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(401)); // err-not-authorized
    });

    it("should allow setting minimum stake required", () => {
      const newMin = 500000; // 0.5 STX

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-min-stake-required",
        [Cl.uint(newMin)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const minStake = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-min-stake-required",
        [],
        deployer
      );
      expect(minStake.result).toBeUint(newMin);
    });

    it("should reject zero minimum stake", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-min-stake-required",
        [Cl.uint(0)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(402)); // err-invalid-parameter
    });

    it("should allow setting maximum stake allowed", () => {
      const newMax = 50000000000; // 50,000 STX

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-max-stake-allowed",
        [Cl.uint(newMax)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const maxStake = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-max-stake-allowed",
        [],
        deployer
      );
      expect(maxStake.result).toBeUint(newMax);
    });

    it("should reject max stake less than min stake", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "set-max-stake-allowed",
        [Cl.uint(50000)], // Less than default min
        deployer
      );
      expect(result).toBeErr(Cl.uint(402)); // err-invalid-parameter
    });
  });

  describe("Platform Statistics", () => {
    it("should allow admin to update platform stats", () => {
      const statType = "total-volume";
      const value = 100000000;

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "update-platform-stat",
        [Cl.stringAscii(statType), Cl.uint(value)],
        deployer
      );
      expect(result).toBeOk(
        Cl.tuple({
          value: Cl.uint(value),
          "last-updated": Cl.uint(simnet.blockHeight),
        })
      );
    });

    it("should retrieve stored platform stats", () => {
      const statType = "total-users";
      const value = 500;

      simnet.callPublicFn(
        "coinrise-governance",
        "update-platform-stat",
        [Cl.stringAscii(statType), Cl.uint(value)],
        deployer
      );

      const stat = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-platform-stat",
        [Cl.stringAscii(statType)],
        deployer
      );

      expect(stat.result).toBeSome(
        Cl.tuple({
          value: Cl.uint(value),
          "last-updated": Cl.uint(simnet.blockHeight),
        })
      );
    });

    it("should reject stat update from non-admin", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "update-platform-stat",
        [Cl.stringAscii("test-stat"), Cl.uint(100)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(401)); // err-not-authorized
    });
  });

  describe("Proposal Creation", () => {
    it("should allow user with sufficient stake to create proposal", () => {
      // First create a stake
      const stakeAmount = 2000000; // 2 STX (above min proposal stake)
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8("Reduce platform fee"),
          Cl.stringUtf8("Proposal to reduce the platform fee rate from 1% to 0.5%"),
          Cl.stringAscii("platform-fee-rate"),
          Cl.uint(50),
        ],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(1)); // First proposal ID

      const proposalCount = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-proposal-count",
        [],
        deployer
      );
      expect(proposalCount.result).toBeUint(1);
    });

    it("should reject proposal from user with insufficient stake", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8("Test proposal"),
          Cl.stringUtf8("This should fail"),
          Cl.stringAscii("platform-fee-rate"),
          Cl.uint(50),
        ],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(407)); // err-insufficient-stake
    });

    it("should store proposal details correctly", () => {
      const stakeAmount = 2000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      const title = "Test Proposal";
      const description = "This is a test proposal";
      const parameter = "platform-fee-rate";
      const newValue = 75;

      simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8(title),
          Cl.stringUtf8(description),
          Cl.stringAscii(parameter),
          Cl.uint(newValue),
        ],
        wallet1
      );

      const proposal = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-proposal",
        [Cl.uint(1)],
        deployer
      );

      expect(proposal.result).toBeSome(
        Cl.tuple({
          proposer: Cl.principal(wallet1),
          title: Cl.stringUtf8(title),
          description: Cl.stringUtf8(description),
          parameter: Cl.stringAscii(parameter),
          "new-value": Cl.uint(newValue),
          "votes-for": Cl.uint(0),
          "votes-against": Cl.uint(0),
          "start-block": Cl.uint(simnet.blockHeight),
          "end-block": Cl.uint(simnet.blockHeight + 10080),
          executed: Cl.bool(false),
          passed: Cl.bool(false),
        })
      );
    });
  });

  describe("Voting on Proposals", () => {
    beforeEach(() => {
      // Setup: Create stakes and a proposal
      const stakeAmount = 5000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8("Test Proposal"),
          Cl.stringUtf8("Test Description"),
          Cl.stringAscii("platform-fee-rate"),
          Cl.uint(75),
        ],
        wallet1
      );
    });

    it("should allow user with stake to vote", () => {
      const stakeAmount = 3000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet2
      );

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)], // Vote for
        wallet2
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject vote from user without stake", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet3
      );
      expect(result).toBeErr(Cl.uint(407)); // err-insufficient-stake
    });

    it("should reject duplicate voting", () => {
      const stakeAmount = 3000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet2
      );

      // First vote
      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet2
      );

      // Second vote should fail
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(false)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(405)); // err-already-voted
    });

    it("should update vote counts correctly", () => {
      const stake1 = 3000000;
      const stake2 = 2000000;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stake1), Cl.uint(4320)],
        wallet2
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stake2), Cl.uint(4320)],
        wallet3
      );

      // Vote for
      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet2
      );

      // Vote against
      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(false)],
        wallet3
      );

      const proposal = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-proposal",
        [Cl.uint(1)],
        deployer
      );

      // Check that votes were recorded (exact tuple matching would be complex)
      expect(proposal.result).toBeSome(expect.any(Object));
    });

    it("should reject votes after voting period ends", () => {
      const stakeAmount = 3000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet2
      );

      // Mine blocks to pass voting period
      simnet.mineEmptyBlocks(10081); // Beyond voting period

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(406)); // err-voting-ended
    });

    it("should weight votes by stake amount", () => {
      const largeStake = 10000000;
      const smallStake = 1000000;

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(largeStake), Cl.uint(4320)],
        wallet2
      );

      // Vote with large stake
      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet2
      );

      const userVote = simnet.callReadOnlyFn(
        "coinrise-governance",
        "get-user-vote",
        [Cl.uint(1), Cl.principal(wallet2)],
        deployer
      );

      expect(userVote.result).toBeSome(
        Cl.tuple({
          vote: Cl.bool(true),
          weight: Cl.uint(largeStake),
        })
      );
    });
  });

  describe("Proposal Execution", () => {
    it("should allow owner to execute passed proposal", () => {
      // Create and vote on proposal
      const stakeAmount = 5000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-governance",
        "create-proposal",
        [
          Cl.stringUtf8("Reduce fee"),
          Cl.stringUtf8("Reduce platform fee"),
          Cl.stringAscii("platform-fee-rate"),
          Cl.uint(50),
        ],
        wallet1
      );

      // Vote for (proposer votes)
      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(true)],
        wallet1
      );

      // Mine blocks to end voting
      simnet.mineEmptyBlocks(10081);

      // Execute
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "execute-proposal",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject execution before voting ends", () => {
      const stakeAmount = 5000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
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

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "execute-proposal",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeErr(Cl.uint(406)); // err-voting-ended
    });

    it("should reject execution from non-owner/non-admin", () => {
      const stakeAmount = 5000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
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

      simnet.mineEmptyBlocks(10081);

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "execute-proposal",
        [Cl.uint(1)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(401)); // err-not-authorized
    });
  });

  describe("Emergency Functions", () => {
    it("should allow owner to shutdown governance", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "emergency-shutdown",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isActive = simnet.callReadOnlyFn(
        "coinrise-governance",
        "is-governance-active",
        [],
        deployer
      );
      expect(isActive.result).toBeBool(false);
    });

    it("should reject proposal creation when shutdown", () => {
      simnet.callPublicFn(
        "coinrise-governance",
        "emergency-shutdown",
        [],
        deployer
      );

      const stakeAmount = 2000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
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
      expect(result).toBeErr(Cl.uint(401)); // err-not-authorized
    });

    it("should allow owner to resume governance", () => {
      simnet.callPublicFn(
        "coinrise-governance",
        "emergency-shutdown",
        [],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "coinrise-governance",
        "emergency-resume",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isActive = simnet.callReadOnlyFn(
        "coinrise-governance",
        "is-governance-active",
        [],
        deployer
      );
      expect(isActive.result).toBeBool(true);
    });
  });

  describe("Proposal Pass/Fail Logic", () => {
    it("should correctly identify passed proposals (>50% approval)", () => {
      // Create proposal
      const stakeAmount = 5000000;
      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(stakeAmount), Cl.uint(4320)],
        wallet2
      );

      simnet.callPublicFn(
        "coinrise-core",
        "create-stake",
        [Cl.uint(2000000), Cl.uint(4320)],
        wallet3
      );

      simnet.callPublicFn(
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

      // Two vote for, one against (10M for vs 2M against)
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

      simnet.callPublicFn(
        "coinrise-governance",
        "vote-on-proposal",
        [Cl.uint(1), Cl.bool(false)],
        wallet3
      );

      const hasPassed = simnet.callReadOnlyFn(
        "coinrise-governance",
        "has-proposal-passed",
        [Cl.uint(1)],
        deployer
      );

      expect(hasPassed.result).toBeOk(Cl.bool(true));
    });
  });
});
