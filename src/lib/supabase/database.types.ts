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

export type AssetCategory =
  | "TRACKING_DEVICE"
  | "VEHICLE"
  | "TOOL"
  | "SPARE_PART"
  | "OFFICE_EQUIPMENT"
  | "IT_EQUIPMENT"
  | "OTHER";
export type AssetStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_USE"
  | "MAINTENANCE"
  | "RETIRED"
  | "LOST";
export type ContractType =
  | "PERMANENT"
  | "FIXED_TERM"
  | "PART_TIME"
  | "CONTRACTOR";
export type LeaveType =
  | "ANNUAL"
  | "SICK"
  | "COMPASSIONATE"
  | "MATERNITY"
  | "PATERNITY"
  | "UNPAID"
  | "STUDY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type DocCategory =
  | "CONTRACT"
  | "CERTIFICATE"
  | "REGISTRATION"
  | "COMPLIANCE"
  | "SOP"
  | "INVOICE"
  | "REPORT"
  | "GENERAL";
export type DocAccess = "PUBLIC" | "INTERNAL" | "RESTRICTED" | "CONFIDENTIAL";
export type ExpenseCategory =
  | "FUEL"
  | "MAINTENANCE"
  | "SALARY"
  | "RENT"
  | "UTILITIES"
  | "EQUIPMENT"
  | "TRAVEL"
  | "MARKETING"
  | "INSURANCE"
  | "OTHER";

export type AssetRow = Timestamps & {
  id: string;
  name: string;
  asset_number: string;
  serial_number: string | null;
  category: AssetCategory;
  status: AssetStatus;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  depreciation_rate: number | null;
  location: string | null;
  barcode: string | null;
  quantity: number;
  min_stock_level: number | null;
  notes: string | null;
};

export type EmployeeRow = Timestamps & {
  id: string;
  user_id: string;
  employee_number: string;
  date_of_birth: string | null;
  start_date: string;
  end_date: string | null;
  contract_type: ContractType;
  salary: number | null;
  bank_name: string | null;
  bank_account: string | null;
  tax_number: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  annual_leave_balance: number;
  sick_leave_balance: number;
  compassionate_leave_balance: number;
};

export type LeaveRequestRow = Timestamps & {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  approved_by_id: string | null;
  approved_at: string | null;
};

export type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

export type DocumentRow = Timestamps & {
  id: string;
  name: string;
  description: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  category: DocCategory;
  version: number;
  expiry_date: string | null;
  access_level: DocAccess;
  uploaded_by_id: string;
  customer_id: string | null;
  folder_id: string | null;
};

export type CompanySettingsRow = {
  id: string;
  company_name: string | null;
  reg_number: string | null;
  industry: string | null;
  company_size: string | null;
  primary_email: string | null;
  phone_number: string | null;
  website: string | null;
  country: string | null;
  address: string | null;
  vat_number: string | null;
  currency: string | null;
  timezone: string | null;
  updated_at: string;
};

export type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  vendor: string | null;
  receipt: string | null;
  approved: boolean;
  notes: string | null;
  created_at: string;
};

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
      assets: TableConfig<AssetRow, Insertable<AssetRow>, Partial<AssetRow>>;
      employees: TableConfig<
        EmployeeRow,
        Insertable<EmployeeRow>,
        Partial<EmployeeRow>
      >;
      leave_requests: TableConfig<
        LeaveRequestRow,
        Insertable<LeaveRequestRow>,
        Partial<LeaveRequestRow>
      >;
      folders: TableConfig<
        FolderRow,
        Omit<FolderRow, "id" | "created_at"> & { created_at?: string },
        Partial<FolderRow>
      >;
      documents: TableConfig<
        DocumentRow,
        Insertable<DocumentRow>,
        Partial<DocumentRow>
      >;
      expenses: TableConfig<
        ExpenseRow,
        Insertable<ExpenseRow>,
        Partial<ExpenseRow>
      >;
      company_settings: TableConfig<
        CompanySettingsRow,
        Partial<CompanySettingsRow> & { id?: string },
        Partial<CompanySettingsRow>
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
      asset_category: AssetCategory;
      asset_status: AssetStatus;
      contract_type: ContractType;
      leave_type: LeaveType;
      leave_status: LeaveStatus;
      doc_category: DocCategory;
      doc_access: DocAccess;
      expense_category: ExpenseCategory;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
