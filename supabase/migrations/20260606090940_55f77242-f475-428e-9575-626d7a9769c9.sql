
ALTER TABLE public.bn_comm_mapping ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20);
UPDATE public.bn_comm_mapping SET delivery_method = channel WHERE delivery_method IS NULL AND channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bn_comm_mapping_delivery_method ON public.bn_comm_mapping(delivery_method);

ALTER TABLE public.bn_communication_log ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20);
UPDATE public.bn_communication_log SET delivery_method = channel WHERE delivery_method IS NULL AND channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bn_communication_log_delivery_method ON public.bn_communication_log(delivery_method);
