"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { idleState, type FormState, type Property, type PropertyExecutive } from "@/lib/types";
import { Field } from "./Field";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function EditPropertyForm({ action, property }: { action: Action; property: Property }) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values;
  const err = state.fieldErrors;
  return (
    <form action={formAction} className="stack">
      <FormMessage state={state} />
      <div className="grid-2">
        <Field label="Name" name="name" required maxLength={150} defaultValue={v?.name ?? property.name} error={err?.name} />
        <Field label="Location (optional)" name="location" maxLength={200} defaultValue={v?.location ?? property.location ?? ""} error={err?.location} />
      </div>
      <div className={`field${err?.description ? " has-error" : ""}`}>
        <label htmlFor="f-description">Description (optional)</label>
        <textarea id="f-description" name="description" maxLength={2000} defaultValue={v?.description ?? property.description ?? ""} aria-invalid={!!err?.description} />
        {err?.description && <p className="field-error">{err.description}</p>}
      </div>
      <div>
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}

type Choice = { id: string; name: string; username: string; managerName: string | null };

export function CreatePropertyForm({ action, executives }: { action: Action; executives: Choice[] }) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values;
  const err = state.fieldErrors;
  const selected = new Set((v?.executiveIds ?? "").split(",").filter(Boolean));
  return (
    <form action={formAction} className="stack">
      <FormMessage state={state} />
      <div className="grid-2">
        <Field label="Property name" name="name" required maxLength={150} defaultValue={v?.name} error={err?.name} />
        <Field label="Location (optional)" name="location" maxLength={200} defaultValue={v?.location} error={err?.location} />
        <div className={`field${err?.transactionType ? " has-error" : ""}`}>
          <label htmlFor="f-transactionType">Transaction type</label>
          <select id="f-transactionType" name="transactionType" required defaultValue={v?.transactionType ?? "SALE_PURCHASE"}>
            <option value="SALE_PURCHASE">Sale / Purchase</option>
            <option value="RENT_LEASE">Rent / Lease</option>
          </select>
          {err?.transactionType && <p className="field-error">{err.transactionType}</p>}
        </div>
        <div className={`field${err?.propertyType ? " has-error" : ""}`}>
          <label htmlFor="f-propertyType">Property type</label>
          <select id="f-propertyType" name="propertyType" required defaultValue={v?.propertyType ?? "RESIDENTIAL"}>
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          {err?.propertyType && <p className="field-error">{err.propertyType}</p>}
        </div>
        <Field label="Minimum price (₹)" name="minPrice" inputMode="numeric" defaultValue={v?.minPrice} error={err?.minPrice} />
        <Field label="Maximum price (₹)" name="maxPrice" inputMode="numeric" defaultValue={v?.maxPrice} error={err?.maxPrice} />
      </div>
      <div className={`field${err?.description ? " has-error" : ""}`}>
        <label htmlFor="f-description">Description (optional)</label>
        <textarea id="f-description" name="description" maxLength={2000} defaultValue={v?.description} aria-invalid={!!err?.description} />
        {err?.description && <p className="field-error">{err.description}</p>}
      </div>
      <fieldset className="pick-list">
        <legend className="muted">Assign active executives (optional)</legend>
        {executives.length ? executives.map((executive) => (
          <label key={executive.id} className="pick">
            <input type="checkbox" name="executiveIds" value={executive.id} defaultChecked={selected.has(executive.id)} />
            <span className="avatar avatar-sm" aria-hidden="true">{executive.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("")}</span>
            <span>{executive.name}<span className="muted person-sub"> @{executive.username}{executive.managerName ? ` · ${executive.managerName}` : ""}</span></span>
          </label>
        )) : <p className="muted">No active executives available.</p>}
      </fieldset>
      <div><SubmitButton pendingLabel="Creating…">Create property</SubmitButton></div>
    </form>
  );
}

export function AssignExecutivesForm({
  action,
  choices,
  selected,
  inactiveSelected,
}: {
  action: Action;
  choices: Choice[];
  selected: string[];
  inactiveSelected: PropertyExecutive[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const router = useRouter();
  const chosen = new Set(selected);
  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [router, state.status]);
  return (
    <form action={formAction} className="stack">
      <FormMessage state={state} />
      {choices.length === 0 ? (
        <p className="muted">No active executives yet.</p>
      ) : (
        <fieldset className="pick-list">
          <legend className="muted">Leads are shared round-robin between the checked executives.</legend>
          {choices.map((c) => (
            <label key={c.id} className="pick">
              <input type="checkbox" name="executiveIds" value={c.id} defaultChecked={chosen.has(c.id)} />
              <span className="avatar avatar-sm" aria-hidden="true">
                {c.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
              </span>
              <span>
                {c.name}
                <span className="muted person-sub"> @{c.username}{c.managerName ? ` · ${c.managerName}` : ""}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {inactiveSelected.length > 0 && (
        <p className="field-hint">
          Inactive and skipped: {inactiveSelected.map((e) => e.name).join(", ")}. Saving removes them from this property.
        </p>
      )}
      <div>
        <SubmitButton pendingLabel="Saving…">Save executives</SubmitButton>
      </div>
    </form>
  );
}
