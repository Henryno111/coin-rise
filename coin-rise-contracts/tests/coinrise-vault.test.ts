import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("CoinRise Vault Contract Tests", () => {
  beforeEach(() => {
    simnet.mineEmptyBlock();
  });

  describe("Deployment and Initial State", () => {
    it("should initialize with zero balance", () => {
      const balance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-total-balance",
        [],
        deployer
      );
      expect(balance.result).toBeUint(0);
    });

    it("should not be locked initially", () => {
      const locked = simnet.callReadOnlyFn(
        "coinrise-vault",
        "is-vault-locked",
        [],
        deployer
      );
      expect(locked.result).toBeBool(false);
    });

    it("should return zero balance for new user", () => {
      const balance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(balance.result).toBeUint(0);
    });
  });

  describe("Deposit Functionality", () => {
    it("should allow user to deposit STX", () => {
      const depositAmount = 1000000; // 1 STX
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(depositAmount)],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(depositAmount));

      // Verify user balance
      const balance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeUint(depositAmount);

      // Verify total balance
      const totalBalance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-total-balance",
        [],
        deployer
      );
      expect(totalBalance.result).toBeUint(depositAmount);
    });

    it("should reject deposit of zero amount", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(104)); // err-invalid-amount
    });

    it("should allow multiple deposits from same user", () => {
      const firstDeposit = 500000;
      const secondDeposit = 300000;

      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(firstDeposit)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(secondDeposit)],
        wallet1
      );

      const balance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeUint(firstDeposit + secondDeposit);
    });

    it("should track deposits from multiple users", () => {
      const amount1 = 1000000;
      const amount2 = 2000000;

      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(amount1)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(amount2)],
        wallet2
      );

      const balance1 = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance1.result).toBeUint(amount1);

      const balance2 = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet2)],
        wallet2
      );
      expect(balance2.result).toBeUint(amount2);

      const totalBalance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-total-balance",
        [],
        deployer
      );
      expect(totalBalance.result).toBeUint(amount1 + amount2);
    });
  });

  describe("Withdrawal Functionality", () => {
    it("should allow user to withdraw their balance", () => {
      const depositAmount = 1000000;
      const withdrawAmount = 400000;

      // Deposit first
      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(depositAmount)],
        wallet1
      );

      // Withdraw
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "withdraw",
        [Cl.uint(withdrawAmount)],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(withdrawAmount));

      // Check remaining balance
      const balance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeUint(depositAmount - withdrawAmount);
    });

    it("should reject withdrawal exceeding balance", () => {
      const depositAmount = 500000;
      const withdrawAmount = 1000000;

      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(depositAmount)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "withdraw",
        [Cl.uint(withdrawAmount)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(102)); // err-insufficient-balance
    });

    it("should reject zero withdrawal", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "withdraw",
        [Cl.uint(0)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(104)); // err-invalid-amount
    });

    it("should allow complete withdrawal", () => {
      const depositAmount = 1000000;

      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(depositAmount)],
        wallet1
      );

      simnet.callPublicFn(
        "coinrise-vault",
        "withdraw",
        [Cl.uint(depositAmount)],
        wallet1
      );

      const balance = simnet.callReadOnlyFn(
        "coinrise-vault",
        "get-user-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance.result).toBeUint(0);
    });
  });

  describe("Authorization Management", () => {
    it("should allow owner to authorize contracts", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "authorize-contract",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isAuthorized = simnet.callReadOnlyFn(
        "coinrise-vault",
        "is-authorized",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isAuthorized.result).toBeBool(true);
    });

    it("should reject authorization from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "authorize-contract",
        [Cl.principal(wallet2)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(100)); // err-owner-only
    });

    it("should allow owner to revoke authorization", () => {
      // Authorize first
      simnet.callPublicFn(
        "coinrise-vault",
        "authorize-contract",
        [Cl.principal(wallet1)],
        deployer
      );

      // Revoke
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "revoke-authorization",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isAuthorized = simnet.callReadOnlyFn(
        "coinrise-vault",
        "is-authorized",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(isAuthorized.result).toBeBool(false);
    });
  });

  describe("Vault Locking", () => {
    it("should allow owner to lock vault", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(true)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const isLocked = simnet.callReadOnlyFn(
        "coinrise-vault",
        "is-vault-locked",
        [],
        deployer
      );
      expect(isLocked.result).toBeBool(true);
    });

    it("should reject deposits when vault is locked", () => {
      // Lock vault
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(true)],
        deployer
      );

      // Try to deposit
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(1000000)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(101)); // err-not-authorized
    });

    it("should reject withdrawals when vault is locked", () => {
      // Deposit first while unlocked
      simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(1000000)],
        wallet1
      );

      // Lock vault
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(true)],
        deployer
      );

      // Try to withdraw
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "withdraw",
        [Cl.uint(500000)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(101)); // err-not-authorized
    });

    it("should allow unlock and resume operations", () => {
      // Lock
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(true)],
        deployer
      );

      // Unlock
      simnet.callPublicFn(
        "coinrise-vault",
        "set-vault-lock",
        [Cl.bool(false)],
        deployer
      );

      // Should allow deposit now
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "deposit",
        [Cl.uint(1000000)],
        wallet1
      );
      expect(result).toBeOk(Cl.uint(1000000));
    });
  });

  describe("Authorized Contract Operations", () => {
    it("should allow authorized contract to credit user", () => {
      // Authorize the core contract
      simnet.callPublicFn(
        "coinrise-vault",
        "authorize-contract",
        [Cl.principal(`${deployer}.coinrise-core`)],
        deployer
      );

      // Note: This would require calling from the contract context
      // This is a simplified test - actual implementation would need contract-call
    });

    it("should reject credit from unauthorized contract", () => {
      const { result } = simnet.callPublicFn(
        "coinrise-vault",
        "credit-user",
        [Cl.principal(wallet1), Cl.uint(1000000)],
        wallet2
      );
      expect(result).toBeErr(Cl.uint(101)); // err-not-authorized
    });
  });
});
