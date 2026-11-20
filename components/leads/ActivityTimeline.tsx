"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLeadCommentAction, deleteLeadCommentAction, editLeadCommentAction } from "@/lib/actions/leads";
import { formatDate } from "@/lib/format";
import type { ActivityEntry, Role } from "@/lib/types";

const THREE_MINUTES = 3 * 60 * 1000;

function canModify(activity: ActivityEntry, currentUserId?: string, now = Date.now()) {
  const age = now - new Date(activity.createdAt).getTime();
  return activity.type === "COMMENT_ADDED" && activity.actor?.id === currentUserId && age >= 0 && age < THREE_MINUTES;
}

export function ActivityTimeline({ activity, role, leadId, currentUserId }: { activity: ActivityEntry[]; role: Role; leadId: string; currentUserId?: string }) {
  const router = useRouter();
  const [items, setItems] = useState(activity);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => setItems(activity), [activity]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function refresh() {
    setMessage(null);
    router.refresh();
  }

  function addComment() {
    const value = comment.trim();
    if (!value) return setMessage("Enter a remark before adding it.");
    startTransition(async () => {
      const result = await addLeadCommentAction(role, leadId, value);
      if (!result.ok) return setMessage(result.message);
      setComment("");
      refresh();
    });
  }

  function saveEdit(id: string) {
    const value = editingText.trim();
    if (!value) return setMessage("Comment cannot be empty.");
    startTransition(async () => {
      const result = await editLeadCommentAction(role, leadId, id, value);
      if (!result.ok) return setMessage(result.message);
      setEditingId(null);
      setEditingText("");
      refresh();
    });
  }

  function removeComment(id: string) {
    if (!window.confirm("Are you sure you want to delete this remark?")) return;
    startTransition(async () => {
      const result = await deleteLeadCommentAction(role, leadId, id);
      if (!result.ok) return setMessage(result.message);
      setItems((current) => current.filter((item) => item.id !== id));
      refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {items.length === 0 ? <p className="muted">No activity recorded yet.</p> : <ol className="relative grid gap-5 pl-5">
        <span aria-hidden="true" className="absolute bottom-1 left-[3px] top-1.5 w-px bg-border" />
        {items.map((item) => {
          const editable = canModify(item, currentUserId, now);
          const isComment = item.type === "COMMENT_ADDED";
          return <li key={item.id} className="relative">
            <span aria-hidden="true" className="absolute -left-5 top-[5px] size-[7px] rounded-full bg-[#6366f1]" />
            <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}{isComment && item.actor?.name ? ` · ${item.actor.name}` : ""}</p>
            {editingId === item.id ? <div className="mt-1 grid gap-2"><textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} rows={3} className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm" autoFocus /><div className="flex gap-2"><button type="button" className="btn btn-solid btn-sm" onClick={() => saveEdit(item.id)} disabled={pending}>Save</button><button type="button" className="btn btn-line btn-sm" onClick={() => setEditingId(null)} disabled={pending}>Cancel</button></div></div> : <p className="text-sm">{item.message}</p>}
            {editable && editingId !== item.id && <div className="mt-1 flex gap-3 text-xs"><button type="button" className="text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => { setEditingId(item.id); setEditingText(item.message); }}>Edit</button><button type="button" className="text-destructive underline underline-offset-2" onClick={() => removeComment(item.id)} disabled={pending}>Delete</button></div>}
          </li>;
        })}
      </ol>}
      <div className="grid gap-2 border-t border-border pt-4">
        <label htmlFor="lead-comment" className="text-sm font-medium">Add comment</label>
        <textarea id="lead-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a remark about this lead…" rows={3} className="w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm" disabled={pending} />
        {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
        <button type="button" className="btn btn-solid justify-self-start" onClick={addComment} disabled={pending || !comment.trim()}>{pending ? "Saving…" : "Add comment"}</button>
      </div>
    </div>
  );
}
