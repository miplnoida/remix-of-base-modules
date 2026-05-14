
-- ============================================================
-- DROP broken legacy function with wrong field names
-- (uses amount_due/amount_paid instead of amount/paid_amount,
--  and mixed-case statuses like 'Active', 'Pending')
-- ============================================================
DROP FUNCTION IF EXISTS public.ce_breach_check_arrangements(text, text);

-- ============================================================
-- BREACH EVALUATION FUNCTION
--
-- Scans ACTIVE arrangements, detects overdue installments,
-- creates breach records, transitions to DEFAULTED when
-- threshold is exceeded, and cascades to case/notice/audit.
--
-- Uses canonical UPPERCASE statuses throughout.
-- Uses correct ce_installments fields: amount, paid_amount.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ce_evaluate_arrangement_breaches(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_grace_days INT DEFAULT 5,
  p_actor VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_arr RECORD;
  v_inst RECORD;
  v_missed INT;
  v_overdue_total NUMERIC;
  v_breach_created INT := 0;
  v_defaulted INT := 0;
  v_installments_flagged INT := 0;
  v_arrangements_scanned INT := 0;
  v_existing_breach BOOLEAN;
  v_case RECORD;
  v_notice_num VARCHAR;
BEGIN
  -- ── Phase 1: Flag overdue installments ────────────────────
  -- Update any PENDING or PARTIAL installment past due + grace
  UPDATE ce_installments i
  SET
    status = 'OVERDUE',
    is_overdue = true,
    overdue_days = (p_as_of_date - i.due_date)
  FROM ce_payment_arrangements pa
  WHERE i.arrangement_id = pa.id
    AND pa.status = 'ACTIVE'
    AND i.status IN ('PENDING', 'PARTIAL')
    AND i.due_date < (p_as_of_date - p_grace_days)
    AND i.is_overdue = false;

  GET DIAGNOSTICS v_installments_flagged = ROW_COUNT;

  -- ── Phase 2: Evaluate each ACTIVE arrangement ────────────
  FOR v_arr IN
    SELECT pa.*
    FROM ce_payment_arrangements pa
    WHERE pa.status = 'ACTIVE'
  LOOP
    v_arrangements_scanned := v_arrangements_scanned + 1;

    -- Count missed (overdue) installments for this arrangement
    SELECT
      COUNT(*),
      COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)), 0)
    INTO v_missed, v_overdue_total
    FROM ce_installments i
    WHERE i.arrangement_id = v_arr.id
      AND i.status = 'OVERDUE';

    -- Update arrangement missed_payments
    UPDATE ce_payment_arrangements
    SET
      missed_payments = v_missed,
      updated_by = p_actor,
      updated_at = now()
    WHERE id = v_arr.id
      AND missed_payments IS DISTINCT FROM v_missed;

    -- ── Breach detection ──────────────────────────────────
    -- Only create breach if missed >= max threshold AND no unresolved breach exists
    IF v_missed >= COALESCE(v_arr.max_missed_before_breach, 2) THEN

      SELECT EXISTS (
        SELECT 1 FROM ce_arrangement_breaches ab
        WHERE ab.arrangement_id = v_arr.id
          AND (ab.resolution IS NULL OR ab.resolution = '')
      ) INTO v_existing_breach;

      IF NOT v_existing_breach THEN
        -- Create breach record
        INSERT INTO ce_arrangement_breaches (
          arrangement_id, breach_type, description,
          detected_at, detected_by, created_by
        ) VALUES (
          v_arr.id,
          CASE
            WHEN v_missed >= COALESCE(v_arr.max_missed_before_breach, 2) + 2 THEN 'CRITICAL'
            WHEN v_missed >= COALESCE(v_arr.max_missed_before_breach, 2) + 1 THEN 'MAJOR'
            ELSE 'STANDARD'
          END,
          format('%s overdue installment(s) totaling $%s. Threshold: %s.',
                 v_missed, TRIM(to_char(v_overdue_total, '999,999,990.00')),
                 v_arr.max_missed_before_breach),
          now(), p_actor, p_actor
        );

        -- Flag arrangement as breached
        UPDATE ce_payment_arrangements
        SET
          breach_detected = true,
          breach_date = p_as_of_date,
          breach_reason = format('Missed %s installments (threshold: %s)',
                                v_missed, v_arr.max_missed_before_breach),
          updated_by = p_actor,
          updated_at = now()
        WHERE id = v_arr.id;

        v_breach_created := v_breach_created + 1;

        -- Audit the breach detection
        INSERT INTO ce_audit_log (
          entity_type, entity_id, action, description,
          new_values, performed_by, performed_at
        ) VALUES (
          'ARRANGEMENT', v_arr.id, 'BREACH_DETECTED',
          format('Breach detected on arrangement %s: %s missed installments',
                 v_arr.arrangement_number, v_missed),
          jsonb_build_object('missed_payments', v_missed, 'overdue_total', v_overdue_total),
          p_actor, now()
        );
      END IF;

      -- ── DEFAULTED transition ───────────────────────────
      -- Default if missed exceeds threshold by 1+ (breach unresolved)
      IF v_missed > COALESCE(v_arr.max_missed_before_breach, 2)
         AND v_arr.status != 'DEFAULTED' THEN

        UPDATE ce_payment_arrangements
        SET
          status = 'DEFAULTED',
          breach_reason = COALESCE(breach_reason, '') ||
            format(' | Defaulted on %s: %s missed payments exceed threshold.',
                   p_as_of_date, v_missed),
          updated_by = p_actor,
          updated_at = now()
        WHERE id = v_arr.id;

        v_defaulted := v_defaulted + 1;

        -- Audit the default
        INSERT INTO ce_audit_log (
          entity_type, entity_id, action, description,
          old_values, new_values, performed_by, performed_at
        ) VALUES (
          'ARRANGEMENT', v_arr.id, 'STATUS_CHANGE',
          format('Arrangement %s defaulted: %s missed payments',
                 v_arr.arrangement_number, v_missed),
          jsonb_build_object('status', 'ACTIVE'),
          jsonb_build_object('status', 'DEFAULTED', 'missed_payments', v_missed),
          p_actor, now()
        );

        -- ── Cascade to linked case ──────────────────────
        IF v_arr.case_id IS NOT NULL THEN
          SELECT * INTO v_case
          FROM ce_cases
          WHERE id = v_arr.case_id
            AND COALESCE(is_deleted, false) = false;

          IF v_case IS NOT NULL AND v_case.status NOT IN ('CLOSED', 'ESCALATED') THEN
            UPDATE ce_cases
            SET
              status = 'ESCALATED',
              updated_by = p_actor,
              updated_at = now()
            WHERE id = v_case.id;

            INSERT INTO ce_case_history (
              case_id, action, from_status, to_status,
              notes, performed_by, performed_at
            ) VALUES (
              v_case.id, 'ARRANGEMENT_DEFAULTED', v_case.status, 'ESCALATED',
              format('Auto-escalated: arrangement %s defaulted with %s missed payments',
                     v_arr.arrangement_number, v_missed),
              p_actor, now()
            );
          END IF;

          -- ── Create default notice ──────────────────────
          v_notice_num := 'NTC-DEF-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8);

          INSERT INTO ce_notices (
            notice_number, employer_id, employer_name,
            case_id, notice_type, status,
            subject, body, delivery_method,
            created_by, created_at
          ) VALUES (
            v_notice_num, v_arr.employer_id, v_arr.employer_name,
            v_arr.case_id, 'ARRANGEMENT_DEFAULT', 'DRAFT',
            format('Payment Arrangement %s — Default Notice', v_arr.arrangement_number),
            format('Arrangement %s has been defaulted due to %s consecutive missed payments. '
                   || 'Outstanding balance: $%s. Immediate action is required.',
                   v_arr.arrangement_number, v_missed,
                   TRIM(to_char(v_overdue_total, '999,999,990.00'))),
            'EMAIL',
            p_actor, now()
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'as_of_date', p_as_of_date,
    'grace_days', p_grace_days,
    'arrangements_scanned', v_arrangements_scanned,
    'installments_flagged_overdue', v_installments_flagged,
    'breaches_created', v_breach_created,
    'arrangements_defaulted', v_defaulted
  );
