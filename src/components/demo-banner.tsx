import { DEMO_MODE } from "@/lib/demo";

/** Thin strip at the top of every page on the demo site. Renders nothing on the live app. */
export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
      Demo site with sample data. Every company and person here is fictional, and changes are switched off.
    </div>
  );
}
