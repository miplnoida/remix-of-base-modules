import { ExplorerShell } from "@/components/explorer";
import { casesByOfficerDataset } from "@/config/explorer/legalDatasets";
export default function LgCasesByOfficerReport() { return <ExplorerShell dataset={casesByOfficerDataset} />; }
