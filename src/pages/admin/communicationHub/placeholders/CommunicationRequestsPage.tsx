import PlaceholderPage from "./PlaceholderPage";

export default function CommunicationRequestsPage() {
  return (
    <PlaceholderPage
      title="Communication Requests"
      purpose="Central queue of every send request submitted through the sendCommunication() façade, with status, module of origin, template, recipient, channel and idempotency key."
      futureSources={[
        "Communication request spine (planned)",
        "Existing template resolver context",
        "Module of origin (moduleCode) and event code",
      ]}
    />
  );
}
