export const IMPORT_RANGES = ["3m", "6m", "1y", "2y", "all"] as const;
export type ImportRange = (typeof IMPORT_RANGES)[number];

export const IMPORT_RANGE_LABELS: Record<ImportRange, string> = {
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "1y": "Last year",
  "2y": "Last 2 years",
  all: "Everything",
};
