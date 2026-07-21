/**
 * CH-SIMPLE-P3F-UX.1 — Master-data Module & Event selectors.
 *
 * Two searchable combobox popovers backed by the authoritative
 * `communication_hub_module_event_registry` view. The frontend does not
 * maintain a hardcoded list; RLS on the underlying tables enforces which
 * modules/events the operator may see. Every downstream server call
 * (send decision, preview, dry-run, controlled-live) revalidates the
 * selection — the dropdown is presentation-only.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUpDown, Check, Layers, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  fetchModuleEventDirectory,
  groupModules,
  eventsForModule,
  isDiagnosticEvent,
  type DirectoryEvent,
} from "./moduleEventDirectoryService";
import { Switch } from "@/components/ui/switch";

export interface ModuleEventSelectionResult {
  moduleCode: string;
  eventCode: string;
  channel: string;
  event: DirectoryEvent;
}

interface Props {
  moduleCode: string;
  eventCode: string;
  onSelect: (result: ModuleEventSelectionResult) => void;
  onModuleChange?: (moduleCode: string) => void;
  disabled?: boolean;
  invalidNotice?: string | null;
}

export function ModuleEventSelectors({
  moduleCode,
  eventCode,
  onSelect,
  onModuleChange,
  disabled,
  invalidNotice,
}: Props) {
  const { data: events = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["comm-hub-module-event-directory"],
    queryFn: () => fetchModuleEventDirectory(),
    staleTime: 60_000,
  });

  const [moduleOpen, setModuleOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // CH-SIMPLE-P3F-UX.2 — diagnostic events (e.g. Admin Test Notice) never
  // appear alongside normal business events. They are only revealed when
  // the operator explicitly opts in through "Advanced diagnostic events".
  const businessEvents = useMemo(
    () => events.filter((e) => !isDiagnosticEvent(e)),
    [events],
  );
  const diagnosticEvents = useMemo(
    () => events.filter((e) => isDiagnosticEvent(e)),
    [events],
  );
  const visibleEvents = showDiagnostic ? events : businessEvents;

  const modules = useMemo(() => groupModules(visibleEvents), [visibleEvents]);
  const scopedEvents = useMemo(
    () => (moduleCode ? eventsForModule(visibleEvents, moduleCode) : []),
    [visibleEvents, moduleCode],
  );

  const selectedModule = useMemo(
    () => modules.find((m) => m.moduleCode === moduleCode) || null,
    [modules, moduleCode],
  );
  const selectedEvent = useMemo(
    () => scopedEvents.find((e) => e.eventCode === eventCode) || null,
    [scopedEvents, eventCode],
  );
  const selectedIsDiagnostic = !!selectedEvent && isDiagnosticEvent(selectedEvent);

  // Clear event when it no longer belongs to the current module.
  useEffect(() => {
    if (eventCode && moduleCode && !isLoading && events.length > 0) {
      const belongs = events.some(
        (e) => e.moduleCode === moduleCode && e.eventCode === eventCode,
      );
      if (!belongs && onModuleChange) {
        onModuleChange(moduleCode); // signal parent to clear event & evidence
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleCode, eventCode, events, isLoading]);

  // If a diagnostic event was pre-selected (e.g. via URL param or session),
  // reveal the diagnostic list so the operator can see what they picked.
  useEffect(() => {
    if (
      eventCode &&
      !isLoading &&
      diagnosticEvents.some(
        (e) => e.moduleCode === moduleCode && e.eventCode === eventCode,
      )
    ) {
      setShowDiagnostic(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleCode, eventCode, diagnosticEvents, isLoading]);

  const moduleEmpty = !isLoading && modules.length === 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Module
          </Label>
          <Popover open={moduleOpen} onOpenChange={setModuleOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-label="Select module"
                aria-expanded={moduleOpen}
                disabled={disabled || isLoading || isError || moduleEmpty}
                className="w-full justify-between font-normal mt-1"
              >
                <span className="truncate">
                  {isLoading ? (
                    <span className="text-muted-foreground">Loading modules…</span>
                  ) : isError ? (
                    <span className="text-destructive">Modules could not be loaded</span>
                  ) : moduleEmpty ? (
                    <span className="text-muted-foreground">No Communication Hub modules are available</span>
                  ) : selectedModule ? (
                    <>
                      <span className="font-medium">
                        {selectedModule.moduleName ?? selectedModule.moduleCode}
                      </span>
                      <span className="text-muted-foreground"> — {selectedModule.moduleCode}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select a module…</span>
                  )}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 ml-2 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search modules by name or code…" />
                <CommandList className="max-h-[320px]">
                  <CommandEmpty>No modules match.</CommandEmpty>
                  <CommandGroup>
                    {modules.map((m) => (
                      <CommandItem
                        key={m.moduleCode}
                        value={`${m.moduleName ?? ""} ${m.moduleCode}`}
                        onSelect={() => {
                          if (m.moduleCode !== moduleCode) {
                            onModuleChange?.(m.moduleCode);
                          }
                          setModuleOpen(false);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={`h-3.5 w-3.5 ${
                            m.moduleCode === moduleCode ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {m.moduleName ?? m.moduleCode}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono">
                            {m.moduleCode}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {m.eventCount} event{m.eventCount === 1 ? "" : "s"}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> Communication event
          </Label>
          <Popover open={eventOpen} onOpenChange={setEventOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-label="Select communication event"
                aria-expanded={eventOpen}
                disabled={disabled || !moduleCode || isLoading || isError}
                className="w-full justify-between font-normal mt-1"
              >
                <span className="truncate">
                  {!moduleCode ? (
                    <span className="text-muted-foreground">Select a module first</span>
                  ) : isLoading ? (
                    <span className="text-muted-foreground">Loading events…</span>
                  ) : isError ? (
                    <span className="text-destructive">Events could not be loaded</span>
                  ) : scopedEvents.length === 0 ? (
                    <span className="text-muted-foreground">
                      No active communication events are registered for this module
                    </span>
                  ) : selectedEvent ? (
                    <>
                      <span className="font-medium">
                        {selectedEvent.eventName ?? selectedEvent.eventCode}
                      </span>
                      <span className="text-muted-foreground"> — {selectedEvent.eventCode}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select an event…</span>
                  )}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 ml-2 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search events by name or code…" />
                <CommandList className="max-h-[360px]">
                  <CommandEmpty>No matching events.</CommandEmpty>
                  <CommandGroup>
                    {scopedEvents.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.eventName ?? ""} ${e.eventCode} ${e.notes ?? ""}`}
                        onSelect={() => {
                          onSelect({
                            moduleCode: e.moduleCode,
                            eventCode: e.eventCode,
                            channel: (e.channel || "email").toLowerCase(),
                            event: e,
                          });
                          setEventOpen(false);
                        }}
                        className="flex items-start gap-2"
                      >
                        <Check
                          className={`h-3.5 w-3.5 mt-0.5 ${
                            e.eventCode === eventCode ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {e.eventName ?? e.eventCode}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate font-mono">
                            {e.eventCode}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {e.channel && (
                              <Badge variant="outline" className="text-[10px]">
                                {e.channel}
                              </Badge>
                            )}
                            {e.templateStatus && (
                              <Badge variant="secondary" className="text-[10px]">
                                template: {e.templateStatus}
                              </Badge>
                            )}
                            {e.liveStatus && (
                              <Badge variant="secondary" className="text-[10px]">
                                live: {e.liveStatus}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {invalidNotice && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          {invalidNotice}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-destructive">Directory failed to load.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export default ModuleEventSelectors;
