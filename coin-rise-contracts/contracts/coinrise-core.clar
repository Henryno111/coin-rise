;; CoinRise Core Contract
;; Main staking pool logic with lock periods and stake management

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-not-found (err u201))
(define-constant err-already-exists (err u202))
(define-constant err-invalid-amount (err u203))
(define-constant err-stake-locked (err u204))
(define-constant err-pool-inactive (err u205))
(define-constant err-vault-error (err u206))
(define-constant err-invalid-period (err u207))

;; Minimum stake amount (0.1 STX)
(define-constant min-stake-amount u100000)

;; Lock periods (in blocks)
(define-constant lock-period-30-days u4320)  ;; ~30 days
(define-constant lock-period-60-days u8640)  ;; ~60 days
(define-constant lock-period-90-days u12960) ;; ~90 days

;; Data Variables
(define-data-var pool-active bool true)
(define-data-var total-staked uint u0)
(define-data-var total-stakers uint u0)
(define-data-var vault-contract principal tx-sender)
(define-data-var rewards-contract principal tx-sender)

;; Stake record
(define-map stakes
    principal
    {
        amount: uint,
        lock-period: uint,
        start-block: uint,
        unlock-block: uint,
        last-claim-block: uint
    }
)

;; Track all stakers for iteration
(define-map staker-exists principal bool)

;; Read-only functions
(define-read-only (get-stake (user principal))
    (map-get? stakes user)
)

(define-read-only (get-total-staked)
    (var-get total-staked)
)

(define-read-only (get-total-stakers)
    (var-get total-stakers)
)

(define-read-only (is-pool-active)
    (var-get pool-active)
)

(define-read-only (get-vault-contract)
    (var-get vault-contract)
)

(define-read-only (is-stake-unlocked (user principal))
    (match (map-get? stakes user)
        stake-data (>= block-height (get unlock-block stake-data))
        false
    )
)

(define-read-only (get-user-stake-amount (user principal))
    (match (map-get? stakes user)
        stake-data (get amount stake-data)
        u0
    )
)

(define-read-only (calculate-lock-multiplier (lock-period uint))
    ;; Returns multiplier as basis points (100 = 1x, 125 = 1.25x, etc.)
    (if (is-eq lock-period lock-period-90-days)
        u150  ;; 1.5x for 90 days
        (if (is-eq lock-period lock-period-60-days)
            u125  ;; 1.25x for 60 days
            u110  ;; 1.1x for 30 days
        )
    )
)

;; Administrative functions
(define-public (set-vault-contract (vault principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set vault-contract vault))
    )
)

(define-public (set-rewards-contract (rewards principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set rewards-contract rewards))
    )
)

(define-public (set-pool-active (active bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set pool-active active))
    )
)

;; Core staking functions
(define-public (create-stake (amount uint) (lock-period uint))
    (let
        (
            (sender tx-sender)
            (current-stake (map-get? stakes sender))
        )
        (asserts! (var-get pool-active) err-pool-inactive)
        (asserts! (is-none current-stake) err-already-exists)
        (asserts! (>= amount min-stake-amount) err-invalid-amount)
        (asserts! 
            (or 
                (is-eq lock-period lock-period-30-days)
                (or 
                    (is-eq lock-period lock-period-60-days)
                    (is-eq lock-period lock-period-90-days)
                )
            )
            err-invalid-period
        )
        
        ;; Deposit to vault via vault contract
        (match (contract-call? .coinrise-vault deposit amount)
            success 
                (begin
                    ;; Create stake record
                    (map-set stakes sender {
                        amount: amount,
                        lock-period: lock-period,
                        start-block: block-height,
                        unlock-block: (+ block-height lock-period),
                        last-claim-block: block-height
                    })
                    
                    ;; Track staker
                    (if (is-none (map-get? staker-exists sender))
                        (begin
                            (map-set staker-exists sender true)
                            (var-set total-stakers (+ (var-get total-stakers) u1))
                        )
                        true
                    )
                    
                    ;; Update total staked
                    (var-set total-staked (+ (var-get total-staked) amount))
                    
                    (ok amount)
                )
            error err-vault-error
        )
    )
)

(define-public (increase-stake (additional-amount uint))
    (let
        (
            (sender tx-sender)
            (stake-data (unwrap! (map-get? stakes sender) err-not-found))
        )
        (asserts! (var-get pool-active) err-pool-inactive)
        (asserts! (> additional-amount u0) err-invalid-amount)
        
        ;; Deposit additional amount to vault
        (match (contract-call? .coinrise-vault deposit additional-amount)
            success
                (begin
                    ;; Update stake amount
                    (map-set stakes sender (merge stake-data {
                        amount: (+ (get amount stake-data) additional-amount)
                    }))
                    
                    ;; Update total staked
                    (var-set total-staked (+ (var-get total-staked) additional-amount))
                    
                    (ok additional-amount)
                )
            error err-vault-error
        )
    )
)

(define-public (withdraw-stake)
    (let
        (
            (sender tx-sender)
            (stake-data (unwrap! (map-get? stakes sender) err-not-found))
            (stake-amount (get amount stake-data))
        )
        ;; Check if stake is unlocked
        (asserts! (>= block-height (get unlock-block stake-data)) err-stake-locked)
        
        ;; Withdraw from vault
        (match (contract-call? .coinrise-vault withdraw stake-amount)
            success
                (begin
                    ;; Remove stake
                    (map-delete stakes sender)
                    
                    ;; Update totals
                    (var-set total-staked (- (var-get total-staked) stake-amount))
                    (var-set total-stakers (- (var-get total-stakers) u1))
                    (map-delete staker-exists sender)
                    
                    (ok stake-amount)
                )
            error err-vault-error
        )
    )
)

(define-public (extend-lock-period (new-lock-period uint))
    (let
        (
            (sender tx-sender)
            (stake-data (unwrap! (map-get? stakes sender) err-not-found))
            (current-unlock (get unlock-block stake-data))
        )
        (asserts! (var-get pool-active) err-pool-inactive)
        (asserts! 
            (or 
                (is-eq new-lock-period lock-period-30-days)
                (or 
                    (is-eq new-lock-period lock-period-60-days)
                    (is-eq new-lock-period lock-period-90-days)
                )
            )
            err-invalid-period
        )
        
        ;; Calculate new unlock block from current block
        (let ((new-unlock (+ block-height new-lock-period)))
            ;; Only allow extending, not shortening
            (asserts! (> new-unlock current-unlock) err-invalid-period)
            
            ;; Update stake
            (ok (map-set stakes sender (merge stake-data {
                lock-period: new-lock-period,
                unlock-block: new-unlock
            })))
        )
    )
)

;; Emergency functions (owner only)
(define-public (emergency-pause)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set pool-active false)
        (ok true)
    )
)

(define-public (emergency-resume)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set pool-active true)
        (ok true)
    )
)
