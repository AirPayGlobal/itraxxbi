// Canonical field lists for the ITRACKERX Vehicle Inspection / Checklist.
// Shared by the form UI and the data hook so keys stay consistent.

export const INSPECTION_TYPES = [
  { value: "NEW_FITMENT", label: "New Fitment" },
  { value: "RE_INSTALLATION", label: "Re-Installation" },
  { value: "DE_INSTALLATION", label: "De-Installation" },
  { value: "REPAIR", label: "Repair" },
  { value: "UPGRADE_ADDON", label: "Upgrade / Add-on" },
] as const;

export type InspectionType = (typeof INSPECTION_TYPES)[number]["value"];

// Pre/Post vehicle condition checks.
export const CONDITION_ITEMS: { key: string; label: string }[] = [
  { key: "vehicle_start", label: "Vehicle Start" },
  { key: "head_lights", label: "Head Lights" },
  { key: "dome_lights", label: "Dome lights" },
  { key: "hooter_horn", label: "Hooter/Horn" },
  { key: "central_locking", label: "Central Locking" },
  { key: "electric_windows", label: "Electric windows" },
  { key: "electric_antenna", label: "Electric antenna" },
  { key: "radio", label: "Radio" },
  { key: "indicators", label: "Indicators" },
  { key: "wipers", label: "Wipers rear and front" },
  { key: "cigarette_lighter", label: "Cigarette Lighter" },
  { key: "hazard_lights", label: "Hazard lights" },
  { key: "air_conditioner", label: "Air-Conditioner" },
  { key: "cluster_warning_lights", label: "Cluster Warning lights" },
];

export const EXTRAS_ITEMS: { key: string; label: string }[] = [
  { key: "front_loader", label: "Front Loader" },
  { key: "usb", label: "USB" },
  { key: "cd_shuttle", label: "CD Shuttle" },
  { key: "amp", label: "AMP" },
  { key: "sub", label: "SUB" },
];

export const ANTI_THEFT_ITEMS: { key: string; label: string }[] = [
  { key: "alarm", label: "Alarm" },
  { key: "immobiliser", label: "Immobiliser" },
  { key: "gear_lock", label: "Gear Lock" },
  { key: "other_tracking", label: "Other Tracking" },
  { key: "trackerx_unit", label: "TrackerX Unit" },
];

export const ACCESSORIES_ITEMS: { key: string; label: string }[] = [
  { key: "canopy", label: "Canopy" },
  { key: "bullbar", label: "Bullbar" },
  { key: "towbar", label: "Towbar" },
  { key: "tent", label: "Tent" },
  { key: "mags", label: "Mags" },
  { key: "spoiler", label: "Spoiler" },
  { key: "spotlights", label: "Spotlights" },
  { key: "rollbar", label: "Rollbar" },
  { key: "car_kit", label: "Car kit" },
];

export type ConditionCheck = { pre: boolean; post: boolean };
export type ConditionChecks = Record<string, ConditionCheck>;
export type BoolMap = Record<string, boolean>;
