import type { Metadata } from "next";
import { LeadImportWorkspace } from "@/components/leads/LeadImportWorkspace";

export const metadata: Metadata = { title: "Upload leads" };

export default function UploadLeadsPage() {
  return <LeadImportWorkspace />;
}
