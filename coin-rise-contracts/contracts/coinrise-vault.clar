;; CoinRise Vault Contract
;; Secure storage for pooled funds with controlled access

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-transfer-failed (err u103))
(define-constant err-invalid-amount (err u104))

;; Data Variables
(define-data-var total-vault-balance uint u0)
(define-data-var vault-locked bool false)

;; Authorization map - which contracts can access the vault
(define-map authorized-contracts principal bool)

;; Track individual user balances in vault
(define-map user-vault-balances principal uint)

;; Read-only functions
(define-read-only (get-total-balance)
    (var-get total-vault-balance)
)

(define-read-only (get-user-balance (user principal))
    (default-to u0 (map-get? user-vault-balances user))
)

(define-read-only (is-authorized (contract principal))
    (default-to false (map-get? authorized-contracts contract))
)

(define-read-only (is-vault-locked)
    (var-get vault-locked)
)

;; Administrative functions
(define-public (authorize-contract (contract principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (map-set authorized-contracts contract true))
    )
)

(define-public (revoke-authorization (contract principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (map-delete authorized-contracts contract))
    )
)

(define-public (set-vault-lock (locked bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set vault-locked locked))
    )
)

;; Core vault functions
(define-public (deposit (amount uint))
    (let
        (
            (sender tx-sender)
            (current-balance (get-user-balance sender))
        )
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (not (var-get vault-locked)) err-not-authorized)
        
        ;; Transfer STX to vault
        (try! (stx-transfer? amount sender (as-contract tx-sender)))
        
        ;; Update balances
        (map-set user-vault-balances sender (+ current-balance amount))
        (var-set total-vault-balance (+ (var-get total-vault-balance) amount))
        
        (ok amount)
    )
)

(define-public (withdraw (amount uint))
    (let
        (
            (sender tx-sender)
            (current-balance (get-user-balance sender))
        )
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (>= current-balance amount) err-insufficient-balance)
        (asserts! (not (var-get vault-locked)) err-not-authorized)
        
        ;; Transfer STX from vault
        (try! (as-contract (stx-transfer? amount tx-sender sender)))
        
        ;; Update balances
        (map-set user-vault-balances sender (- current-balance amount))
        (var-set total-vault-balance (- (var-get total-vault-balance) amount))
        
        (ok amount)
    )
)

;; Authorized contract functions
(define-public (credit-user (user principal) (amount uint))
    (begin
        (asserts! (is-authorized contract-caller) err-not-authorized)
        (asserts! (> amount u0) err-invalid-amount)
        
        (let ((current-balance (get-user-balance user)))
            (map-set user-vault-balances user (+ current-balance amount))
            (var-set total-vault-balance (+ (var-get total-vault-balance) amount))
            (ok amount)
        )
    )
)

(define-public (debit-user (user principal) (amount uint))
    (begin
        (asserts! (is-authorized contract-caller) err-not-authorized)
        (asserts! (> amount u0) err-invalid-amount)
        
        (let ((current-balance (get-user-balance user)))
            (asserts! (>= current-balance amount) err-insufficient-balance)
            (map-set user-vault-balances user (- current-balance amount))
            (var-set total-vault-balance (- (var-get total-vault-balance) amount))
            (ok amount)
        )
    )
)

;; Emergency withdraw by authorized contract
(define-public (authorized-withdraw (recipient principal) (amount uint))
    (begin
        (asserts! (is-authorized contract-caller) err-not-authorized)
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (<= amount (var-get total-vault-balance)) err-insufficient-balance)
        
        (try! (as-contract (stx-transfer? amount tx-sender recipient)))
        (ok amount)
    )
)
