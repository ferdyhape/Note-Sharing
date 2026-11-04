import type { Prisma } from "@prisma/client";

export type ValueColumns = {
  valueJson?: Prisma.InputJsonValue | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueDate?: Date | null;
  relationNoteId?: string | null;
  relationUserId?: string | null;
};

type ValidationResult = { ok: true; columns: ValueColumns } | { ok: false; message: string };

/**
 * Maps a raw client value into the typed columns note_property_values
 * actually has, validated against the property's type and its own
 * inputConfig (option lists, min/max, date mode, etc.). One place for this —
 * every write to a property value goes through it, so the "hybrid typed
 * projection" the data model calls for (04_Data_Model_and_ERD.md §5) stays
 * consistent instead of each caller deciding which column to fill.
 */
export function validatePropertyValue(
  type: string,
  inputConfig: unknown,
  raw: unknown,
): ValidationResult {
  const config = (inputConfig ?? {}) as Record<string, unknown>;

  switch (type) {
    case "TEXT": {
      if (typeof raw !== "string") return { ok: false, message: "Expected text." };
      const maxLength = config.maxLength as number | undefined;
      if (maxLength && raw.length > maxLength) {
        return { ok: false, message: `Must be ${maxLength} characters or fewer.` };
      }
      return { ok: true, columns: { valueText: raw } };
    }

    case "NUMBER": {
      if (typeof raw !== "number" || Number.isNaN(raw)) {
        return { ok: false, message: "Expected a number." };
      }
      const { min, max } = config as { min?: number; max?: number };
      if (min !== undefined && raw < min) return { ok: false, message: `Must be at least ${min}.` };
      if (max !== undefined && raw > max) return { ok: false, message: `Must be at most ${max}.` };
      return { ok: true, columns: { valueNumber: raw } };
    }

    case "BOOLEAN": {
      if (typeof raw !== "boolean") return { ok: false, message: "Expected true or false." };
      return { ok: true, columns: { valueJson: raw } };
    }

    case "SELECT": {
      const options = (config.options ?? []) as Array<{ value: string }>;
      if (typeof raw !== "string" || !options.some((o) => o.value === raw)) {
        return { ok: false, message: "Not one of this property's options." };
      }
      return { ok: true, columns: { valueText: raw } };
    }

    case "MULTI_SELECT": {
      const options = (config.options ?? []) as Array<{ value: string }>;
      const maxSelections = config.maxSelections as number | undefined;
      if (!Array.isArray(raw) || !raw.every((v) => typeof v === "string")) {
        return { ok: false, message: "Expected a list of options." };
      }
      if (!raw.every((v) => options.some((o) => o.value === v))) {
        return { ok: false, message: "Contains an option this property doesn't have." };
      }
      if (maxSelections && raw.length > maxSelections) {
        return { ok: false, message: `Choose at most ${maxSelections}.` };
      }
      return { ok: true, columns: { valueJson: raw } };
    }

    case "DATE_TIME": {
      if (typeof raw !== "string") return { ok: false, message: "Expected a date/time string." };
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return { ok: false, message: "Not a valid date/time." };
      return { ok: true, columns: { valueDate: date } };
    }

    case "URL_EMAIL": {
      if (typeof raw !== "string") return { ok: false, message: "Expected text." };
      const mode = config.mode as "url" | "email" | undefined;
      if (mode === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
          return { ok: false, message: "Not a valid email." };
      } else {
        try {
          new URL(raw);
        } catch {
          return { ok: false, message: "Not a valid URL." };
        }
      }
      return { ok: true, columns: { valueText: raw } };
    }

    case "CURRENCY": {
      if (typeof raw !== "number" || Number.isNaN(raw)) {
        return { ok: false, message: "Expected an amount." };
      }
      return { ok: true, columns: { valueNumber: raw } };
    }

    case "RELATION": {
      if (typeof raw !== "string" || raw.length === 0) {
        return { ok: false, message: "Expected a Note or User id." };
      }
      const target = config.target as "NOTE" | "USER" | undefined;
      return {
        ok: true,
        columns:
          target === "USER"
            ? { relationUserId: raw, relationNoteId: null }
            : { relationNoteId: raw, relationUserId: null },
      };
    }

    case "ATTACHMENT": {
      // File upload infra (object storage) isn't built yet — stores a
      // metadata reference only, known gap, see docs/CHECKLIST.md Phase 2.
      if (typeof raw !== "object" || raw === null) {
        return { ok: false, message: "Expected file metadata." };
      }
      return { ok: true, columns: { valueJson: raw as Prisma.InputJsonValue } };
    }

    default:
      return { ok: false, message: "Unknown property type." };
  }
}

type StoredValue = {
  valueJson?: unknown;
  valueText?: string | null;
  valueNumber?: unknown;
  valueDate?: Date | null;
  relationNoteId?: string | null;
  relationUserId?: string | null;
} | null;

/**
 * Single place to turn a stored value back into display text (table
 * projection, filtering) — mirrors which column validatePropertyValue wrote
 * per type, so the two stay in sync.
 */
export function formatPropertyValue(type: string, value: StoredValue): string {
  if (!value) return "";
  switch (type) {
    case "TEXT":
    case "SELECT":
    case "URL_EMAIL":
      return value.valueText ?? "";
    case "NUMBER":
    case "CURRENCY":
      return value.valueNumber != null ? String(value.valueNumber) : "";
    case "BOOLEAN":
      return value.valueJson === true ? "Yes" : value.valueJson === false ? "No" : "";
    case "MULTI_SELECT":
      return Array.isArray(value.valueJson) ? value.valueJson.join(", ") : "";
    case "DATE_TIME":
      return value.valueDate ? new Date(value.valueDate).toLocaleString() : "";
    case "RELATION":
      return value.relationNoteId ?? value.relationUserId ?? "";
    case "ATTACHMENT":
      return value.valueJson != null ? JSON.stringify(value.valueJson) : "";
    default:
      return "";
  }
}
