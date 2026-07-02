import { ExplorerShell } from "@/components/explorer";
import { judgmentOrderDataset } from "@/config/explorer/legalDatasets";
export default function LgJudgmentOrderReport() { return <ExplorerShell dataset={judgmentOrderDataset} />; }
