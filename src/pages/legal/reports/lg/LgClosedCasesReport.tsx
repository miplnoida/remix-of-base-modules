import { ExplorerShell } from "@/components/explorer";
import { closedCasesDataset } from "@/config/explorer/legalDatasets";
export default function LgClosedCasesReport() { return <ExplorerShell dataset={closedCasesDataset} />; }
