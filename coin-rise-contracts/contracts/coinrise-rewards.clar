;; CoinRise Rewards Contract
;; Handles reward calculation and distribution to stakers

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u300))
(define-constant err-not-found (err u301))
(define-constant err-no-rewards (err u302))
(define-constant err-already-claimed (err u303))
(define-constant err-invalid-amount (err u304))
(define-constant err-distribution-failed (err u305))
(define-constant err-vault-error (err u306))

;; Base APY in basis points (500 = 5%)
(define-constant base-apy u500)

;; Blocks per year (assuming ~10 min blocks)
(define-constant blocks-per-year u52560)

;; Data Variables
(define-data-var reward-pool-balance uint u0)
(define-data-var total-rewards-distributed uint u0)
(define-data-var core-contract principal tx-sender)
(define-data-var vault-contract principal tx-sender)

;; Track claimed rewards per user
(define-map user-claimed-rewards principal uint)

;; Reward distribution cycles
(define-map distribution-cycles
    uint  ;; cycle-id
    {
        total-distributed: uint,
        timestamp: uint,
        block-height: uint
    }
)

(define-data-var current-cycle uint u0)

;; Read-only functions
(define-read-only (get-reward-pool-balance)
    (var-get reward-pool-balance)
)

(define-read-only (get-total-rewards-distributed)
    (var-get total-rewards-distributed)
)

(define-read-only (get-user-claimed-rewards (user principal))
    (default-to u0 (map-get? user-claimed-rewards user))
)

(define-read-only (get-current-cycle)
    (var-get current-cycle)
)

(define-read-only (get-distribution-cycle (cycle-id uint))
    (map-get? distribution-cycles cycle-id)
)

;; Calculate pending rewards for a user
(define-read-only (calculate-pending-rewards (user principal))
    (match (contract-call? .coinrise-core get-stake user)
        stake-data
            (let
                (
                    (stake-amount (get amount stake-data))
                    (start-block (get start-block stake-data))
                    (last-claim (get last-claim-block stake-data))
                    (lock-period (get lock-period stake-data))
                    (blocks-staked (- block-height last-claim))
                    (lock-multiplier (contract-call? .coinrise-core calculate-lock-multiplier lock-period))
                )
                ;; Calculate rewards: (stake * apy * blocks / blocks-per-year * multiplier / 100)
                (let
                    (
                        (base-reward (/ (* (* stake-amount base-apy) blocks-staked) blocks-per-year))
                        (multiplied-reward (/ (* base-reward lock-multiplier) u100))
                        (final-reward (/ multiplied-reward u100))  ;; Adjust for basis points
                    )
                    (ok final-reward)
                )
            )
        (ok u0)
    )
)

;; Calculate APY for a specific lock period
(define-read-only (calculate-effective-apy (lock-period uint))
    (let
        (
            (lock-multiplier (contract-call? .coinrise-core calculate-lock-multiplier lock-period))
            (effective-apy (/ (* base-apy lock-multiplier) u100))
        )
        effective-apy
    )
)

;; Administrative functions
(define-public (set-core-contract (core principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set core-contract core))
    )
)

(define-public (set-vault-contract (vault principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set vault-contract vault))
    )
)

;; Fund reward pool
(define-public (fund-reward-pool (amount uint))
    (begin
        (asserts! (> amount u0) err-invalid-amount)
        
        ;; Transfer STX to reward pool (held in vault)
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        ;; Update reward pool balance
        (var-set reward-pool-balance (+ (var-get reward-pool-balance) amount))
        
        (ok amount)
    )
)

;; Claim rewards
(define-public (claim-rewards)
    (let
        (
            (sender tx-sender)
            (pending-result (unwrap! (calculate-pending-rewards sender) err-no-rewards))
        )
        (asserts! (> pending-result u0) err-no-rewards)
        (asserts! (>= (var-get reward-pool-balance) pending-result) err-no-rewards)
        
        ;; Transfer rewards from contract
        (try! (as-contract (stx-transfer? pending-result tx-sender sender)))
        
        ;; Update reward pool balance
        (var-set reward-pool-balance (- (var-get reward-pool-balance) pending-result))
        
        ;; Update total distributed
        (var-set total-rewards-distributed (+ (var-get total-rewards-distributed) pending-result))
        
        ;; Update user claimed rewards
        (map-set user-claimed-rewards sender 
            (+ (get-user-claimed-rewards sender) pending-result))
        
        ;; Note: The core contract needs to update last-claim-block
        ;; This would require a callback or separate function
        
        (ok pending-result)
    )
)

;; Compound rewards (claim and restake)
(define-public (compound-rewards)
    (let
        (
            (sender tx-sender)
            (pending-result (unwrap! (calculate-pending-rewards sender) err-no-rewards))
        )
        (asserts! (> pending-result u0) err-no-rewards)
        (asserts! (>= (var-get reward-pool-balance) pending-result) err-no-rewards)
        
        ;; Update reward pool balance
        (var-set reward-pool-balance (- (var-get reward-pool-balance) pending-result))
        
        ;; Update total distributed
        (var-set total-rewards-distributed (+ (var-get total-rewards-distributed) pending-result))
        
        ;; Update user claimed rewards
        (map-set user-claimed-rewards sender 
            (+ (get-user-claimed-rewards sender) pending-result))
        
        ;; Transfer to vault and increase stake
        (match (as-contract (stx-transfer? pending-result tx-sender (var-get vault-contract)))
            success
                (match (contract-call? .coinrise-vault credit-user sender pending-result)
                    credit-success
                        ;; Increase stake in core contract
                        (contract-call? .coinrise-core increase-stake pending-result)
                    credit-error err-vault-error
                )
            transfer-error err-distribution-failed
        )
    )
)

;; Record distribution cycle (admin only)
(define-public (record-distribution-cycle (amount uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        
        (let ((cycle-id (+ (var-get current-cycle) u1)))
            (map-set distribution-cycles cycle-id {
                total-distributed: amount,
                timestamp: block-height,
                block-height: block-height
            })
            (var-set current-cycle cycle-id)
            (ok cycle-id)
        )
    )
)

;; Withdraw excess rewards (owner only)
(define-public (withdraw-excess-rewards (amount uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (<= amount (var-get reward-pool-balance)) err-invalid-amount)
        
        (try! (as-contract (stx-transfer? amount tx-sender contract-owner)))
        (var-set reward-pool-balance (- (var-get reward-pool-balance) amount))
        
        (ok amount)
    )
)

;; Emergency drain (owner only)
(define-public (emergency-drain)
    (let ((balance (var-get reward-pool-balance)))
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (> balance u0) err-no-rewards)
        
        (try! (as-contract (stx-transfer? balance tx-sender contract-owner)))
        (var-set reward-pool-balance u0)
        
        (ok balance)
    )
)
