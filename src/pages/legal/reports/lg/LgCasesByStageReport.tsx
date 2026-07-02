import { ExplorerShell } from "@/components/explorer";
import { casesByStageDataset } from "@/config/explorer/legalDatasets";
export default function LgCasesByStageReport() { return <ExplorerShell dataset={casesByStageDataset} />; }
