
ALTER TABLE cn_receipt DISABLE TRIGGER trg_enforce_receipt_cancel;

UPDATE cn_receipt 
SET status = 'C', 
    cancel_reason = 'Void: C3 wrong amounts', 
    cancel_date = NOW(), 
    cancel_user = 'SYSTEM-VOID'
WHERE receipt_id IN (14, 15, 16, 17, 18);

ALTER TABLE cn_receipt ENABLE TRIGGER trg_enforce_receipt_cancel;

UPDATE cn_payment_header 
SET status = 'X'
WHERE payment_id IN (19, 20, 21, 22, 23);
