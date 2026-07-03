import { useEffect } from "react";
import manifest from "@/pages/legal/uat/uatDocumentsManifest.json";
import { Download, FileText, FileSpreadsheet, FileType2 } from "lucide-react";

type Doc = {
  name: string;
  category: string;
  file: string;
  url: string;
  ext: string;
  version: string;
  generated: string;
  status: string;
};

const iconFor = (ext: string) => {
  if (ext === "XLSX") return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (ext === "PDF") return <FileType2 className="h-5 w-5 text-red-600" />;
  return <FileText className="h-5 w-5 text-blue-600" />;
};

export default function UatDownloadsPublic() {
  const docs = manifest as Doc[];
  const grouped = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
  useEffect(() => {
    document.title = "Legal V1 UAT Documentation Downloads";
  }, []);


      <header className="border-b bg-card">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Legal V1 — Business UAT Documentation
          </h1>
          <p className="mt-2 text-muted-foreground">
            Public download center. No sign-in required. Files are versioned; latest package
            generated 2026-07-03.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-10">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h2 className="mb-3 text-lg font-semibold">{category}</h2>
            <ul className="divide-y rounded-lg border bg-card">
              {items.map((d) => (
                <li
                  key={d.file}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {iconFor(d.ext)}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.file} · {d.ext} · v{d.version} · {d.generated}
                      </div>
                    </div>
                  </div>
                  <a
                    href={d.url}
                    download
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="pt-6 text-xs text-muted-foreground border-t">
          Legal V1 UAT Package · Distributed for Business, QA, Compliance, and Steering
          Committee review.
        </footer>
      </main>
    </div>
  );
}
