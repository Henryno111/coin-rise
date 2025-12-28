;; CoinRise Governance Contract
;; Platform governance, parameters, and admin controls

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u400))
(define-constant err-not-authorized (err u401))
(define-constant err-invalid-parameter (err u402))
(define-constant err-proposal-exists (err u403))
(define-constant err-proposal-not-found (err u404))
(define-constant err-already-voted (err u405))
(define-constant err-voting-ended (err u406))
(define-constant err-insufficient-stake (err u407))

;; Minimum stake required to create proposal (1 STX)
(define-constant min-proposal-stake u1000000)

;; Voting period (in blocks, ~7 days)
(define-constant voting-period u10080)

;; Data Variables
(define-data-var platform-fee-rate uint u100)  ;; 1% in basis points
(define-data-var min-stake-required uint u100000)  ;; 0.1 STX
(define-data-var max-stake-allowed uint u100000000000)  ;; 100,000 STX
(define-data-var governance-active bool true)
(define-data-var proposal-count uint u0)

;; Admin roles
(define-map admins principal bool)

;; Platform statistics
(define-map platform-stats
    {stat-type: (string-ascii 20)}
    {value: uint, last-updated: uint}
)

;; Governance proposals
(define-map proposals
    uint  ;; proposal-id
    {
        proposer: principal,
        title: (string-utf8 100),
        description: (string-utf8 500),
        parameter: (string-ascii 30),
        new-value: uint,
        votes-for: uint,
        votes-against: uint,
        start-block: uint,
        end-block: uint,
        executed: bool,
        passed: bool
    }
)

;; Track votes
(define-map proposal-votes
    {proposal-id: uint, voter: principal}
    {vote: bool, weight: uint}
)

;; Read-only functions
(define-read-only (get-platform-fee-rate)
    (var-get platform-fee-rate)
)

(define-read-only (get-min-stake-required)
    (var-get min-stake-required)
)

(define-read-only (get-max-stake-allowed)
    (var-get max-stake-allowed)
)

(define-read-only (is-governance-active)
    (var-get governance-active)
)

(define-read-only (is-admin (user principal))
    (default-to false (map-get? admins user))
)

(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals proposal-id)
)

(define-read-only (get-proposal-count)
    (var-get proposal-count)
)

(define-read-only (get-user-vote (proposal-id uint) (voter principal))
    (map-get? proposal-votes {proposal-id: proposal-id, voter: voter})
)

(define-read-only (get-platform-stat (stat-type (string-ascii 20)))
    (map-get? platform-stats {stat-type: stat-type})
)

;; Calculate if proposal has passed
(define-read-only (has-proposal-passed (proposal-id uint))
    (match (map-get? proposals proposal-id)
        proposal
            (let
                (
                    (total-votes (+ (get votes-for proposal) (get votes-against proposal)))
                    (approval-rate (if (> total-votes u0)
                        (/ (* (get votes-for proposal) u100) total-votes)
                        u0
                    ))
                )
                ;; Requires > 50% approval
                (ok (> approval-rate u50))
            )
        (err err-proposal-not-found)
    )
)

;; Administrative functions
(define-public (add-admin (new-admin principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (map-set admins new-admin true))
    )
)

(define-public (remove-admin (admin principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (map-delete admins admin))
    )
)

