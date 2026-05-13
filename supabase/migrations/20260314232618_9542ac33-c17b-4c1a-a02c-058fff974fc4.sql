CREATE TABLE cn_batch (
    batch_number VARCHAR(25) PRIMARY KEY,
    batch_status VARCHAR(3),
    balance_status CHAR(1),
    entered_by VARCHAR(5),
    date_entered TIMESTAMP(3),
    verified_by VARCHAR(5),
    date_verified TIMESTAMP(3),
    posted_by VARCHAR(5),
    date_posted TIMESTAMP(3),
    offset_amount NUMERIC(10,2) DEFAULT 0.0,
    balance_forward NUMERIC(10,2) DEFAULT 0.0,
    office_code VARCHAR(3),
    batch_date TIMESTAMP(3)
);