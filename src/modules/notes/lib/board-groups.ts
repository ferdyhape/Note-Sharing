export type BoardGroupOption = { value: string; label: string };

export function boardGroupOptions(inputConfig: unknown): BoardGroupOption[] {
  if (!inputConfig || typeof inputConfig !== "object" || Array.isArray(inputConfig)) return [];
  const options = (inputConfig as { options?: unknown }).options;
  if (!Array.isArray(options)) return [];
  return options.filter(
    (option): option is BoardGroupOption =>
      Boolean(option) &&
      typeof option === "object" &&
      !Array.isArray(option) &&
      typeof option.value === "string" &&
      typeof option.label === "string",
  );
}
