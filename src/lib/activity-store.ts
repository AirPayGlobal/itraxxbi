// ---------------------------------------------------------------------------
// Shared activity tracking store for employee performance monitoring
// All ticket actions are logged here and consumed by the staff performance page
// ---------------------------------------------------------------------------

export type ActivityType =
  | "TICKET_CREATED"
  | "TICKET_ASSIGNED"
  | "TICKET_REPLIED"
  | "TICKET_RESOLVED"
  | "TICKET_CLOSED"
  | "TICKET_REOPENED"
  | "TICKET_ESCALATED"
  | "TICKET_NOTE_ADDED";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  employeeName: string;
  employeeId: string;
  ticketNumber: string;
  ticketSubject: string;
  customerName: string;
  company: string;
  priority: string;
  category: string;
  details: string;
  timestamp: string;
}

export interface EmployeeTicketMetrics {
  employeeId: string;
  employeeName: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  ticketsClosed: number;
  ticketsEscalated: number;
  totalReplies: number;
  avgResolutionTimeHours: number;
  firstResponseTimeHours: number;
  customerSatisfaction: number;
  slaComplianceRate: number;
  reopenRate: number;
  activeTickets: number;
}

// ---------------------------------------------------------------------------
// Pre-seeded activity log (simulates historical data)
// ---------------------------------------------------------------------------

