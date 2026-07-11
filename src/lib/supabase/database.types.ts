// Hand-written types for the tables wired to the UI so far (core slice).
// Regenerate the full set with:
//   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// Until every module is wired, this covers: profiles, customers, projects,
// tasks, job_cards, invoices, invoice_items, payments, tickets, ticket_comments.

export type UserRole = "ADMIN" | "MANAGER" | "TECHNICIAN" | "STAFF" | "VIEWER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";
export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type JobStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "INVOICED"
  | "CANCELLED";
export type JobType =
  | "INSTALLATION"
  | "MAINTENANCE"
  | "REPAIR"
  | "INSPECTION"
  | "REMOVAL"
  | "OTHER";
export type CustomerStatus = "PROSPECT" | "ACTIVE" | "INACTIVE" | "CHURNED";
export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "PARTIAL";
export type PaymentMethod =
  | "BANK_TRANSFER"
  | "CASH"
  | "CARD"
  | "CHEQUE"
  | "MOBILE_PAYMENT"
  | "OTHER";
export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketCategory =
  | "TECHNICAL"
  | "BILLING"
  | "GENERAL"
  | "DEVICE"
  | "GPS"
  | "INSTALLATION"
  | "ACCOUNT"
  | "OTHER";

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  avatar: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
}

export type CustomerRow = Timestamps & {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  account_number: string | null;
  status: CustomerStatus;
  notes: string | null;
  contract_start: string | null;
  contract_end: string | null;
}

export type ProjectRow = Timestamps & {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
}

export type TaskRow = Timestamps & {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  recur_pattern: string | null;
  assignee_id: string | null;
  created_by_id: string;
  project_id: string | null;
  parent_id: string | null;
}

export type JobCardRow = Timestamps & {
  id: string;
  job_number: string;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: Priority;
  job_type: JobType;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  notes: string | null;
  location: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  technician_id: string | null;
  created_by_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
}

export type InvoiceRow = Timestamps & {
  id: string;
  invoice_number: string;
  customer_id: string;
  job_card_id: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
}

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paid_at: string;
}

export type TicketRow = Timestamps & {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customer_name: string;
  company: string | null;
  email: string | null;
  customer_id: string | null;
  assigned_to_id: string | null;
  created_by_id: string | null;
  resolved_at: string | null;
}

export type TicketCommentRow = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

type TableConfig<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

// Insert helpers. id + timestamps are DB-generated (optional), and any nullable
// column is treated as optional on insert (matches Supabase's generated types,
// where nullable / defaulted columns may be omitted).
type Generated = "id" | "created_at" | "updated_at";
type NullableKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];
type OptionalOnInsert<Row> = (Generated & keyof Row) | NullableKeys<Row>;

type Insertable<Row> = Omit<Row, OptionalOnInsert<Row>> &
  Partial<Pick<Row, OptionalOnInsert<Row> & keyof Row>>;

export type Database = {
  public: {
    Tables: {
      profiles: TableConfig<ProfileRow, Partial<ProfileRow>, Partial<ProfileRow>>;
      customers: TableConfig<
        CustomerRow,
        Insertable<CustomerRow>,
        Partial<CustomerRow>
      >;
      projects: TableConfig<
        ProjectRow,
        Insertable<ProjectRow>,
        Partial<ProjectRow>
      >;
      tasks: TableConfig<TaskRow, Insertable<TaskRow>, Partial<TaskRow>>;
      job_cards: TableConfig<
        JobCardRow,
        Insertable<JobCardRow>,
        Partial<JobCardRow>
      >;
      invoices: TableConfig<
        InvoiceRow,
        Insertable<InvoiceRow>,
        Partial<InvoiceRow>
      >;
      invoice_items: TableConfig<
        InvoiceItemRow,
        Omit<InvoiceItemRow, "id">,
        Partial<InvoiceItemRow>
      >;
      payments: TableConfig<
        PaymentRow,
        Omit<PaymentRow, "id" | "paid_at"> & { paid_at?: string },
        Partial<PaymentRow>
      >;
      tickets: TableConfig<TicketRow, Insertable<TicketRow>, Partial<TicketRow>>;
      ticket_comments: TableConfig<
        TicketCommentRow,
        Omit<TicketCommentRow, "id" | "created_at"> & { created_at?: string },
        Partial<TicketCommentRow>
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      user_role: UserRole;
      task_status: TaskStatus;
      project_status: ProjectStatus;
      priority: Priority;
      job_status: JobStatus;
      job_type: JobType;
      customer_status: CustomerStatus;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      ticket_status: TicketStatus;
      ticket_priority: TicketPriority;
      ticket_category: TicketCategory;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
