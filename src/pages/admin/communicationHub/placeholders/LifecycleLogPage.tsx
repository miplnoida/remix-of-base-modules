import PlaceholderPage from "./PlaceholderPage";

export default function LifecycleLogPage() {
  return (
    <PlaceholderPage
      title="Lifecycle Event Log"
      purpose="End-to-end event stream for a communication: request → resolve → approve → queue → dispatch → deliver → open → bounce, keyed by request id and idempotency key."
      futureSources={[
        "Event log (planned)",
        "Existing audit log surfaces",
        "Delivery/message spine (planned)",
      ]}
    />
  );
}