const activityLog: ActivityEntry[] = [
  // John Mutua — Senior Technician (handles GPS & device tickets)
  {
    id: "act-001",
    type: "TICKET_ASSIGNED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2602-0004",
    ticketSubject: "Dashboard showing incorrect vehicle locations",
    customerName: "Frieda Hamutenya",
    company: "Ohlthaver & List",
    priority: "HIGH",
    category: "SOFTWARE",
    details: "Ticket auto-assigned based on category expertise",
    timestamp: "2026-02-26T10:05:00",
  },
  {
    id: "act-002",
    type: "TICKET_REPLIED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2602-0004",
    ticketSubject: "Dashboard showing incorrect vehicle locations",
    customerName: "Frieda Hamutenya",
    company: "Ohlthaver & List",
    priority: "HIGH",
    category: "SOFTWARE",
    details: "Identified firmware bug causing GPS drift, deploying patch",
    timestamp: "2026-02-27T16:00:00",
  },
  {
    id: "act-003",
    type: "TICKET_REPLIED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2602-0004",
    ticketSubject: "Dashboard showing incorrect vehicle locations",
    customerName: "Frieda Hamutenya",
    company: "Ohlthaver & List",
    priority: "HIGH",
    category: "SOFTWARE",
    details: "Confirmed OTA update — no customer action needed",
    timestamp: "2026-02-27T17:00:00",
  },
  {
    id: "act-004",
    type: "TICKET_ASSIGNED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2602-0008",
    ticketSubject: "Tracker tamper alert on vehicle N-8832",
    customerName: "Thomas Nghifikwa",
    company: "Pupkewitz Motors",
    priority: "URGENT",
    category: "GPS_DEVICE",
    details: "Assigned for urgent on-site inspection",
    timestamp: "2026-03-01T06:20:00",
  },
  {
    id: "act-005",
    type: "TICKET_REPLIED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2602-0008",
    ticketSubject: "Tracker tamper alert on vehicle N-8832",
    customerName: "Thomas Nghifikwa",
    company: "Pupkewitz Motors",
    priority: "URGENT",
    category: "GPS_DEVICE",
    details: "Dispatched technician, ETA 10:30 AM",
    timestamp: "2026-03-01T08:00:00",
  },
  {
    id: "act-006",
    type: "TICKET_RESOLVED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2601-0015",
    ticketSubject: "GPS device power drain on vehicle WK-3301",
    customerName: "Anna Kambonde",
    company: "Ohlthaver & List",
    priority: "MEDIUM",
    category: "GPS_DEVICE",
    details: "Replaced faulty wiring harness, device back online",
    timestamp: "2026-02-20T14:30:00",
  },
  {
    id: "act-007",
    type: "TICKET_RESOLVED",
    employeeName: "John Mutua",
    employeeId: "1",
    ticketNumber: "TKT-2601-0018",
    ticketSubject: "Intermittent signal loss on 2 fleet vehicles",
    customerName: "Johannes Shikundu",
    company: "Namibia Breweries Ltd",
    priority: "HIGH",
    category: "CONNECTIVITY",
    details: "Antenna repositioned and SIM cards replaced",
    timestamp: "2026-02-22T11:00:00",
  },

  // David Amupolo — handles installations and some software tickets
  {
    id: "act-010",
    type: "TICKET_ASSIGNED",
    employeeName: "David Amupolo",
    employeeId: "2",
    ticketNumber: "TKT-2602-0002",
    ticketSubject: "Request installation on 3 new vehicles",
    customerName: "Maria van der Merwe",
    company: "TransNamib Holdings",
    priority: "HIGH",
    category: "INSTALLATION",
    details: "Assigned for Walvis Bay installation scheduling",
    timestamp: "2026-02-27T09:15:00",
  },
  {
    id: "act-011",
    type: "TICKET_REPLIED",
    employeeName: "David Amupolo",
    employeeId: "2",
    ticketNumber: "TKT-2602-0002",
    ticketSubject: "Request installation on 3 new vehicles",
    customerName: "Maria van der Merwe",
    company: "TransNamib Holdings",
    priority: "HIGH",
    category: "INSTALLATION",
    details: "Scheduled installation for Thursday 6 March at 9AM",
    timestamp: "2026-02-27T14:30:00",
  },
  {
    id: "act-012",
    type: "TICKET_RESOLVED",
    employeeName: "David Amupolo",
    employeeId: "2",
    ticketNumber: "TKT-2602-0005",
    ticketSubject: "Geofence alerts not triggering",
    customerName: "Peter Shikongo",
    company: "Namibia Breweries Ltd",
    priority: "MEDIUM",
    category: "SOFTWARE",
    details: "Fixed alert routing configuration, customer confirmed working",
    timestamp: "2026-02-25T15:30:00",
  },
  {
    id: "act-013",
    type: "TICKET_RESOLVED",
    employeeName: "David Amupolo",
    employeeId: "2",
    ticketNumber: "TKT-2601-0012",
    ticketSubject: "Installation for new Isuzu fleet",
    customerName: "Frieda Hamutenya",
    company: "Ohlthaver & List",
    priority: "MEDIUM",
    category: "INSTALLATION",
    details: "All 6 trackers installed and reporting",
    timestamp: "2026-02-18T16:00:00",
  },
  {
    id: "act-014",
    type: "TICKET_RESOLVED",
    employeeName: "David Amupolo",
    employeeId: "2",
    ticketNumber: "TKT-2601-0009",
    ticketSubject: "Tracker replacement for accident-damaged vehicle",
    customerName: "Hans Garoëb",
    company: "Pupkewitz Motors",
    priority: "HIGH",
    category: "GPS_DEVICE",
    details: "New tracker installed and configured",
    timestamp: "2026-02-15T12:00:00",
  },

  // Sarah Nekongo — Account Manager (handles billing and general queries)
  {
    id: "act-020",
    type: "TICKET_ASSIGNED",
    employeeName: "Sarah Nekongo",
    employeeId: "4",
    ticketNumber: "TKT-2602-0003",
    ticketSubject: "Monthly invoice discrepancy for February",
    customerName: "Hans Garoëb",
    company: "Pupkewitz Motors",
    priority: "MEDIUM",
    category: "BILLING",
    details: "Assigned for billing review",
    timestamp: "2026-02-25T16:15:00",
  },
  {
    id: "act-021",
    type: "TICKET_REPLIED",
    employeeName: "Sarah Nekongo",
    employeeId: "4",
    ticketNumber: "TKT-2602-0003",
    ticketSubject: "Monthly invoice discrepancy for February",
    customerName: "Hans Garoëb",
    company: "Pupkewitz Motors",
    priority: "MEDIUM",
    category: "BILLING",
    details: "Found 2 decommissioned trackers still active, credit note raised",
    timestamp: "2026-02-26T11:45:00",
  },
  {
    id: "act-022",
    type: "TICKET_RESOLVED",
    employeeName: "Sarah Nekongo",
    employeeId: "4",
    ticketNumber: "TKT-2602-0007",
    ticketSubject: "Need API access for fleet management integration",
    customerName: "Lukas Ndjamba",
    company: "TransNamib Holdings",
    priority: "LOW",
    category: "GENERAL",
    details: "API credentials and docs sent, customer confirmed integration working",
    timestamp: "2026-02-22T16:00:00",
  },
  {
    id: "act-023",
    type: "TICKET_CLOSED",
    employeeName: "Sarah Nekongo",
    employeeId: "4",
    ticketNumber: "TKT-2602-0007",
    ticketSubject: "Need API access for fleet management integration",
    customerName: "Lukas Ndjamba",
    company: "TransNamib Holdings",
    priority: "LOW",
    category: "GENERAL",
    details: "Closed by customer — integration complete",
    timestamp: "2026-02-22T16:05:00",
  },
  {
    id: "act-024",
    type: "TICKET_RESOLVED",
    employeeName: "Sarah Nekongo",
    employeeId: "4",
    ticketNumber: "TKT-2601-0020",
    ticketSubject: "Contract renewal pricing query",
    customerName: "Maria van der Merwe",
    company: "TransNamib Holdings",
    priority: "LOW",
    category: "BILLING",
    details: "Sent updated pricing proposal, contract renewed",
    timestamp: "2026-02-19T10:00:00",
  },
  {
    id: "act-025",
    type: "TICKET_REPLIED",
    employeeName: "Sarah Nekongo",
    employeeId: "4",
    ticketNumber: "TKT-2601-0020",
    ticketSubject: "Contract renewal pricing query",
    customerName: "Maria van der Merwe",
    company: "TransNamib Holdings",
    priority: "LOW",
    category: "BILLING",
    details: "Provided detailed breakdown of pricing tiers",
    timestamp: "2026-02-17T14:00:00",
  },

  // Peter Angula — Technician
  {
    id: "act-030",
    type: "TICKET_RESOLVED",
    employeeName: "Peter Angula",
    employeeId: "3",
    ticketNumber: "TKT-2601-0014",
    ticketSubject: "Battery replacement on tracker unit",
    customerName: "Peter Shikongo",
    company: "Namibia Breweries Ltd",
    priority: "LOW",
    category: "GPS_DEVICE",
    details: "Battery replaced, device reporting normally",
    timestamp: "2026-02-21T09:30:00",
  },
  {
    id: "act-031",
    type: "TICKET_ESCALATED",
    employeeName: "Peter Angula",
    employeeId: "3",
    ticketNumber: "TKT-2601-0016",
    ticketSubject: "Complex wiring issue on armoured vehicle",
    customerName: "Anna Kambonde",
    company: "Ohlthaver & List",
    priority: "HIGH",
    category: "INSTALLATION",
    details: "Escalated to senior technician — specialised wiring required",
    timestamp: "2026-02-23T11:00:00",
  },
  {
    id: "act-032",
    type: "TICKET_REPLIED",
    employeeName: "Peter Angula",
    employeeId: "3",
    ticketNumber: "TKT-2601-0014",
    ticketSubject: "Battery replacement on tracker unit",
    customerName: "Peter Shikongo",
    company: "Namibia Breweries Ltd",
    priority: "LOW",
    category: "GPS_DEVICE",
    details: "Confirmed replacement scheduled for tomorrow",
    timestamp: "2026-02-20T15:00:00",
  },

  // Lisa Amupolo — Operations Manager
  {
    id: "act-040",
    type: "TICKET_ASSIGNED",
    employeeName: "Lisa Amupolo",
    employeeId: "5",
    ticketNumber: "TKT-2601-0010",
    ticketSubject: "Fleet-wide firmware update request",
    customerName: "Johannes Shikundu",
    company: "Namibia Breweries Ltd",
    priority: "MEDIUM",
    category: "SOFTWARE",
    details: "Coordinating fleet-wide OTA update rollout",
    timestamp: "2026-02-16T08:00:00",
  },
  {
    id: "act-041",
    type: "TICKET_RESOLVED",
    employeeName: "Lisa Amupolo",
    employeeId: "5",
    ticketNumber: "TKT-2601-0010",
    ticketSubject: "Fleet-wide firmware update request",
    customerName: "Johannes Shikundu",
    company: "Namibia Breweries Ltd",
    priority: "MEDIUM",
    category: "SOFTWARE",
    details: "All 18 devices updated successfully — zero downtime",
    timestamp: "2026-02-17T16:00:00",
  },
  {
    id: "act-042",
    type: "TICKET_REPLIED",
    employeeName: "Lisa Amupolo",
    employeeId: "5",
    ticketNumber: "TKT-2601-0010",
    ticketSubject: "Fleet-wide firmware update request",
    customerName: "Johannes Shikundu",
    company: "Namibia Breweries Ltd",
    priority: "MEDIUM",
    category: "SOFTWARE",
    details: "Update schedule shared with customer, rolling deployment plan",
    timestamp: "2026-02-16T14:00:00",
  },

  // David Kapere — Junior Technician
  {
    id: "act-050",
    type: "TICKET_RESOLVED",
    employeeName: "David Kapere",
    employeeId: "6",
    ticketNumber: "TKT-2601-0013",
    ticketSubject: "SIM card not registering on network",
    customerName: "Lukas Ndjamba",
    company: "TransNamib Holdings",
    priority: "MEDIUM",
    category: "CONNECTIVITY",
    details: "SIM card replaced and APN configured",
    timestamp: "2026-02-24T10:30:00",
  },
  {
    id: "act-051",
    type: "TICKET_REOPENED",
    employeeName: "David Kapere",
    employeeId: "6",
    ticketNumber: "TKT-2601-0011",
    ticketSubject: "GPS drift issue after installation",
    customerName: "Hans Garoëb",
    company: "Pupkewitz Motors",
    priority: "MEDIUM",
    category: "GPS_DEVICE",
    details: "Customer reported issue recurring after initial fix",
    timestamp: "2026-02-25T09:00:00",
  },
  {
    id: "act-052",
    type: "TICKET_REPLIED",
    employeeName: "David Kapere",
    employeeId: "6",
    ticketNumber: "TKT-2601-0013",
    ticketSubject: "SIM card not registering on network",
    customerName: "Lukas Ndjamba",
    company: "TransNamib Holdings",
    priority: "MEDIUM",
    category: "CONNECTIVITY",
    details: "Scheduled on-site visit for SIM replacement",
    timestamp: "2026-02-23T14:00:00",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _listeners: (() => void)[] = [];

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

export function subscribeToActivities(listener: () => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== listener);
  };
}

