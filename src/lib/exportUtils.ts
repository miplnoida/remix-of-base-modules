/**
 * Utility functions for data export functionality
 */

export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Convert array of objects to CSV format
 */
export function convertToCSV(
  data: any[],
  columns?: ExportColumn[]
): string {
  if (!data || data.length === 0) return "";

  // Determine headers
  const headers = columns
    ? columns.map((col) => col.label)
    : Object.keys(data[0]);

  // Determine keys to extract
  const keys = columns ? columns.map((col) => col.key) : Object.keys(data[0]);

  // Escape CSV cell value
  const escapeCSVCell = (value: any): string => {
    if (value === null || value === undefined) return "";
    
    const stringValue = String(value);
    
    // If contains comma, newline, or quote, wrap in quotes and escape quotes
    if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Build CSV rows
  const csvRows = [
    headers.map(escapeCSVCell).join(","), // Header row
    ...data.map((row) =>
      keys.map((key) => escapeCSVCell(row[key])).join(",")
    ),
  ];

  return csvRows.join("\n");
}

/**
 * Download file to user's computer
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format filename with timestamp
 */
export function formatFilename(
  baseName: string,
  extension: string,
  includeTimestamp = true
): string {
  if (!includeTimestamp) {
    return `${baseName}.${extension}`;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `${baseName}_${timestamp}.${extension}`;
}
