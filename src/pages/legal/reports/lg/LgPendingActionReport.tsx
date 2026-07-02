import { ExplorerShell } from "@/components/explorer";
import { pendingActionDataset } from "@/config/explorer/legalDatasets";
export default function LgPendingActionReport() { return <ExplorerShell dataset={pendingActionDataset} />; }