(define-public (set-governance-active (active bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (ok (var-set governance-active active))
    )
)

;; Platform parameter management (admin only)
(define-public (set-platform-fee-rate (new-rate uint))
    (begin
        (asserts! (or (is-eq tx-sender contract-owner) (is-admin tx-sender)) err-not-authorized)
        (asserts! (<= new-rate u1000) err-invalid-parameter)  ;; Max 10%
        (ok (var-set platform-fee-rate new-rate))
    )
)

(define-public (set-min-stake-required (new-min uint))
    (begin
        (asserts! (or (is-eq tx-sender contract-owner) (is-admin tx-sender)) err-not-authorized)
        (asserts! (> new-min u0) err-invalid-parameter)
        (ok (var-set min-stake-required new-min))
    )
)

(define-public (set-max-stake-allowed (new-max uint))
    (begin
        (asserts! (or (is-eq tx-sender contract-owner) (is-admin tx-sender)) err-not-authorized)
        (asserts! (> new-max (var-get min-stake-required)) err-invalid-parameter)
        (ok (var-set max-stake-allowed new-max))
    )
)

;; Platform statistics tracking
(define-public (update-platform-stat (stat-type (string-ascii 20)) (value uint))
    (begin
        (asserts! (or (is-eq tx-sender contract-owner) (is-admin tx-sender)) err-not-authorized)
        (ok (map-set platform-stats {stat-type: stat-type} {
            value: value,
            last-updated: block-height
        }))
    )
)

;; Governance proposal functions
(define-public (create-proposal 
    (title (string-utf8 100))
    (description (string-utf8 500))
    (parameter (string-ascii 30))
    (new-value uint))
    (let
        (
            (proposer tx-sender)
            (user-stake (contract-call? .coinrise-core get-user-stake-amount proposer))
            (proposal-id (+ (var-get proposal-count) u1))
        )
        (asserts! (var-get governance-active) err-not-authorized)
        (asserts! (>= user-stake min-proposal-stake) err-insufficient-stake)
        
        ;; Create proposal
        (map-set proposals proposal-id {
            proposer: proposer,
            title: title,
            description: description,
            parameter: parameter,
            new-value: new-value,
            votes-for: u0,
            votes-against: u0,
            start-block: block-height,
            end-block: (+ block-height voting-period),
            executed: false,
            passed: false
        })
        
        (var-set proposal-count proposal-id)
        (ok proposal-id)
    )
)

(define-public (vote-on-proposal (proposal-id uint) (vote-for bool))
    (let
        (
            (voter tx-sender)
            (proposal (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
            (user-stake (contract-call? .coinrise-core get-user-stake-amount voter))
            (existing-vote (map-get? proposal-votes {proposal-id: proposal-id, voter: voter}))
        )
        (asserts! (var-get governance-active) err-not-authorized)
        (asserts! (is-none existing-vote) err-already-voted)
        (asserts! (< block-height (get end-block proposal)) err-voting-ended)
        (asserts! (> user-stake u0) err-insufficient-stake)
        
        ;; Record vote
        (map-set proposal-votes {proposal-id: proposal-id, voter: voter} {
            vote: vote-for,
            weight: user-stake
        })
        
        ;; Update proposal vote counts
        (map-set proposals proposal-id (merge proposal {
            votes-for: (if vote-for 
                (+ (get votes-for proposal) user-stake)
                (get votes-for proposal)
            ),
            votes-against: (if vote-for
                (get votes-against proposal)
                (+ (get votes-against proposal) user-stake)
            )
        }))
        
        (ok true)
    )
)

(define-public (execute-proposal (proposal-id uint))
    (let
        (
            (proposal (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
            (passed (unwrap! (has-proposal-passed proposal-id) err-proposal-not-found))
        )
        (asserts! (or (is-eq tx-sender contract-owner) (is-admin tx-sender)) err-not-authorized)
        (asserts! (>= block-height (get end-block proposal)) err-voting-ended)
        (asserts! (not (get executed proposal)) err-already-voted)
        (asserts! passed err-not-authorized)
        
        ;; Mark as executed
        (map-set proposals proposal-id (merge proposal {
            executed: true,
            passed: passed
        }))
        
        ;; Execute based on parameter (simplified - would need expansion)
        (let ((param (get parameter proposal)))
            (if (is-eq param "platform-fee-rate")
                (set-platform-fee-rate (get new-value proposal))
                (if (is-eq param "min-stake-required")
                    (set-min-stake-required (get new-value proposal))
                    (ok true)
                )
            )
        )
    )
)

;; Emergency functions
(define-public (emergency-shutdown)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set governance-active false)
        (ok true)
    )
)

(define-public (emergency-resume)
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set governance-active true)
        (ok true)
    )
)
