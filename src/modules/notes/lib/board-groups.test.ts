import { describe, expect, it } from "vitest";
import { boardGroupOptions } from "./board-groups";

describe("boardGroupOptions", () => {
  it("returns valid configured Select options in their stored order", () => {
    expect(
      boardGroupOptions({
        options: [
          { value: "todo", label: "To do" },
          { value: "done", label: "Done" },
          { value: 3, label: "Invalid" },
        ],
      }),
    ).toEqual([
      { value: "todo", label: "To do" },
      { value: "done", label: "Done" },
    ]);
  });

  it("returns no groups for malformed configuration", () => {
    expect(boardGroupOptions(null)).toEqual([]);
    expect(boardGroupOptions({ options: "not-an-array" })).toEqual([]);
  });
});