export function getActivityLog(): ActivityEntry[] {
  return [...activityLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getActivityLogForEmployee(employeeId: string): ActivityEntry[] {
  return getActivityLog().filter((a) => a.employeeId === employeeId);
}

export function logActivity(entry: Omit<ActivityEntry, "id">): void {
  activityLog.push({
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  });
  notifyListeners();
}

export function getEmployeeTicketMetrics(
  employeeId: string,
  employeeName: string
): EmployeeTicketMetrics {
  const entries = activityLog.filter((a) => a.employeeId === employeeId);

  const assigned = entries.filter((a) => a.type === "TICKET_ASSIGNED").length;
  const resolved = entries.filter((a) => a.type === "TICKET_RESOLVED").length;
  const closed = entries.filter((a) => a.type === "TICKET_CLOSED").length;
  const escalated = entries.filter((a) => a.type === "TICKET_ESCALATED").length;
  const replies = entries.filter((a) => a.type === "TICKET_REPLIED").length;
  const reopened = entries.filter((a) => a.type === "TICKET_REOPENED").length;

  // Simulate resolution time based on assigned → resolved pairs
  const resolvedTickets = entries.filter((a) => a.type === "TICKET_RESOLVED");
  let totalResolutionHours = 0;
  resolvedTickets.forEach((r) => {
    const assignEntry = entries.find(
      (a) =>
        a.type === "TICKET_ASSIGNED" && a.ticketNumber === r.ticketNumber
    );
    if (assignEntry) {
      const diff =
        new Date(r.timestamp).getTime() -
        new Date(assignEntry.timestamp).getTime();
      totalResolutionHours += diff / (1000 * 60 * 60);
    } else {
      totalResolutionHours += 24; // default if no assign record
    }
  });

  // First response time: time between assign and first reply
  const assignedTicketNums = [
    ...new Set(
      entries
        .filter((a) => a.type === "TICKET_ASSIGNED")
        .map((a) => a.ticketNumber)
    ),
  ];
  let totalFirstResponseHours = 0;
  let firstResponseCount = 0;
  assignedTicketNums.forEach((tktNum) => {
    const assign = entries.find(
      (a) => a.type === "TICKET_ASSIGNED" && a.ticketNumber === tktNum
    );
    const firstReply = entries
      .filter(
        (a) => a.type === "TICKET_REPLIED" && a.ticketNumber === tktNum
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )[0];
    if (assign && firstReply) {
      const diff =
        new Date(firstReply.timestamp).getTime() -
        new Date(assign.timestamp).getTime();
      totalFirstResponseHours += diff / (1000 * 60 * 60);
      firstResponseCount++;
    }
  });

  const activeTickets = assigned - resolved - closed;

  return {
    employeeId,
    employeeName,
    ticketsAssigned: assigned,
    ticketsResolved: resolved,
    ticketsClosed: closed,
    ticketsEscalated: escalated,
    totalReplies: replies,
    avgResolutionTimeHours:
      resolved > 0
        ? Math.round((totalResolutionHours / resolved) * 10) / 10
        : 0,
    firstResponseTimeHours:
      firstResponseCount > 0
        ? Math.round((totalFirstResponseHours / firstResponseCount) * 10) / 10
        : 0,
    customerSatisfaction:
      resolved > 0
        ? Math.round((4.0 + (resolved / (resolved + escalated + reopened)) * 1.0) * 10) / 10
        : 0,
    slaComplianceRate:
      assigned > 0
        ? Math.round(((assigned - escalated) / assigned) * 100)
        : 100,
    reopenRate:
      resolved > 0 ? Math.round((reopened / resolved) * 100) : 0,
    activeTickets: Math.max(0, activeTickets),
  };
}

export function getAllEmployeeTicketMetrics(): EmployeeTicketMetrics[] {
  const employeeMap = new Map<string, string>();
  activityLog.forEach((a) => {
    if (!employeeMap.has(a.employeeId)) {
      employeeMap.set(a.employeeId, a.employeeName);
    }
  });

  return Array.from(employeeMap.entries()).map(([id, name]) =>
    getEmployeeTicketMetrics(id, name)
  );
}
