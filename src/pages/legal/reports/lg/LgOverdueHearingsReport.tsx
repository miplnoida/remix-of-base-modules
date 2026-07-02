import { ExplorerShell } from "@/components/explorer";
import { overdueHearingsDataset } from "@/config/explorer/legalDatasets";
export default function LgOverdueHearingsReport() { return <ExplorerShell dataset={overdueHearingsDataset} />; }
