import { getTicketsPageData } from "@/lib/tickets";
import { TicketsBoard } from "./tickets-board";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const data = await getTicketsPageData();

  return (
    <TicketsBoard
      initialTickets={data.tickets}
      customers={data.customers}
      vehicles={data.vehicles}
      agents={data.agents}
    />
  );
}
