import { formatPropertyValue } from "../../../shared/lib/property-value";

export type ExportProperty = {
  name: string;
  slug: string;
  type: string;
  values: Array<{
    valueJson: unknown;
    valueText: string | null;
    valueNumber: unknown;
    valueDate: Date | null;
    relationNoteId: string | null;
    relationUserId: string | null;
  }>;
};

export type ExportNote = {
  id: string;
  title: string;
  contentText: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  properties: ExportProperty[];
};

export type TabularExport = {
  headers: string[];
  rows: string[][];
};

const SYSTEM_COLUMNS = ["Title", "Content", "Status", "Created At", "Updated At"];

function propertyColumn(property: ExportProperty) {
  return `${property.name} [${property.slug}]`;
}

export function buildTabularExport(notes: ExportNote[]): TabularExport {
  const propertyColumns = [
    ...new Set(notes.flatMap((note) => note.properties.map(propertyColumn))),
  ];
  const headers = [...SYSTEM_COLUMNS, ...propertyColumns];
  const rows = notes.map((note) => {
    const values = new Map(
      note.properties.map((property) => [
        propertyColumn(property),
        formatPropertyValue(property.type, property.values[0] ?? null),
      ]),
    );
    return [
      note.title,
      note.contentText,
      note.status,
      note.createdAt.toISOString(),
      note.updatedAt.toISOString(),
      ...propertyColumns.map((column) => values.get(column) ?? ""),
    ];
  });
  return { headers, rows };
}

function safeCsvValue(value: string) {
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function tabularExportToCsv(exportData: TabularExport) {
  return [exportData.headers, ...exportData.rows]
    .map((row) => row.map(safeCsvValue).join(","))
    .join("\r\n");
}
