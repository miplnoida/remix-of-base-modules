import React from 'react';
import { HelpSearchDialog } from './HelpSearchDialog';
import { useHelpContext } from './HelpProvider';

/**
 * A HelpSearchDialog that is automatically connected to HelpProvider context.
 * Drop this anywhere inside a HelpProvider to get search with result viewing.
 */
export function ConnectedHelpSearch() {
  const { searchOpen, setSearchOpen, moduleKey, viewSearchResult } = useHelpContext();

  return (
    <HelpSearchDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      moduleKey={moduleKey}
      onSelectResult={viewSearchResult}
    />
  );
}
