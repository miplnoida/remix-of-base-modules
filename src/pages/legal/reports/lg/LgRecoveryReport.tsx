import { ExplorerShell } from "@/components/explorer";
import { recoveryDataset } from "@/config/explorer/legalDatasets";
export default function LgRecoveryReport() { return <ExplorerShell dataset={recoveryDataset} />; }
