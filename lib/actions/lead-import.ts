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

function normalizeImport(payload: unknown, fallbackId?: string): LeadImport {
  const data = unwrap(payload);
  const summary = (data.summary && typeof data.summary === "object" ? data.summary : data) as Record<string, unknown>;
  const rows = Array.isArray(data.rows) ? data.rows : [];
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
      const rowData = [value.rowData, value.data, value.values, value.rawData, value.originalRow, value.input, value.record, value.row, value.lead, value.leadData].find((candidate) => candidate && typeof candidate === "object") as Record<string, unknown> | undefined;
      const fields = { ...(rowData ?? {}), ...value };
      const validationErrors = fields.errors;
      const errorText = Array.isArray(validationErrors) ? validationErrors.map((error) => typeof error === "string" ? error : (error as Record<string, unknown>)?.message).filter(Boolean).join(", ") : validationErrors;
      return {
        excelRowNumber: numberValue(value.excelRowNumber ?? value.rowNumber ?? value.excelRow ?? fields.excelRowNumber ?? fields.rowNumber),
        name: textValue(fields.name, fields.fullName, fields.customerName),
        mobile: textValue(fields.mobile, fields.phone, fields.phoneNumber),
        email: textValue(fields.email, fields.emailAddress),
        property: textValue(fields.property, fields.propertyName, fields.requestedPropertyName),
        source: textValue(fields.source, fields.leadSource),
        status: String(value.status ?? fields.status ?? "PENDING") as LeadImportRow["status"],
        errorMessage: textValue(value.errorMessage, value.error, fields.errorMessage, fields.error, errorText),
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
