import PlaceholderPage from "./PlaceholderPage";

export default function DeliveryMonitorPage() {
  return (
    <PlaceholderPage
      title="Delivery Monitor"
      purpose="Live view of in-flight deliveries across email, SMS, push, print and portal channels with provider latency and throughput."
      futureSources={[
        "Delivery/message spine (planned)",
        "Provider Settings (existing)",
        "Attempt log (planned)",
      ]}
    />
  );
}
