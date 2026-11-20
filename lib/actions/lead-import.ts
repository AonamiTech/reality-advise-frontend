"use server";

import { ApiError, authedRequest } from "@/lib/api";
import type { LeadImport, LeadImportRow, LeadImportStatus } from "@/lib/types";

export type LeadImportActionResult = { ok: true; import: LeadImport } | { ok: false; message: string };

function unwrap(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const object = payload as Record<string, unknown>;
  const data = object.data;
  return data && typeof data === "object" ? data as Record<string, unknown> : object;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function textValue(...values: unknown[]) {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null && candidate !== "");
  return value == null ? null : String(value);
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function pick(record: Record<string, unknown>, keys: string[]) {
  const entries = Object.entries(record);
  for (const key of keys) {
    const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const entry = entries.find(([name]) => name.replace(/[^a-z0-9]/gi, "").toLowerCase() === normalized);
    if (entry && entry[1] !== undefined && entry[1] !== null && entry[1] !== "") return entry[1];
  }
  return undefined;
}

function normalizeImport(payload: unknown, fallbackId?: string): LeadImport {
  const data = unwrap(payload);
  const summary = (data.summary && typeof data.summary === "object" ? data.summary : data) as Record<string, unknown>;
  const rows = Array.isArray(data.rows) ? data.rows : Array.isArray(data.previewRows) ? data.previewRows : Array.isArray(data.items) ? data.items : [];
  return {
    importId: String(data.importId ?? data.id ?? fallbackId ?? ""),
    status: (data.status ?? "PREVIEW") as LeadImportStatus,
    summary: {
      totalRows: numberValue(summary.totalRows ?? summary.total),
      validRows: numberValue(summary.validRows ?? summary.valid),
      invalidRows: numberValue(summary.invalidRows ?? summary.invalid),
      duplicateRows: numberValue(summary.duplicateRows ?? summary.duplicates),
      imported: numberValue(summary.imported ?? summary.importedRows ?? summary.importedCount, -1) >= 0 ? numberValue(summary.imported ?? summary.importedRows ?? summary.importedCount) : undefined,
      duplicates: numberValue(summary.duplicates ?? summary.duplicateRows ?? summary.duplicateCount, -1) >= 0 ? numberValue(summary.duplicates ?? summary.duplicateRows ?? summary.duplicateCount) : undefined,
      failed: numberValue(summary.failed ?? summary.failedRows ?? summary.failedCount, -1) >= 0 ? numberValue(summary.failed ?? summary.failedRows ?? summary.failedCount) : undefined,
      invalid: numberValue(summary.invalid ?? summary.invalidRows ?? summary.invalidCount, -1) >= 0 ? numberValue(summary.invalid ?? summary.invalidRows ?? summary.invalidCount) : undefined,
    },
    rows: rows.map((row) => {
      const value = (row ?? {}) as Record<string, unknown>;
      const rowData = [value.rowData, value.data, value.values, value.rawData, value.originalRow, value.originalData, value.parsedData, value.parsed, value.input, value.inputData, value.record, value.row, value.lead, value.leadData].map(recordValue).find(Boolean);
      const customer = recordValue(value.customer);
      const property = recordValue(value.property);
      const fields = { ...(rowData ?? {}), ...value };
      const validationErrors = fields.errors ?? fields.validationErrors ?? fields.errorMessages;
      const errorText = Array.isArray(validationErrors) ? validationErrors.map((error) => typeof error === "string" ? error : (error as Record<string, unknown>)?.message).filter(Boolean).join(", ") : validationErrors;
      return {
        excelRowNumber: numberValue(value.excelRowNumber ?? value.rowNumber ?? value.excelRow ?? pick(fields, ["excelRowNumber", "rowNumber", "excelRow"])),
        name: textValue(pick(fields, ["name", "fullName", "customerName"]), customer?.name),
        mobile: textValue(pick(fields, ["mobile", "phone", "phoneNumber"]), customer?.mobile),
        email: textValue(pick(fields, ["email", "emailAddress"]), customer?.email),
        property: textValue(pick(fields, ["property", "propertyName", "requestedPropertyName"]), property?.name),
        source: textValue(pick(fields, ["source", "leadSource"])),
        status: String(value.status ?? pick(fields, ["status"]) ?? "PENDING") as LeadImportRow["status"],
        errorMessage: textValue(value.errorMessage, value.error, pick(fields, ["errorMessage", "error"]), errorText),
      };
    }),
  };
}

function failure(error: unknown): LeadImportActionResult {
  return { ok: false, message: error instanceof ApiError ? error.message : "Unable to process the lead import." };
}

export async function uploadLeadImportAction(formData: FormData): Promise<LeadImportActionResult> {
  const file = formData.get("file");
  if (!file || typeof file !== "object" || typeof (file as File).arrayBuffer !== "function") return { ok: false, message: "CSV or XLSX file is required" };
  const request = new FormData();
  request.append("file", file as File);
  try {
    return { ok: true, import: normalizeImport(await authedRequest("ADMIN", "/admin/leads/imports", { method: "POST", body: request })) };
  } catch (error) {
    return failure(error);
  }
}

export async function getLeadImportAction(importId: string): Promise<LeadImportActionResult> {
  try {
    return { ok: true, import: normalizeImport(await authedRequest("ADMIN", `/admin/leads/imports/${encodeURIComponent(importId)}`), importId) };
  } catch (error) {
    return failure(error);
  }
}

export async function confirmLeadImportAction(importId: string): Promise<LeadImportActionResult> {
  try {
    return { ok: true, import: normalizeImport(await authedRequest("ADMIN", `/admin/leads/imports/${encodeURIComponent(importId)}/confirm`, { method: "POST" }), importId) };
  } catch (error) {
    return failure(error);
  }
}
