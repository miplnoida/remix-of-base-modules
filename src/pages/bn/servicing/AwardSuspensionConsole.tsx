/**
 * Screen 26: Award Suspension Management
 *
 * DEPRECATED IMPLEMENTATION NOTE
 * ------------------------------
 * The original console imported and invoked
 * `updateAwardStatus()` from `awardServicingService` directly from the
 * browser. That behaviour bypassed the sanctioned maker-checker workflow
 * and is NOT allowed on this screen anymore.
 *
 * This file is now a thin route component that renders the redesigned
 * workspace in `./award-suspension/AwardSuspensionPage`. The workspace
 * only performs read-only calls through
 * `src/services/bn/awardSuspensionViewService.ts`.
 *
 * `updateAwardStatus` intentionally remains exported from the shared
 * service for other legacy pages, but MUST NOT be imported into any
 * component that composes this screen.
 */
import AwardSuspensionPage from './award-suspension/AwardSuspensionPage';

export default function AwardSuspensionConsole() {
  return <AwardSuspensionPage />;
}
