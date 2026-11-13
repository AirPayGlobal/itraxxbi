"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient, getSignedInProfile } from "@/lib/supabase/client";
import type { MeetingRow, ProfileRow } from "@/lib/supabase/database.types";
import { parseDueDate } from "@/lib/traxx-answers";

const supabase = createClient();
const KEY = ["meetings"] as const;

// ---------------------------------------------------------------------------
// Types (shapes of the jsonb columns)
// ---------------------------------------------------------------------------

export type MeetingParticipant = { id: string; name: string };
export type TranscriptEntry = { speaker: string; text: string; at: number };
export type MeetingActionItem = {
  text: string;
  assignee_id: string | null;
  assignee_name: string | null;
  /** YYYY-MM-DD or null */
  due: string | null;
  task_id: string | null;
};

export type Meeting = Omit<MeetingRow, "participants" | "transcript" | "key_points" | "action_items"> & {
  participants: MeetingParticipant[];
  transcript: TranscriptEntry[];
  key_points: string[];
  action_items: MeetingActionItem[];
};

export type StaffMember = Pick<ProfileRow, "id" | "name" | "role" | "department" | "job_title">;

export type MeetingInput = {
  title: string;
  meeting_date: string;
  duration_seconds: number;
  participants: MeetingParticipant[];
  transcript: TranscriptEntry[];
  summary: string;
  key_points: string[];
  action_items: MeetingActionItem[];
};

// ---------------------------------------------------------------------------
// jsonb parsing (defensive: rows may have been written by older code)
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function parseMeeting(row: MeetingRow): Meeting {
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  return {
    ...row,
    participants: arr(row.participants)
      .filter(isObj)
      .map((p) => ({ id: str(p.id) ?? "", name: str(p.name) ?? "Unknown" })),
    transcript: arr(row.transcript)
      .filter(isObj)
      .map((t) => ({
        speaker: str(t.speaker) ?? "Speaker",
        text: str(t.text) ?? "",
        at: typeof t.at === "number" ? t.at : 0,
      })),
    key_points: arr(row.key_points).filter((k): k is string => typeof k === "string"),
    action_items: arr(row.action_items)
      .filter(isObj)
      .map((a) => ({
        text: str(a.text) ?? "",
        assignee_id: str(a.assignee_id),
        assignee_name: str(a.assignee_name),
        due: str(a.due),
        task_id: str(a.task_id),
      })),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useMeetings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Meeting[]> => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(parseMeeting);
    },
  });
}

/** Active staff (everyone except CLIENT logins) for participant and assignee pickers. */
export function useStaff() {
  return useQuery({
    queryKey: ["profiles", "staff"],
    queryFn: async (): Promise<StaffMember[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, department, job_title")
        .neq("role", "CLIENT")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Creates a TODO task for each action item that has no task yet. Returns the updated items. */
async function createTasksForItems(
  meetingTitle: string,
  items: MeetingActionItem[],
  created_by_id: string
): Promise<{ items: MeetingActionItem[]; created: number }> {
  const out: MeetingActionItem[] = [];
  let created = 0;
  for (const item of items) {
    if (item.task_id || !item.text.trim()) {
      out.push(item);
      continue;
    }
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: item.text.length > 200 ? `${item.text.slice(0, 197)}...` : item.text,
        description: `Action item from meeting "${meetingTitle}".`,
        status: "TODO",
        priority: "MEDIUM",
        is_recurring: false,
        assignee_id: item.assignee_id,
        due_date: item.due,
        created_by_id,
      })
      .select("id")
      .single();
    if (error) throw error;
    created++;
    out.push({ ...item, task_id: data.id });
  }
  return { items: out, created };
}

async function requireProfileId(): Promise<string> {
  const me = await getSignedInProfile();
  if (!me) throw new Error("You must be signed in.");
  return me.id;
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      createTasks,
    }: {
      input: MeetingInput;
      createTasks: boolean;
    }): Promise<{ meeting: Meeting; tasksCreated: number }> => {
      const created_by_id = await requireProfileId();
      const { data, error } = await supabase
        .from("meetings")
        .insert({ ...input, created_by_id })
        .select()
        .single();
      if (error) throw error;
      let meeting = parseMeeting(data);
      let tasksCreated = 0;
      if (createTasks && meeting.action_items.length) {
        const res = await createTasksForItems(meeting.title, meeting.action_items, created_by_id);
        tasksCreated = res.created;
        const { data: updated, error: ue } = await supabase
          .from("meetings")
          .update({ action_items: res.items })
          .eq("id", meeting.id)
          .select()
          .single();
        if (ue) throw ue;
        meeting = parseMeeting(updated);
      }
      return { meeting, tasksCreated };
    },
    onSuccess: ({ tasksCreated }) => {
      qc.invalidateQueries({ queryKey: KEY });
      if (tasksCreated) qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(
        tasksCreated
          ? `Meeting saved and ${tasksCreated} task${tasksCreated === 1 ? "" : "s"} created`
          : "Meeting saved"
      );
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save meeting"),
  });
}

