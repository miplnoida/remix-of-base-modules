import { useMemo, useState } from "react";
import { Download, FileText, FileSpreadsheet, FileType2, Search } from "lucide-react";
import manifest from "./uatDocumentsManifest.json";
import { useLgAccess } from "@/hooks/legal/useLgAccess";

interface Doc {
  name: string;
  category: string;
  file: string;
  url: string;
  ext: string;
  version: string;
  generated: string;
  status: string;
}

const iconFor = (ext: string) => {
  if (ext === "PDF") return <FileType2 className="h-5 w-5 text-red-600" aria-hidden />;
  if (ext === "XLSX") return <FileSpreadsheet className="h-5 w-5 text-emerald-600" aria-hidden />;
  return <FileText className="h-5 w-5 text-blue-600" aria-hidden />;
};

export default function UatDocumentsPage() {
  const { can, isLegal } = useLgAccess() as any;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const docs = manifest as Doc[];
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(docs.map((d) => d.category)))],
    [docs]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (cat === "All" || d.category === cat) &&
        (s === "" || d.name.toLowerCase().includes(s) || d.file.toLowerCase().includes(s))
    );
  }, [docs, q, cat]);

  // View permission: any legal role (admin inheritance already covers SYSTEMADMIN/LG_ADMIN).
  const canView = Boolean(isLegal) || can("manageTemplates");
  if (!canView) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">Restricted</h1>
        <p className="text-sm text-muted-foreground">
          The UAT documentation center is restricted to Legal roles and administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Legal V1 — UAT Documents</h1>
        <p className="text-sm text-muted-foreground">
          Enterprise UAT documentation package. Download individual artifacts below.
          {" "}Total: {docs.length} documents.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" aria-hidden />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-md border bg-background"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="text-sm rounded-md border bg-background px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Document</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Version</th>
              <th className="px-4 py-2 font-medium">Generated</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Download</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.file} className="border-t hover:bg-accent/30">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {iconFor(d.ext)}
                    <span className="font-medium">{d.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-7">{d.file}</div>
                </td>
                <td className="px-4 py-2">{d.category}</td>
                <td className="px-4 py-2">{d.ext}</td>
                <td className="px-4 py-2">{d.version}</td>
                <td className="px-4 py-2">{d.generated}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs">
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={d.url}
                    download
                    className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-accent"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No documents match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
