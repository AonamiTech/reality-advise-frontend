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
      imported: typeof summary.imported === "number" ? summary.imported : undefined,
      duplicates: typeof summary.duplicates === "number" ? summary.duplicates : undefined,
      failed: typeof summary.failed === "number" ? summary.failed : undefined,
      invalid: typeof summary.invalid === "number" ? summary.invalid : undefined,
    },
    rows: rows.map((row) => {
      const value = (row ?? {}) as Record<string, unknown>;
      return {
        excelRowNumber: numberValue(value.excelRowNumber ?? value.rowNumber),
        name: value.name == null ? null : String(value.name),
        mobile: value.mobile == null ? null : String(value.mobile),
        email: value.email == null ? null : String(value.email),
        property: value.property == null ? value.propertyName == null ? null : String(value.propertyName) : String(value.property),
        source: value.source == null ? null : String(value.source),
        status: String(value.status ?? "PENDING") as LeadImportRow["status"],
        errorMessage: value.errorMessage == null ? value.error == null ? null : String(value.error) : String(value.errorMessage),
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
