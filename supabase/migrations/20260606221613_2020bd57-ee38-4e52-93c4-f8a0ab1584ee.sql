
-- BN Benefits Test Pack seed v4 (posting_status='PEN').

DO $$
BEGIN
  DELETE FROM public.ip_wages    WHERE ssn BETWEEN '900001' AND '900099';
  DELETE FROM public.ip_employer WHERE ssn BETWEEN '900001' AND '900099';
  DELETE FROM public.external_user_person_link WHERE ssn BETWEEN '900001' AND '900099';
  DELETE FROM public.ip_master   WHERE ssn BETWEEN '900001' AND '900099';
  DELETE FROM public.er_master   WHERE regno = 'S00001';
END $$;

INSERT INTO public.er_master (regno, name, trade_name, status, email, mobile, registration_date, entered_by)
VALUES ('S00001', 'SEED-TEST Employer Ltd', 'SEED Test Trading', 'A',
        'employer@mishainfotech.com', '8694440001', now(), 'SEED');

INSERT INTO public.ip_master (ssn, firstname, surname, sex, dob, status, email_addr, mobile, entered_by) VALUES
 ('900001','SickTest','Tester','M',  (CURRENT_DATE - INTERVAL '32 years')::date,'V','sickness@mishainfotech.com',   '8694440011','SEED'),
 ('900002','MatTest','Tester','F',   (CURRENT_DATE - INTERVAL '29 years')::date,'V','maternity@mishainfotech.com',  '8694440012','SEED'),
 ('900003','InjTest','Tester','M',   (CURRENT_DATE - INTERVAL '35 years')::date,'V','injury@mishainfotech.com',     '8694440013','SEED'),
 ('900004','DisabTest','Tester','M', (CURRENT_DATE - INTERVAL '40 years')::date,'V','disablement@mishainfotech.com','8694440014','SEED'),
 ('900005','EIMedTest','Tester','M', (CURRENT_DATE - INTERVAL '38 years')::date,'V','eimedical@mishainfotech.com',  '8694440015','SEED'),
 ('900006','EIDthApp','Tester','F',  (CURRENT_DATE - INTERVAL '36 years')::date,'V','eideath@mishainfotech.com',    '8694440016','SEED'),
 ('900007','FunApp','Tester','F',    (CURRENT_DATE - INTERVAL '45 years')::date,'V','funeral@mishainfotech.com',    '8694440017','SEED'),
 ('900008','InvTest','Tester','M',   (CURRENT_DATE - INTERVAL '47 years')::date,'V','invalidity@mishainfotech.com', '8694440018','SEED'),
 ('900009','AgePen','Tester','M',    (CURRENT_DATE - INTERVAL '64 years')::date,'V','agepension@mishainfotech.com', '8694440019','SEED'),
 ('900010','AgeGrant','Tester','F',  (CURRENT_DATE - INTERVAL '64 years')::date,'V','agegrant@mishainfotech.com',   '8694440020','SEED'),
 ('900011','SurvApp','Tester','F',   (CURRENT_DATE - INTERVAL '50 years')::date,'V','survivor@mishainfotech.com',   '8694440021','SEED'),
 ('900012','NCPTest','Tester','F',   (CURRENT_DATE - INTERVAL '66 years')::date,'V','ncp@mishainfotech.com',        '8694440022','SEED'),
 ('900013','LifeCert','Tester','M',  (CURRENT_DATE - INTERVAL '70 years')::date,'V','lifecert@mishainfotech.com',   '8694440023','SEED'),
 ('900014','SchCert','Tester','F',   (CURRENT_DATE - INTERVAL '42 years')::date,'V','schoolcert@mishainfotech.com', '8694440024','SEED'),
 ('900015','EFTUpd','Tester','M',    (CURRENT_DATE - INTERVAL '63 years')::date,'V','eftupdate@mishainfotech.com',  '8694440025','SEED'),
 ('900051','DecEI','Worker','M',     (CURRENT_DATE - INTERVAL '44 years')::date,'D',NULL,NULL,'SEED'),
 ('900052','DecFun','Contrib','M',   (CURRENT_DATE - INTERVAL '58 years')::date,'D',NULL,NULL,'SEED'),
 ('900053','DecSurv','Insured','M',  (CURRENT_DATE - INTERVAL '55 years')::date,'D',NULL,NULL,'SEED');

INSERT INTO public.ip_employer (ssn, employer_id)
SELECT ssn, 'S00001' FROM public.ip_master
WHERE ssn BETWEEN '900001' AND '900053' AND ssn NOT IN ('900012','900013');

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT m.ssn,'S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-(g.n||' months')::interval)::date,'M',300,300,15,15,'PEN',true,'SEED'
FROM (VALUES ('900001'),('900002'),('900003'),('900004'),('900005'),('900007')) m(ssn) CROSS JOIN generate_series(1,30) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900008','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-(g.n||' months')::interval)::date,'M',350,350,17.50,17.50,'PEN',true,'SEED'
FROM generate_series(1,160) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900009','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-((g.n+12)||' months')::interval)::date,'M',400,400,20,20,'PEN',true,'SEED'
FROM generate_series(1,500) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900010','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-((g.n+24)||' months')::interval)::date,'M',300,300,15,15,'PEN',true,'SEED'
FROM generate_series(1,100) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT m.ssn,'S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-((g.n+12)||' months')::interval)::date,'M',350,350,17.50,17.50,'PEN',true,'SEED'
FROM (VALUES ('900013'),('900014'),('900015')) m(ssn) CROSS JOIN generate_series(1,180) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900006','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-(g.n||' months')::interval)::date,'M',280,280,14,14,'PEN',true,'SEED'
FROM generate_series(1,24) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900011','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-(g.n||' months')::interval)::date,'M',280,280,14,14,'PEN',true,'SEED'
FROM generate_series(1,36) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900051','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-((g.n+3)||' months')::interval)::date,'M',320,320,16,16,'PEN',true,'SEED'
FROM generate_series(1,60) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900052','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-((g.n+6)||' months')::interval)::date,'M',350,350,17.50,17.50,'PEN',true,'SEED'
FROM generate_series(1,200) g(n);

INSERT INTO public.ip_wages (ssn, payer_id, payer_type, sequence_no, period, pay_period,
  wages_paid1, total_wages, ip_ss_amt, er_ss_amt, posting_status, is_verified, entered_by)
SELECT '900053','S00001','ER',g.n,(date_trunc('month',CURRENT_DATE)-((g.n+6)||' months')::interval)::date,'M',360,360,18,18,'PEN',true,'SEED'
FROM generate_series(1,180) g(n);
