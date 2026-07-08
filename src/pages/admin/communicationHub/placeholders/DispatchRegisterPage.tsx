import PlaceholderPage from "./PlaceholderPage";

export default function DispatchRegisterPage() {
  return (
    <PlaceholderPage
      title="Dispatch Register"
      purpose="Official register of every physical or electronic communication dispatched, with sequence number, sender department, recipient and reference document."
      futureSources={[
        "Delivery/message spine (planned)",
        "Correspondence outgoing (existing)",
        "Generated documents archive (existing)",
      ]}
    />
  );
}
