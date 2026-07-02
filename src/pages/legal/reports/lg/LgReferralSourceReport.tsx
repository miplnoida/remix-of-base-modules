import { ExplorerShell } from "@/components/explorer";
import { referralSourceDataset } from "@/config/explorer/legalDatasets";
export default function LgReferralSourceReport() { return <ExplorerShell dataset={referralSourceDataset} />; }
