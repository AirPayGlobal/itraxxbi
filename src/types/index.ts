// Dashboard KPI types
export interface DashboardKPI {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  trend?: "up" | "down" | "neutral";
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

// Module-specific filter types
export interface TaskFilters {
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  search?: string;
}

export interface JobCardFilters {
  status?: string;
  priority?: string;
  technicianId?: string;
  customerId?: string;
  jobType?: string;
  search?: string;
}

export interface CustomerFilters {
  status?: string;
  search?: string;
}

export interface LeaveFilters {
  status?: string;
  leaveType?: string;
  userId?: string;
}

export interface AssetFilters {
  category?: string;
  status?: string;
  search?: string;
}

export interface InvoiceFilters {
  status?: string;
  customerId?: string;
  search?: string;
}

// Form types
export interface TaskFormData {
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assigneeId?: string;
  projectId?: string;
}

export interface JobCardFormData {
  title: string;
  description?: string;
  jobType: string;
  priority: string;
  scheduledDate?: string;
  technicianId?: string;
  customerId?: string;
  vehicleId?: string;
  estimatedHours?: number;
  location?: string;
}

export interface CustomerFormData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}

// Navigation types
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// TRAXX AI types
export interface TraxxMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface TraxxSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  priority: string;
  module: string;
}
