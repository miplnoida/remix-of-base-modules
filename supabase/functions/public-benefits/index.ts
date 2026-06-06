// deno-lint-ignore-file no-explicit-any
/**
 * public-benefits — Public API surface for the external BN Portals
 * (Claimant, Employer, Doctor / Medical Provider).
 *
 * Internal BN remains the source of truth. This function never re-implements
 * eligibility / calculation / decision / payment / letters; it only reads
 * configuration that already lives in the Internal BN tables and accepts
 * task / application submissions back from portal users.
 *
 * Auth:
 *  - Authorization: Bearer <session jwt>           (portal-signed-in user)
 *  - X-Task-Token:  <one-time secure task token>   (single task submission)
 *
 * Routes (prefix /public-benefits):
 *   GET  /benefits/products
 *   GET  /benefits/products/:productCode/form-definition?portalRole=...
 *   POST /benefits/applications
 *   GET  /claims/:claimNumber/status
 *   GET  /tasks
 *   GET  /tasks/:taskId
 *   POST /tasks/:taskId/submit
 *   POST /documents/upload
 *   GET  /messages
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-task-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const err = (status: number, code: string, message: string) =>
  json({ error: { code, message } }, status);

// Internal-only client (service role) — bypasses RLS, used after we've
// validated the caller's identity & scope ourselves.
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

type PortalRole = 'CLAIMANT' | 'EMPLOYER' | 'DOCTOR';

interface Caller {
  mode: 'session' | 'token';
  role: PortalRole | null;
  userCode: string;            // for audit
  email?: string | null;
  ssn?: string | null;         // claimant identity
  employerRegno?: string | null; // employer identity
  providerCode?: string | null;  // doctor identity
  taskId?: string | null;      // when mode = token
  participantId?: string | null;
}

/** Resolve caller from JWT session or one-time task token. */
async function resolveCaller(req: Request): Promise<Caller | Response> {
  const taskToken = req.headers.get('x-task-token');
  if (taskToken) {
    const hash = await sha256(taskToken);
    const { data: task } = await admin
      .from('bn_external_task')
      .select('id, participant_id, participant_kind, status, secure_token_expires_at, secure_token_used_at')
      .eq('secure_token_hash', hash)
      .maybeSingle();
    if (!task) return err(401, 'invalid_token', 'Task token is not valid');
    if (task.secure_token_expires_at && new Date(task.secure_token_expires_at) < new Date()) {
      return err(401, 'token_expired', 'Task token has expired');
    }
    if (task.status === 'ACCEPTED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') {
      return err(409, 'task_closed', 'Task is no longer open');
    }
    let participant: any = null;
    if (task.participant_id) {
      const { data } = await admin
        .from('bn_claim_participant')
        .select('ssn, employer_regno, provider_code, email, display_name')
        .eq('id', task.participant_id)
        .maybeSingle();
      participant = data;
    }
    return {
      mode: 'token',
      role: (task.participant_kind as PortalRole) ?? null,
      userCode: participant?.display_name ?? `TASK:${task.id}`,
      email: participant?.email ?? null,
      ssn: participant?.ssn ?? null,
      employerRegno: participant?.employer_regno ?? null,
      providerCode: participant?.provider_code ?? null,
      taskId: task.id,
      participantId: task.participant_id,
    };
  }

  const authz = req.headers.get('authorization');
  if (!authz?.startsWith('Bearer ')) return err(401, 'unauthorized', 'Missing credentials');
  const jwt = authz.slice(7);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authz } } },
  );
  const { data, error } = await supabase.auth.getClaims(jwt);
  if (error || !data?.claims) return err(401, 'unauthorized', 'Invalid session');
  const claims: any = data.claims;
  const meta = claims.user_metadata ?? {};
  const role = (meta.portal_role as PortalRole) ?? null;
  return {
    mode: 'session',
    role,
    userCode: meta.user_code ?? claims.email ?? claims.sub,
    email: claims.email ?? null,
    ssn: meta.ssn ?? null,
    employerRegno: meta.employer_regno ?? null,
    providerCode: meta.provider_code ?? null,
  };
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function audit(taskId: string | null, claimId: string | null, eventType: string, actor: Caller, details: any = {}) {
  if (taskId && claimId) {
    await admin.from('bn_external_task_audit').insert({
      task_id: taskId,
      claim_id: claimId,
      event_type: eventType,
      actor_kind: actor.role,
      actor_code: actor.userCode,
      details,
    });
  }
  await admin.from('system_audit_trail').insert({
    module: 'BN_EXTERNAL_PORTAL',
    action: eventType,
    actor_code: actor.userCode,
    entity_type: taskId ? 'bn_external_task' : 'bn_claim',
    entity_id: taskId ?? claimId,
    details,
  }).then(() => {}, () => {}); // fire-and-forget
}

