
-- Tab overview articles
INSERT INTO public.kb_articles (module_key, submodule_key, screen_key, article_type, title, summary, content, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine', 'rule-engine-detection', 'screen_help', 
  'Detection Rules Overview',
  'How detection rules identify compliance violations automatically.',
  E'# Detection Rules\n\nDetection rules define the conditions under which a compliance violation is automatically identified.\n\n## Key Concepts\n- **Trigger Event**: The business event that causes the rule to evaluate\n- **Condition Expression**: Logical expression evaluated against contribution data\n- **Priority**: Higher priority rules are evaluated first\n- **Auto-Create Violation**: Creates violation records automatically\n\n## Best Practices\n- Start with high-priority rules for critical violations\n- Use specific conditions to avoid false positives\n- Test in disabled state before enabling',
  'all_users', ARRAY['detection','rules','triggers'], 'published', 1
WHERE NOT EXISTS (SELECT 1 FROM public.kb_articles WHERE module_key='compliance' AND screen_key='rule-engine-detection' AND article_type='screen_help');

INSERT INTO public.kb_articles (module_key, submodule_key, screen_key, article_type, title, summary, content, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine', 'rule-engine-calculation', 'screen_help',
  'Calculation Rules Overview',
  'How calculation rules compute penalties, interest, and surcharges.',
  E'# Calculation Rules\n\nCalculation rules define formulas for computing financial amounts.\n\n## Key Concepts\n- **Applies To**: The violation type this calculation targets\n- **Formula Expression**: Mathematical formula using variables\n- **Fund Type**: Which fund the amount applies to\n- **Source Config**: Where rate values come from\n\n## Formula Variables\n- `{outstanding_amount}` — Unpaid contribution\n- `{days_late}` — Days past due\n- `{rate}` — Penalty/interest rate\n- `{periods_missed}` — Missed periods count\n\n## Best Practices\n- Validate formulas with sample data before enabling\n- Use the formula builder for complex calculations\n- Document business rationale in the description',
  'all_users', ARRAY['calculation','formula','penalty'], 'published', 1
WHERE NOT EXISTS (SELECT 1 FROM public.kb_articles WHERE module_key='compliance' AND screen_key='rule-engine-calculation' AND article_type='screen_help');

INSERT INTO public.kb_articles (module_key, submodule_key, screen_key, article_type, title, summary, content, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine', 'rule-engine-escalation', 'screen_help',
  'Escalation Rules Overview',
  'How escalation rules move violations through workflow stages.',
  E'# Escalation Rules\n\nEscalation rules define the state machine for violation lifecycle.\n\n## Key Concepts\n- **From/To Status**: The state transition\n- **Days Threshold**: Auto-escalation trigger\n- **Amount Threshold**: Monetary escalation trigger\n- **Auto-Escalate**: No manual intervention needed\n- **Requires Approval**: Supervisor must approve\n\n## State Machine\n1. Detected → 2. Notified → 3. Pending Response → 4. Under Review → 5. Escalated → 6. Legal Action → 7. Resolved\n\n## Best Practices\n- Set reasonable day thresholds\n- Require approval for Legal Action\n- Use auto-escalation sparingly',
  'all_users', ARRAY['escalation','workflow','status'], 'published', 1
WHERE NOT EXISTS (SELECT 1 FROM public.kb_articles WHERE module_key='compliance' AND screen_key='rule-engine-escalation' AND article_type='screen_help');

-- Tab-specific FAQs
INSERT INTO public.kb_faqs (module_key, screen_key, question, answer, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine-detection', 'What trigger events are available?', 'Available: contribution_posted, period_closed, payment_received, manual_review. Custom triggers can be configured in settings.', 'all_users', ARRAY['detection'], 'published', 1
WHERE NOT EXISTS (SELECT 1 FROM public.kb_faqs WHERE module_key='compliance' AND screen_key='rule-engine-detection' LIMIT 1);

INSERT INTO public.kb_faqs (module_key, screen_key, question, answer, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine-detection', 'How do I test a rule before enabling?', 'Create with is_enabled OFF, simulate against historical data, then toggle on.', 'all_users', ARRAY['detection','testing'], 'published', 2
WHERE NOT EXISTS (SELECT 1 FROM public.kb_faqs WHERE module_key='compliance' AND screen_key='rule-engine-detection' AND question ILIKE '%test%' LIMIT 1);

INSERT INTO public.kb_faqs (module_key, screen_key, question, answer, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine-calculation', 'How do I build a multi-factor formula?', 'Use the formula builder to combine operands with operators. Each factor can reference system config or contribution data.', 'all_users', ARRAY['formula'], 'published', 1
WHERE NOT EXISTS (SELECT 1 FROM public.kb_faqs WHERE module_key='compliance' AND screen_key='rule-engine-calculation' LIMIT 1);

INSERT INTO public.kb_faqs (module_key, screen_key, question, answer, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine-calculation', 'What if a formula variable has no value?', 'Missing variables default to zero. Override with fallback values in Source Config.', 'all_users', ARRAY['formula'], 'published', 2
WHERE NOT EXISTS (SELECT 1 FROM public.kb_faqs WHERE module_key='compliance' AND screen_key='rule-engine-calculation' AND question ILIKE '%variable%' LIMIT 1);

INSERT INTO public.kb_faqs (module_key, screen_key, question, answer, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine-escalation', 'Can violations skip escalation stages?', 'Yes, but not recommended — it bypasses notifications and review steps.', 'all_users', ARRAY['escalation'], 'published', 1
WHERE NOT EXISTS (SELECT 1 FROM public.kb_faqs WHERE module_key='compliance' AND screen_key='rule-engine-escalation' LIMIT 1);

INSERT INTO public.kb_faqs (module_key, screen_key, question, answer, audience, tags, status, sort_order)
SELECT 'compliance', 'rule-engine-escalation', 'Difference between auto-escalate and requires-approval?', 'Auto-escalate happens automatically. Requires-approval holds until a supervisor approves. Both can be enabled together.', 'all_users', ARRAY['escalation','approval'], 'published', 2
WHERE NOT EXISTS (SELECT 1 FROM public.kb_faqs WHERE module_key='compliance' AND screen_key='rule-engine-escalation' AND question ILIKE '%approval%' LIMIT 1);

-- Move remaining generic rule-engine content to detection
UPDATE public.kb_articles SET screen_key = 'rule-engine-detection' WHERE module_key='compliance' AND screen_key='rule-engine';
UPDATE public.kb_faqs SET screen_key = 'rule-engine-detection' WHERE module_key='compliance' AND screen_key='rule-engine';
UPDATE public.kb_field_help SET screen_key = 'rule-engine-detection' WHERE module_key='compliance' AND screen_key='rule-engine';
