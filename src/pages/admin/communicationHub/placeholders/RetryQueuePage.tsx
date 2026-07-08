import PlaceholderPage from "./PlaceholderPage";

export default function RetryQueuePage() {
  return (
    <PlaceholderPage
      title="Failed & Retry Queue"
      purpose="Failed deliveries with retry policy, backoff status, last error, and manual retry/cancel actions."
      futureSources={[
        "Attempt log (planned)",
        "Delivery/message spine (planned)",
        "Retry policy config (planned)",
      ]}
    />
  );
}