END;
$$;

-- ============================================================
-- CURE RECALCULATION
--
-- After a payment is reconciled and installments are updated,
-- this function rechecks breach state. If overdue installments
-- are now paid/partial, it can clear breach_detected and
-- reduce missed_payments. Called by reconciliation flow.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ce_recalculate_breach_state(
  p_arrangement_id UUID,
  p_actor VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missed INT;
  v_arr RECORD;
  v_was_breached BOOLEAN;
  v_unresolved INT;
BEGIN
  SELECT * INTO v_arr
  FROM ce_payment_arrangements
  WHERE id = p_arrangement_id;

  IF v_arr IS NULL THEN
    RETURN jsonb_build_object('error', 'Arrangement not found');
  END IF;

  v_was_breached := COALESCE(v_arr.breach_detected, false);

  -- Recount overdue installments
  SELECT COUNT(*) INTO v_missed
  FROM ce_installments
  WHERE arrangement_id = p_arrangement_id
    AND status = 'OVERDUE';

  -- Update arrangement missed count
  UPDATE ce_payment_arrangements
  SET
    missed_payments = v_missed,
    updated_by = p_actor,
    updated_at = now()
  WHERE id = p_arrangement_id;

  -- Count unresolved breaches
  SELECT COUNT(*) INTO v_unresolved
  FROM ce_arrangement_breaches
  WHERE arrangement_id = p_arrangement_id
    AND (resolution IS NULL OR resolution = '');

  -- If no more overdue AND no unresolved breaches, clear breach flag
  IF v_missed = 0 AND v_unresolved = 0 AND v_was_breached THEN
    UPDATE ce_payment_arrangements
    SET
      breach_detected = false,
      updated_by = p_actor,
      updated_at = now()
    WHERE id = p_arrangement_id;

    INSERT INTO ce_audit_log (
      entity_type, entity_id, action, description,
      old_values, new_values, performed_by, performed_at
    ) VALUES (
      'ARRANGEMENT', p_arrangement_id, 'BREACH_CURED',
      'All overdue installments resolved; breach flag cleared',
      jsonb_build_object('breach_detected', true, 'missed_payments', v_arr.missed_payments),
      jsonb_build_object('breach_detected', false, 'missed_payments', 0),
      p_actor, now()
    );
  END IF;

  RETURN jsonb_build_object(
    'arrangement_id', p_arrangement_id,
    'previous_missed', v_arr.missed_payments,
    'current_missed', v_missed,
    'was_breached', v_was_breached,
    'is_breached', (v_missed > 0 OR v_unresolved > 0),
    'unresolved_breaches', v_unresolved
  );
END;
$$;
