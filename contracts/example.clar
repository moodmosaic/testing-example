(define-constant ERR_NOT_AUTHORIZED (err u200))

(define-map ValuesMap
    uint ;; block-height
    uint ;; value
)

(define-data-var isInitialized bool false)

(define-public (initialize)
    (begin
        (asserts! (not (var-get isInitialized)) ERR_NOT_AUTHORIZED)
        (ok (var-set isInitialized true))
    )
)

(define-read-only (get-value (bh uint))
    (map-get? ValuesMap bh)
)

(define-public (set-values (values (list 100 uint)))
    (begin
        (asserts! (var-get isInitialized) ERR_NOT_AUTHORIZED)
        (fold set-value values block-height)
        (ok true)
    )
)

(define-private (set-value (value uint) (bh uint))
    (begin
        (map-set ValuesMap bh (+ (default-to u0 (get-value bh)) value))
        (+ bh u1)
    )
)