// ─── Form definition (delegates to bn_screen_template + bn_field_metadata) ──
async function getFormDefinition(productCode: string, portalRole: PortalRole) {
  const { data: product } = await admin
    .from('bn_product')
    .select('id, benefit_code, benefit_name, category, payment_type, status, country_code')
    .eq('benefit_code', productCode)
    .maybeSingle();
  if (!product) return null;

  const { data: versions } = await admin
    .from('bn_product_version')
    .select('id, version_number, status, screen_template_id, workflow_template_id, effective_from, effective_to, requires_employer_verification, requires_medical_board_review')
    .eq('product_id', product.id)
    .eq('status', 'ACTIVE')
    .order('version_number', { ascending: false })
    .limit(1);
  const version = versions?.[0];
  if (!version) return null;

  let sections: any[] = [];
  let fields: any[] = [];
  if (version.screen_template_id) {
    const { data: tpl } = await admin.from('bn_screen_template').select('sections, layout_type, template_name').eq('id', version.screen_template_id).maybeSingle();
    sections = Array.isArray(tpl?.sections) ? tpl!.sections : [];
    const { data: meta } = await admin
      .from('bn_field_metadata')
      .select('*')
      .eq('screen_template_id', version.screen_template_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    fields = meta ?? [];
  }

  // Filter by portalRole. We use a simple mapping that lines up with the
  // builder's visible_for_channels values + an explicit participant_roles
  // override stored in validation_rules.
  const channelForRole: Record<PortalRole, string> = {
    CLAIMANT: 'PUBLIC_ONLINE',
    EMPLOYER: 'EMPLOYER_PORTAL',
    DOCTOR: 'DOCTOR_PORTAL',
  };
  const channel = channelForRole[portalRole];
  const fieldVisible = (f: any) => {
    const roles: string[] | undefined = f.validation_rules?.participant_roles;
    if (roles && roles.length) return roles.includes(portalRole);
    const channels: string[] | undefined = f.validation_rules?.visible_for_channels;
    if (channels && channels.length) return channels.includes(channel) || (portalRole === 'CLAIMANT' && channels.includes('PUBLIC_ONLINE'));
    return portalRole === 'CLAIMANT'; // safe default: only claimant sees unmarked fields
  };
  const filteredFields = fields.filter(fieldVisible);

  const { data: docs } = await admin
    .from('bn_doc_requirement')
    .select('id, document_type_code, description, requirement_level, public_visible, internal_visible, sort_order')
    .eq('product_version_id', version.id)
    .order('sort_order', { ascending: true });

  return {
    product: {
      productCode: product.benefit_code,
      productName: product.benefit_name,
      category: product.category,
      paymentType: product.payment_type,
      country: product.country_code,
    },
    version: {
      id: version.id,
      number: version.version_number,
      effectiveFrom: version.effective_from,
      effectiveTo: version.effective_to,
      requiresEmployerVerification: version.requires_employer_verification,
      requiresMedicalBoardReview: version.requires_medical_board_review,
    },
    portalRole,
    sections,
    fields: filteredFields,
    documents: (docs ?? []).filter(d => portalRole === 'CLAIMANT' ? d.public_visible !== false : true),
  };
}

// ─── Route handlers ─────────────────────────────────────────────────
async function handle(req: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/public-benefits/, '').replace(/\/$/, '') || '/';
  const method = req.method;

  // Public — list of products that allow public-online (claimant) intake.
  if (method === 'GET' && path === '/benefits/products') {
    // Only return products that have an ACTIVE version with an enabled ONLINE channel —
    // i.e. products that are actually openable from a public/external portal.
    const { data: channels } = await admin
      .from('bn_product_channel_config')
      .select('product_id, product_version_id, bn_product_version!inner(status)')
      .eq('channel_code', 'ONLINE')
      .eq('is_enabled', true)
      .eq('bn_product_version.status', 'ACTIVE');
    const productIds = Array.from(new Set((channels ?? []).map((c: any) => c.product_id)));
    if (productIds.length === 0) return json({ products: [] });
    const { data } = await admin
      .from('bn_product')
      .select('id, benefit_code, benefit_name, category, payment_type, country_code, status')
      .eq('status', 'ACTIVE')
      .in('id', productIds)
      .order('benefit_name');
    return json({ products: data ?? [] });
  }

  // Form definition — requires caller so we know which portal role to filter.
  const fd = path.match(/^\/benefits\/products\/([^/]+)\/form-definition$/);
  if (method === 'GET' && fd) {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    const portalRole = (url.searchParams.get('portalRole') as PortalRole) ?? caller.role ?? 'CLAIMANT';
    const def = await getFormDefinition(decodeURIComponent(fd[1]), portalRole);
    if (!def) return err(404, 'not_found', 'Product not found or has no active version');
    return json(def);
  }

  // Participant / public-form rules for the active version of a product.
  const ppc = path.match(/^\/benefits\/products\/([^/]+)\/participant-config$/);
  if (method === 'GET' && ppc) {
    const code = decodeURIComponent(ppc[1]);
    const { data: product } = await admin.from('bn_product')
      .select('id, benefit_code, benefit_name, category')
      .eq('benefit_code', code).maybeSingle();
    if (!product) return err(404, 'not_found', 'Product not found');
    const { data: versions } = await admin.from('bn_product_version')
      .select('id, version_number, status, screen_template_id')
      .eq('product_id', product.id).eq('status', 'ACTIVE')
      .order('version_number', { ascending: false }).limit(1);
    const version = versions?.[0];
    if (!version) return err(409, 'no_active_version', 'Product has no active version');
    const { data: config } = await admin.from('bn_product_participant_config')
      .select('*').eq('product_version_id', version.id).maybeSingle();
    const { data: docs } = await admin.from('bn_doc_requirement')
      .select('id, document_code, document_label, is_mandatory, applies_to_role, notes')
      .eq('product_version_id', version.id).order('document_label', { ascending: true });
    return json({ product, version, config: config ?? null, documents: docs ?? [] });
  }

  // Submit a new application — structured participant-aware payload.
  // Accepts both legacy { values } and new structured shape:
  //   { productCode, applicant, insuredPerson, deceasedInsuredPerson,
  //     beneficiaries[], payee, guardian, employer, doctorProvider,
  //     benefitFacts, documents[], declaration, claimDate }
  if (method === 'POST' && path === '/benefits/applications') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT') return err(403, 'forbidden', 'Only signed-in claimants can submit new applications');
    const body = await req.json().catch(() => ({}));
    const {
      productCode, claimDate, declaration, declarationAccepted,
      applicant, insuredPerson, deceasedInsuredPerson,
      beneficiaries, payee, guardian, employer, doctorProvider,
      benefitFacts, documents, values,
    } = body ?? {};
    if (!productCode) return err(400, 'invalid_body', 'productCode is required');

    const { data: product } = await admin.from('bn_product').select('id, benefit_code').eq('benefit_code', productCode).maybeSingle();
    if (!product) return err(404, 'not_found', 'Product not found');
    const { data: versions } = await admin.from('bn_product_version').select('id, screen_template_id').eq('product_id', product.id).eq('status', 'ACTIVE').order('version_number', { ascending: false }).limit(1);
    const version = versions?.[0];
    if (!version) return err(409, 'no_active_version', 'Product has no active version');

    // Load participant config so we can enforce minimums.
    const { data: cfg } = await admin.from('bn_product_participant_config')
      .select('*').eq('product_version_id', version.id).maybeSingle();
    if (cfg) {
      if (cfg.requires_deceased && !deceasedInsuredPerson?.ssn) {
        return err(400, 'missing_deceased', 'Deceased insured person details are required for this benefit');
      }
      if (cfg.requires_beneficiaries && !(Array.isArray(beneficiaries) && beneficiaries.length)) {
        return err(400, 'missing_beneficiaries', 'At least one beneficiary is required for this benefit');
      }
      if (cfg.applicant_must_equal_insured) {
        const aSsn = applicant?.ssn ?? caller.ssn;
        const iSsn = insuredPerson?.ssn ?? caller.ssn;
        if (aSsn && iSsn && aSsn !== iSsn) {
          return err(400, 'applicant_must_equal_insured', 'You can only apply for this benefit for yourself');
        }
      }
    }
    const accepted = !!(declarationAccepted ?? declaration?.accepted);
    if (!accepted) return err(400, 'declaration_required', 'You must accept the declaration to submit');

    const insuredSsn = insuredPerson?.ssn ?? deceasedInsuredPerson?.ssn ?? caller.ssn ?? values?.ssn ?? null;

    const claimNumber = `BN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1e4).toString().padStart(4, '0')}`;
    const { data: claim, error: claimErr } = await admin.from('bn_claim').insert({
      claim_number: claimNumber,
      ssn: insuredSsn,
      product_id: product.id,
      product_version_id: version.id,
      status: 'SUBMITTED',
      claim_date: claimDate ?? new Date().toISOString().slice(0, 10),
      submission_date: new Date().toISOString(),
      source: 'PUBLIC_PORTAL',
      channel_code: 'PUBLIC_ONLINE',
      submitted_via: 'CLAIMANT_PORTAL',
      screen_template_id: version.screen_template_id,
      declaration: accepted,
      entered_by: caller.userCode,
    }).select('id, claim_number').single();
    if (claimErr) return err(500, 'insert_failed', claimErr.message);

    const rawJson = values ?? {
      applicant, insuredPerson, deceasedInsuredPerson,
      beneficiaries, payee, guardian, employer, doctorProvider,
      benefitFacts, documents,
    };
    await admin.from('bn_claim_application').insert({
      claim_id: claim.id,
      product_id: product.id,
      product_version_id: version.id,
      application_channel: 'PUBLIC_ONLINE',
      submitted_by_type: 'CLAIMANT',
      submitted_by_user_id: caller.userCode,
      submitted_at: new Date().toISOString(),
      form_template_id: version.screen_template_id,
      declaration_accepted: accepted,
      raw_application_json: rawJson,
      entered_by: caller.userCode,
    });

    // Insert one participant row per non-empty role from the payload.
    const partRows: any[] = [];
    const pushPart = (role: string, src: any, opts: Partial<{ isPrimary: boolean; relationship: string }> = {}) => {
      if (!src) return;
      const ssn = src.ssn ?? null;
      const display = src.display_name ?? [src.first_name, src.last_name].filter(Boolean).join(' ') || src.name || null;
      if (!ssn && !display && !src.email && !src.employer_regno && !src.provider_code) return;
      partRows.push({
        claim_id: claim.id,
        kind: ['EMPLOYER', 'DOCTOR'].includes(role) ? role : (role === 'INSURED_PERSON' || role === 'DECEASED_INSURED_PERSON' ? 'CLAIMANT' : (role === 'APPLICANT' ? 'CLAIMANT' : 'OTHER')),
        participant_role: role,
        display_name: display,
        ssn,
        employer_regno: src.employer_regno ?? null,
        provider_code: src.provider_code ?? null,
        email: src.email ?? null,
        phone: src.phone ?? null,
        status: 'ACTIVE',
        relationship_to_insured: opts.relationship ?? src.relationship ?? null,
        is_primary_applicant: !!opts.isPrimary,
        payload: src,
        created_by: caller.userCode,
      });
    };

    pushPart('APPLICANT', applicant ?? { ssn: caller.ssn, email: caller.email, display_name: caller.userCode }, { isPrimary: true });
    pushPart('INSURED_PERSON', insuredPerson);
    pushPart('DECEASED_INSURED_PERSON', deceasedInsuredPerson);
    if (Array.isArray(beneficiaries)) {
      for (const b of beneficiaries) pushPart('BENEFICIARY', b, { relationship: b?.relationship });
    }
    pushPart('PAYEE', payee);
    pushPart('GUARDIAN', guardian);
    pushPart('EMPLOYER', employer);
    pushPart('DOCTOR', doctorProvider);

    if (partRows.length) {
      const { error: pErr } = await admin.from('bn_claim_participant').insert(partRows);
      if (pErr) console.error('participant insert failed', pErr);
    }

    // Materialise external tasks (best-effort)
    try { await admin.rpc('bn_materialize_external_tasks', { p_claim_id: claim.id }); } catch (e) { console.warn('materialize tasks skipped', e); }

    await audit(null, claim.id, 'CLAIM_SUBMITTED', caller, { productCode, claimNumber: claim.claim_number, roles: partRows.map(r => r.participant_role) });
    return json({ claimId: claim.id, claimNumber: claim.claim_number }, 201);
  }


  // Claim status — claimant-only own claims.
  const cs = path.match(/^\/claims\/([^/]+)\/status$/);
  if (method === 'GET' && cs) {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    const { data: claim } = await admin.from('bn_claim').select('id, claim_number, ssn, status, claim_date, submission_date, decision_date').eq('claim_number', decodeURIComponent(cs[1])).maybeSingle();
    if (!claim) return err(404, 'not_found', 'Claim not found');
    if (caller.role === 'CLAIMANT' && caller.ssn && claim.ssn !== caller.ssn) return err(403, 'forbidden', 'Not your claim');
    const { data: decision } = await admin.from('bn_claim_decision').select('*').eq('claim_id', claim.id).order('decision_date', { ascending: false }).limit(1);
    const { data: payments } = await admin.from('bn_payment_instruction').select('id, payment_date, gross_amount, status').eq('claim_id', claim.id).order('payment_date', { ascending: false }).limit(20);
    return json({ claim, decision: decision?.[0] ?? null, payments: payments ?? [] });
  }

  // Task list — scoped to caller identity.
  if (method === 'GET' && path === '/tasks') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.mode === 'token' && caller.taskId) {
      const { data } = await admin.from('bn_external_task').select('*').eq('id', caller.taskId);
      return json({ tasks: data ?? [] });
    }
    let q = admin.from('bn_external_task').select('*').neq('status', 'CANCELLED').order('due_at', { ascending: true });
    if (caller.role) q = q.eq('participant_kind', caller.role);
    if (caller.role === 'EMPLOYER' && caller.employerRegno) {
      const { data: ps } = await admin.from('bn_claim_participant').select('id').eq('kind', 'EMPLOYER').eq('employer_regno', caller.employerRegno);
      const ids = (ps ?? []).map(p => p.id);
      q = ids.length ? q.in('participant_id', ids) : q.eq('participant_id', '00000000-0000-0000-0000-000000000000');
    } else if (caller.role === 'DOCTOR' && caller.providerCode) {
      const { data: ps } = await admin.from('bn_claim_participant').select('id').eq('kind', 'DOCTOR').eq('provider_code', caller.providerCode);
      const ids = (ps ?? []).map(p => p.id);
      q = ids.length ? q.in('participant_id', ids) : q.eq('participant_id', '00000000-0000-0000-0000-000000000000');
    } else if (caller.role === 'CLAIMANT' && caller.ssn) {
      const { data: ps } = await admin.from('bn_claim_participant').select('id').eq('kind', 'CLAIMANT').eq('ssn', caller.ssn);
      const ids = (ps ?? []).map(p => p.id);
      q = ids.length ? q.in('participant_id', ids) : q.eq('participant_id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await q.limit(200);
    if (error) return err(500, 'query_failed', error.message);
    return json({ tasks: data ?? [] });
  }

  const tDetail = path.match(/^\/tasks\/([^/]+)$/);
  if (method === 'GET' && tDetail) {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    const { data: task } = await admin.from('bn_external_task').select('*').eq('id', tDetail[1]).maybeSingle();
    if (!task) return err(404, 'not_found', 'Task not found');
    if (caller.mode === 'token' && caller.taskId !== task.id) return err(403, 'forbidden', 'Token does not match task');
    if (caller.mode === 'session' && caller.role && task.participant_kind !== caller.role) return err(403, 'forbidden', 'Task not visible to this portal');
    let formDefinition: any = null;
    if (task.product_code) formDefinition = await getFormDefinition(task.product_code, task.participant_kind as PortalRole);
    const { data: docs } = await admin.from('bn_external_task_document').select('*').eq('task_id', task.id);
    return json({ task, formDefinition, documents: docs ?? [] });
  }

  const tSubmit = path.match(/^\/tasks\/([^/]+)\/submit$/);
  if (method === 'POST' && tSubmit) {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    const { data: task } = await admin.from('bn_external_task').select('*').eq('id', tSubmit[1]).maybeSingle();
    if (!task) return err(404, 'not_found', 'Task not found');
    if (caller.mode === 'token' && caller.taskId !== task.id) return err(403, 'forbidden', 'Token does not match task');
    if (caller.mode === 'session' && caller.role && task.participant_kind !== caller.role) return err(403, 'forbidden', 'Task not visible to this portal');
    if (task.status === 'ACCEPTED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') return err(409, 'task_closed', 'Task is no longer open');
    const body = await req.json().catch(() => ({}));
    const { values, notes } = body ?? {};
    const { error } = await admin.from('bn_external_task').update({
      status: 'SUBMITTED',
      payload: values ?? {},
      decision_notes: notes ?? null,
      submitted_at: new Date().toISOString(),
      submitted_by: caller.userCode,
      secure_token_used_at: caller.mode === 'token' ? new Date().toISOString() : task.secure_token_used_at,
    }).eq('id', task.id);
    if (error) return err(500, 'update_failed', error.message);

    // Mirror to bn_claim_event so the timeline picks it up
    await admin.from('bn_claim_event').insert({
      claim_id: task.claim_id,
      event_type: `EXTERNAL_TASK_SUBMITTED`,
      event_data: { task_id: task.id, task_type: task.task_type, participant_kind: task.participant_kind },
      created_by: caller.userCode,
    }).then(() => {}, () => {});
    await audit(task.id, task.claim_id, 'TASK_SUBMITTED', caller, { task_type: task.task_type });
    return json({ ok: true, status: 'SUBMITTED' });
  }

  // Document upload (multipart not supported here — accept base64 JSON for simplicity).
  if (method === 'POST' && path === '/documents/upload') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    const body = await req.json().catch(() => ({}));
    const { taskId, fileName, mimeType, base64, documentTypeCode } = body ?? {};
    if (!taskId || !fileName || !base64) return err(400, 'invalid_body', 'taskId, fileName, base64 required');
    const { data: task } = await admin.from('bn_external_task').select('id, claim_id, participant_kind').eq('id', taskId).maybeSingle();
    if (!task) return err(404, 'not_found', 'Task not found');
    if (caller.mode === 'token' && caller.taskId !== task.id) return err(403, 'forbidden', 'Token does not match task');
    if (caller.mode === 'session' && caller.role && task.participant_kind !== caller.role) return err(403, 'forbidden', 'Task not visible to this portal');
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const path = `${task.claim_id}/${task.id}/${Date.now()}-${fileName}`;
    const { error: upErr } = await admin.storage.from('bn-external-tasks').upload(path, bytes, { contentType: mimeType ?? 'application/octet-stream', upsert: false });
    if (upErr) return err(500, 'upload_failed', upErr.message);
    const { data: row } = await admin.from('bn_external_task_document').insert({
      task_id: task.id,
      claim_id: task.claim_id,
      document_type_code: documentTypeCode ?? null,
      storage_bucket: 'bn-external-tasks',
      storage_path: path,
      file_name: fileName,
      mime_type: mimeType ?? null,
      size_bytes: bytes.length,
      uploaded_by: caller.userCode,
    }).select('*').single();
    await audit(task.id, task.claim_id, 'TASK_DOCUMENT_UPLOADED', caller, { file_name: fileName, document_type_code: documentTypeCode });
    return json({ document: row });
  }

  // Messages — letters & comms visible to caller.
  if (method === 'GET' && path === '/messages') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    let q = admin.from('bn_communication_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (caller.role === 'CLAIMANT' && caller.ssn) q = q.eq('recipient_ssn', caller.ssn);
    else if (caller.role === 'EMPLOYER' && caller.employerRegno) q = q.eq('recipient_employer_regno', caller.employerRegno);
    else if (caller.role === 'DOCTOR' && caller.providerCode) q = q.eq('recipient_provider_code', caller.providerCode);
    const { data } = await q;
    return json({ messages: data ?? [] });
  }

  // ─── Claimant self-service (read-only views of Internal LAN data) ──
  if (method === 'GET' && path === '/me/profile') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT') return err(403, 'forbidden', 'Claimant only');
    if (!caller.ssn) return json({ profile: null });
    const { data } = await admin.from('ip_master').select('ssn, first_name, last_name, dob, gender, marital_status, mobile_phone, email').eq('ssn', caller.ssn).maybeSingle();
    await audit(null, null, 'PROFILE_VIEWED', caller);
    return json({ profile: data ?? null });
  }
  if (method === 'GET' && path === '/me/contributions') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT' || !caller.ssn) return json({ contributions: [] });
    const { data } = await admin.from('ip_wages_ann_sum').select('*').eq('ssn', caller.ssn).order('year_paid', { ascending: false }).limit(200);
    return json({ contributions: data ?? [] });
  }
  if (method === 'GET' && path === '/me/employment') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT' || !caller.ssn) return json({ employment: [] });
    const { data } = await admin.from('ip_employer').select('*').eq('ssn', caller.ssn).order('start_date', { ascending: false }).limit(100);
    return json({ employment: data ?? [] });
  }
  if (method === 'GET' && path === '/me/claims') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT' || !caller.ssn) return json({ claims: [] });
    const { data } = await admin.from('bn_claim').select('id, claim_number, status, claim_date, submission_date, decision_date, product_id').eq('ssn', caller.ssn).order('submission_date', { ascending: false }).limit(100);
    return json({ claims: data ?? [] });
  }
  if (method === 'GET' && path === '/me/awards') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT' || !caller.ssn) return json({ awards: [] });
    const { data } = await admin.from('bn_award').select('*').eq('ssn', caller.ssn).order('start_date', { ascending: false }).limit(50);
    return json({ awards: data ?? [] });
  }
  if (method === 'GET' && path === '/me/payments') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'CLAIMANT' || !caller.ssn) return json({ payments: [] });
    const { data: claims } = await admin.from('bn_claim').select('id').eq('ssn', caller.ssn);
    const ids = (claims ?? []).map(c => c.id);
    if (!ids.length) return json({ payments: [] });
    const { data } = await admin.from('bn_payment_instruction').select('id, payment_date, gross_amount, net_amount, status, claim_id').in('claim_id', ids).order('payment_date', { ascending: false }).limit(200);
    return json({ payments: data ?? [] });
  }

  // ─── Employer self-service ──────────────────────────────────────────
  if (method === 'GET' && path === '/employer/profile') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ employer: null });
    const { data } = await admin.from('er_master').select('regno, employer_name, address_line1, address_line2, city, country_code, email, phone, status').eq('regno', caller.employerRegno).maybeSingle();
    return json({ employer: data ?? null });
  }
  if (method === 'GET' && path === '/employer/employees') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ employees: [] });
    const { data } = await admin.from('ip_employer').select('ssn, regno, start_date, end_date, occup_code').eq('regno', caller.employerRegno).is('end_date', null).limit(500);
    return json({ employees: data ?? [] });
  }
  if (method === 'GET' && path === '/employer/c3') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ submissions: [] });
    const { data } = await admin.from('cn_c3_reported').select('*').eq('regno', caller.employerRegno).order('period_year', { ascending: false }).limit(100);
    return json({ submissions: data ?? [] });
  }
  if (method === 'GET' && path === '/employer/contributions') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ contributions: [] });
    const { data } = await admin.from('cn_payment').select('*').eq('regno', caller.employerRegno).order('payment_date', { ascending: false }).limit(100);
    return json({ contributions: data ?? [] });
  }
  if (method === 'GET' && path === '/employer/payments') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ payments: [] });
    const { data } = await admin.from('cn_receipt').select('*').eq('regno', caller.employerRegno).order('receipt_date', { ascending: false }).limit(100);
    return json({ payments: data ?? [] });
  }
  if (method === 'GET' && path === '/employer/balances') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ balances: [] });
    const { data } = await admin.from('cn_arrears').select('*').eq('regno', caller.employerRegno).limit(50);
    return json({ balances: data ?? [] });
  }
  if (method === 'GET' && path === '/employer/compliance') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'EMPLOYER' || !caller.employerRegno) return json({ notices: [] });
    const { data } = await admin.from('ce_notices').select('*').eq('employer_regno', caller.employerRegno).order('issued_at', { ascending: false }).limit(100);
    return json({ notices: data ?? [] });
  }

  // ─── Doctor / Medical Provider ──────────────────────────────────────
  if (method === 'GET' && path === '/doctor/profile') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'DOCTOR' || !caller.providerCode) return json({ provider: null });
    const { data } = await admin.from('bn_medical_facility').select('*').eq('facility_code', caller.providerCode).maybeSingle();
    return json({ provider: data ?? null });
  }
  if (method === 'GET' && path === '/doctor/reports') {
    const caller = await resolveCaller(req);
    if (caller instanceof Response) return caller;
    if (caller.role !== 'DOCTOR' || !caller.providerCode) return json({ reports: [] });
    const { data } = await admin.from('bn_medical_recommendation').select('*').eq('provider_code', caller.providerCode).order('created_at', { ascending: false }).limit(100);
    return json({ reports: data ?? [] });
  }

  return err(404, 'no_route', `No route for ${method} ${path}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const url = new URL(req.url);
    return await handle(req, url);
  } catch (e) {
    console.error('public-benefits error', e);
    return err(500, 'server_error', (e as Error).message);
  }
});
