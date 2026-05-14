
ALTER TABLE public.bn_claim
  ADD CONSTRAINT bn_claim_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.bn_product(id);
