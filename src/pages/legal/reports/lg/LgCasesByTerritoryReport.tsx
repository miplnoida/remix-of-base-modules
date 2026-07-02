import { ExplorerShell } from "@/components/explorer";
import { casesByTerritoryDataset } from "@/config/explorer/legalDatasets";
export default function LgCasesByTerritoryReport() { return <ExplorerShell dataset={casesByTerritoryDataset} />; }
