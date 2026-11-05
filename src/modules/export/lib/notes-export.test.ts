import { describe, expect, it } from "vitest";
import { buildTabularExport, tabularExportToCsv } from "./notes-export";

const timestamp = new Date("2026-11-05T00:00:00.000Z");

describe("Notes tabular export", () => {
  it("builds a stable property union and leaves missing cells blank", () => {
    const result = buildTabularExport([
      {
        id: "note-1",
        title: "First",
        contentText: "Plain body",
        status: "ACTIVE",
        createdAt: timestamp,
        updatedAt: timestamp,
        properties: [
          {
            name: "Priority",
            slug: "priority",
            type: "SELECT",
            values: [
              {
                valueJson: null,
                valueText: "High",
                valueNumber: null,
                valueDate: null,
                relationNoteId: null,
                relationUserId: null,
              },
            ],
          },
        ],
      },
      {
        id: "note-2",
        title: "Second",
        contentText: "",
        status: "ACTIVE",
        createdAt: timestamp,
        updatedAt: timestamp,
        properties: [],
      },
    ]);

    expect(result.headers).toEqual([
      "Title",
      "Content",
      "Status",
      "Created At",
      "Updated At",
      "Priority [priority]",
    ]);
    expect(result.rows[0]?.[5]).toBe("High");
    expect(result.rows[1]?.[5]).toBe("");
  });

  it("quotes CSV fields and neutralizes spreadsheet formulas", () => {
    expect(
      tabularExportToCsv({ headers: ["Title", "Value"], rows: [['A, "quoted"', "=1+1"]] }),
    ).toBe('"Title","Value"\r\n"A, ""quoted""","\'=1+1"');
  });
});
