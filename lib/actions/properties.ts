"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProperty, getProperty, setPropertyExecutives, setPropertyStatus, updateProperty, type NewProperty, type PropertyChanges } from "@/lib/admin";
import { echo, strOrNull, toFormState } from "@/lib/forms";
import type { FormState } from "@/lib/types";

const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL"] as const;
const TRANSACTION_TYPES = ["RENT_LEASE", "SALE_PURCHASE"] as const;

export async function createPropertyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, ["name", "description", "location", "transactionType", "propertyType", "minPrice", "maxPrice"]);
  values.executiveIds = formData.getAll("executiveIds").filter((value): value is string => typeof value === "string" && value !== "").join(",");
  const errors: Record<string, string> = {};
  if (!values.name) errors.name = "Enter a property name";
  if (!TRANSACTION_TYPES.includes(values.transactionType as (typeof TRANSACTION_TYPES)[number])) errors.transactionType = "Choose a valid transaction type";
  if (!PROPERTY_TYPES.includes(values.propertyType as (typeof PROPERTY_TYPES)[number])) errors.propertyType = "Choose a valid property type";
  const minPrice = values.minPrice ? Number(values.minPrice.replace(/[\s,]/g, "")) : undefined;
  const maxPrice = values.maxPrice ? Number(values.maxPrice.replace(/[\s,]/g, "")) : undefined;
  if (values.minPrice && (!Number.isFinite(minPrice) || minPrice! < 0)) errors.minPrice = "Enter a valid minimum price";
  if (values.maxPrice && (!Number.isFinite(maxPrice) || maxPrice! < 0)) errors.maxPrice = "Enter a valid maximum price";
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) errors.maxPrice = "Maximum price must be greater than or equal to minimum price";
  if (Object.keys(errors).length) return { status: "error", fieldErrors: errors, values };
  const body: NewProperty = {
    name: values.name,
    transactionType: values.transactionType as NewProperty["transactionType"],
    propertyType: values.propertyType as NewProperty["propertyType"],
    currency: "INR",
    ...(values.description ? { description: values.description } : {}),
    ...(values.location ? { location: values.location } : {}),
    ...(minPrice !== undefined ? { minPrice } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    ...(values.executiveIds ? { executiveIds: values.executiveIds.split(",") } : {}),
  };
  let propertyId: string;
  try {
    propertyId = (await createProperty(body)).id;
  } catch (error) {
    return toFormState(error, values);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/properties/${propertyId}?created=1`);
}

export async function updatePropertyAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = echo(formData, ["name", "description", "location"]);
  try {
    const current = await getProperty(id);
    const next = { name: values.name, description: strOrNull(formData, "description"), location: strOrNull(formData, "location") };
    const changes: PropertyChanges = {};
    if (next.name !== current.name) changes.name = next.name;
    if (next.description !== current.description) changes.description = next.description;
    if (next.location !== current.location) changes.location = next.location;
    if (Object.keys(changes).length === 0) return { status: "idle" };
    await updateProperty(id, changes);
  } catch (error) {
    return toFormState(error, values);
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: "Property updated." };
}

export async function setPropertyStatusAction(id: string, isActive: boolean): Promise<FormState> {
  try {
    await setPropertyStatus(id, isActive);
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin", "layout");
  return { status: "success", message: isActive ? "Property activated." : "Property deactivated." };
}

/** The full list is replaced every time, so unchecked executives are removed. */
export async function setExecutivesAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const executiveIds = formData.getAll("executiveIds").filter((v): v is string => typeof v === "string" && v !== "");
  try {
    const result = await setPropertyExecutives(id, executiveIds);
    revalidatePath("/admin", "layout");
    const n = result.assignedPendingLeads ?? 0;
    return {
      status: "success",
      message: `Saved ${executiveIds.length} executive${executiveIds.length === 1 ? "" : "s"}.${n ? ` ${n} pending lead${n === 1 ? " was" : "s were"} assigned.` : ""}`,
    };
  } catch (error) {
    return toFormState(error);
  }
}
