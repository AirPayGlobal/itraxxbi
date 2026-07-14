"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/hooks/use-notifications";
import type {
  EmployeeRow,
  LeaveRequestRow,
  ProfileRow,
  ContractType,
  LeaveType,
  LeaveStatus,
} from "@/lib/supabase/database.types";

const supabase = createClient();
const EMP_KEY = ["employees"] as const;
const LEAVE_KEY = ["leave_requests"] as const;
const PROFILE_KEY = ["profiles"] as const;

export type Employee = EmployeeRow;
export type LeaveRequest = LeaveRequestRow;
export type Profile = Pick<
  ProfileRow,
  "id" | "name" | "department" | "job_title" | "role"
>;

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return user.id;
}

// Profiles — used to resolve employee/leave names and populate pickers.
export function useProfiles() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, department, job_title, role")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: EMP_KEY,
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("employee_number");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type EmployeeInput = {
  user_id: string;
  employee_number: string;
  start_date: string;
  contract_type?: ContractType;
  salary?: number | null;
  annual_leave_balance?: number;
  sick_leave_balance?: number;
  compassionate_leave_balance?: number;
};

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeInput): Promise<Employee> => {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          ...input,
          contract_type: input.contract_type ?? "PERMANENT",
          annual_leave_balance: input.annual_leave_balance ?? 20,
          sick_leave_balance: input.sick_leave_balance ?? 12,
          compassionate_leave_balance: input.compassionate_leave_balance ?? 5,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EMP_KEY });
      toast.success("Employee added");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add employee"),
  });
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: LEAVE_KEY,
    queryFn: async (): Promise<LeaveRequest[]> => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type LeaveInput = {
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason?: string | null;
};

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LeaveInput): Promise<LeaveRequest> => {
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({ ...input, status: "PENDING" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEAVE_KEY });
      toast.success("Leave request submitted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to submit request"),
  });
}

export function useSetLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: LeaveStatus;
    }): Promise<LeaveRequest> => {
      const approved_by_id = await currentUserId();
      const { data, error } = await supabase
        .from("leave_requests")
        .update({
          status,
          approved_by_id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Notify the employee of the decision.
      await createNotification({
        userId: data.user_id,
        title: `Leave request ${status.toLowerCase()}`,
        message: `Your ${data.leave_type.toLowerCase()} leave (${data.start_date} – ${data.end_date}) was ${status.toLowerCase()}.`,
        type: "LEAVE",
        link: "/hr",
      });

      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: LEAVE_KEY });
      toast.success(
        vars.status === "APPROVED" ? "Leave approved" : "Leave rejected"
      );
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update request"),
  });
}