/** Turns an existing meeting's remaining action items into tasks. */
export function useCreateMeetingTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meeting: Meeting): Promise<{ meeting: Meeting; created: number }> => {
      const created_by_id = await requireProfileId();
      const res = await createTasksForItems(meeting.title, meeting.action_items, created_by_id);
      const { data, error } = await supabase
        .from("meetings")
        .update({ action_items: res.items })
        .eq("id", meeting.id)
        .select()
        .single();
      if (error) throw error;
      return { meeting: parseMeeting(data), created: res.created };
    },
    onSuccess: ({ created }) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(created ? `${created} task${created === 1 ? "" : "s"} created` : "All action items already have tasks");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create tasks"),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Meeting deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete meeting"),
  });
}

// ---------------------------------------------------------------------------
// Rule-based extraction (no AI service: simple sentence heuristics)
// ---------------------------------------------------------------------------

type Sentence = { text: string; speaker: string; order: number };

function splitSentences(transcript: TranscriptEntry[]): Sentence[] {
  const out: Sentence[] = [];
  for (const seg of transcript) {
    // Speech recognition often returns unpunctuated text: a segment with no
    // sentence breaks becomes one sentence. Typed notes split on lines too.
    const parts = seg.text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((s) => s.split(/\s+/).length >= 3);
    for (const p of parts) out.push({ text: p, speaker: seg.speaker, order: out.length });
  }
  return out;
}

const ACTION_RE =
  /\b(will|i'll|we'll|need to|needs to|action|follow up|follow-up|by (today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|end of (the )?(day|week|month)))\b/i;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Finds the staff member named in a sentence (full name, then unique first name). */
function matchStaff(sentence: string, staff: StaffMember[]): StaffMember | null {
  const lower = sentence.toLowerCase();
  const full = staff.find((s) => s.name && new RegExp(`\\b${escapeRe(s.name.toLowerCase())}\\b`).test(lower));
  if (full) return full;
  const firstCounts = new Map<string, number>();
  for (const s of staff) {
    const f = s.name.split(/\s+/)[0]?.toLowerCase();
    if (f) firstCounts.set(f, (firstCounts.get(f) ?? 0) + 1);
  }
  return (
    staff.find((s) => {
      const f = s.name.split(/\s+/)[0]?.toLowerCase();
      return !!f && f.length > 2 && firstCounts.get(f) === 1 && new RegExp(`\\b${escapeRe(f)}\\b`).test(lower);
    }) ?? null
  );
}

export type ExtractedMeeting = {
  summary: string;
  key_points: string[];
  action_items: MeetingActionItem[];
};

function formatDurationText(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60} min`;
}

export function extractMeeting(
  title: string,
  transcript: TranscriptEntry[],
  participants: MeetingParticipant[],
  staff: StaffMember[],
  durationSeconds: number,
  base: Date = new Date()
): ExtractedMeeting {
  const sentences = splitSentences(transcript);

  const action_items: MeetingActionItem[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    if (!ACTION_RE.test(s.text)) continue;
    const key = s.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    let who = matchStaff(s.text, staff);
    // "I will ..." with no name mentioned: the speaker owns it.
    if (!who && /\b(i will|i'll|i need to)\b/i.test(s.text)) {
      who = staff.find((p) => p.name.toLowerCase() === s.speaker.toLowerCase()) ?? null;
    }
    action_items.push({
      text: s.text,
      assignee_id: who?.id ?? null,
      assignee_name: who?.name ?? null,
      due: parseDueDate(s.text, base),
      task_id: null,
    });
  }

  // Key points: the opening sentence plus the longest (most detailed) ones,
  // kept in the order they were said.
  const actionTexts = new Set(action_items.map((a) => a.text));
  const pool = sentences.filter((s) => !actionTexts.has(s.text));
  const source = pool.length ? pool : sentences;
  const picked = new Set<number>();
  if (source[0]) picked.add(source[0].order);
  [...source]
    .sort((a, b) => b.text.length - a.text.length)
    .forEach((s) => {
      if (picked.size < 5) picked.add(s.order);
    });
  const key_points = sentences.filter((s) => picked.has(s.order)).map((s) => s.text);

  const names = participants.map((p) => p.name);
  const who =
    names.length === 0
      ? ""
      : names.length <= 4
        ? ` with ${names.slice(0, -1).join(", ")}${names.length > 1 ? " and " : ""}${names[names.length - 1]}`
        : ` with ${names.length} participants`;
  const parts = [`"${title || "Meeting"}" ran for ${formatDurationText(durationSeconds)}${who}.`];
  if (key_points.length) parts.push(`Discussion opened with: ${key_points[0]}`);
  parts.push(
    action_items.length
      ? `${action_items.length} action item${action_items.length === 1 ? " was" : "s were"} captured.`
      : "No action items were captured."
  );

  return { summary: parts.join(" "), key_points, action_items };
}
