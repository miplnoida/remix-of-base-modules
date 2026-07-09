
DELETE FROM public.communication_message
WHERE subject LIKE 'B8B t%' AND origin='comm_hub';

DELETE FROM public.communication_request
WHERE request_no LIKE 'B8B-T%';
