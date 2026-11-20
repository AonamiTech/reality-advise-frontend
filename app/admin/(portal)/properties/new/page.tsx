import type { Metadata } from "next";
import Link from "next/link";
import { CreatePropertyForm } from "@/components/PropertyForms";
import { createPropertyAction } from "@/lib/actions/properties";
import { listExecutives } from "@/lib/admin";

export const metadata: Metadata = { title: "New property" };

export default async function NewPropertyPage() {
  const executives = await listExecutives({ isActive: "true" });
  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back" href="/admin/properties"><span aria-hidden="true">←</span> Properties</Link>
          <h1>New property</h1>
          <p className="muted">Add a property and optionally assign its active executive pool.</p>
        </div>
      </div>
      <section className="panel max-w-3xl">
        <CreatePropertyForm
          action={createPropertyAction}
          executives={executives.map((executive) => ({ id: executive.id, name: executive.name, username: executive.username, managerName: executive.manager?.name ?? null }))}
        />
      </section>
    </>
  );
}
