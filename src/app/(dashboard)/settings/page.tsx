"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Building2,
  User,
  Bell,
  Plug,
  CreditCard,
  Palette,
  Shield,
  ChevronRight,
  Save,
  Camera,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  Plus,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCompanySettings,
  useSaveCompanySettings,
} from "@/lib/hooks/use-company-settings";
import { useImageUpload } from "@/lib/hooks/use-image-upload";
import { useAuth } from "@/components/providers/session-provider";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab =
  | "company"
  | "account"
  | "notifications"
  | "integrations"
  | "billing"
  | "appearance"
  | "security";

// ---------------------------------------------------------------------------
// Sidebar nav
// ---------------------------------------------------------------------------

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "company", label: "Company Profile", icon: Building2 },
  { id: "account", label: "My Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="mt-8 flex justify-end">
      <button
        onClick={onSave}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
      >
        <Save className="h-4 w-4" />
        Save Changes
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Company Profile
// ---------------------------------------------------------------------------

function CompanyTab() {
  const { data: settings } = useCompanySettings();
  const saveSettings = useSaveCompanySettings();
  const { upload: uploadLogo, uploading: logoUploading } =
    useImageUpload("logos");

  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [industry, setIndustry] = useState("fleet");
  const [companySize, setCompanySize] = useState("11-50");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("NA");
  const [address, setAddress] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [currency, setCurrency] = useState("NAD");
  const [timezone, setTimezone] = useState("Africa/Windhoek");

  // Seed the form once the saved settings load.
  useEffect(() => {
    if (!settings) return;
    setLogoUrl(settings.logo_url ?? null);
    setCompanyName(settings.company_name ?? "");
    setRegNumber(settings.reg_number ?? "");
    setIndustry(settings.industry ?? "fleet");
    setCompanySize(settings.company_size ?? "11-50");
    setPrimaryEmail(settings.primary_email ?? "");
    setPhoneNumber(settings.phone_number ?? "");
    setWebsite(settings.website ?? "");
    setCountry(settings.country ?? "NA");
    setAddress(settings.address ?? "");
    setVatNumber(settings.vat_number ?? "");
    setCurrency(settings.currency ?? "NAD");
    setTimezone(settings.timezone ?? "Africa/Windhoek");
  }, [settings]);

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await uploadLogo(file, logoUrl);
      if (!url) return;
      setLogoUrl(url);
      await saveSettings.mutateAsync({ logo_url: url });
      window.dispatchEvent(new Event("company-logo-changed"));
    },
    [uploadLogo, logoUrl, saveSettings]
  );

  const handleRemoveLogo = useCallback(async () => {
    setLogoUrl(null);
    await saveSettings.mutateAsync({ logo_url: null });
    window.dispatchEvent(new Event("company-logo-changed"));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [saveSettings]);

  const handleSave = async () => {
    try {
      await saveSettings.mutateAsync({
        company_name: companyName || null,
        reg_number: regNumber || null,
        industry,
        company_size: companySize,
        primary_email: primaryEmail || null,
        phone_number: phoneNumber || null,
        website: website || null,
        country,
        address: address || null,
        vat_number: vatNumber || null,
        currency,
        timezone,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* toast handled in the hook */
    }
  };

  return (
    <div>
      <SectionHeading
        title="Company Profile"
        subtitle="Update your company's information shown across the platform."
      />

      {/* Logo */}
      <div className="mb-6 flex items-center gap-4">
        {logoUrl ? (
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow">
            <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow">
            IT
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-slate-700">Company Logo</p>
          <p className="mt-0.5 text-xs text-slate-400">PNG, JPG, or SVG up to 2 MB. Used in the sidebar and reports.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={logoUploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
            </button>
            {logoUrl && (
              <button
                onClick={handleRemoveLogo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company Name">
          <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
        <Field label="Registration Number">
          <input className={inputCls} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
        </Field>
        <Field label="Industry">
          <select className={selectCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="fleet">Fleet Management & Telematics</option>
            <option value="logistics">Logistics & Transport</option>
            <option value="construction">Construction</option>
            <option value="mining">Mining</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Company Size">
          <select className={selectCls} value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
            <option value="1-10">1 – 10 employees</option>
            <option value="11-50">11 – 50 employees</option>
            <option value="51-200">51 – 200 employees</option>
            <option value="201+">201+ employees</option>
          </select>
        </Field>
        <Field label="Primary Email">
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={cn(inputCls, "pl-9")} value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} />
          </div>
        </Field>
        <Field label="Phone Number">
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={cn(inputCls, "pl-9")} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
        </Field>
        <Field label="Website">
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={cn(inputCls, "pl-9")} value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </Field>
        <Field label="Country / Region">
          <select className={selectCls} value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="NA">Namibia</option>
            <option value="ZA">South Africa</option>
            <option value="BW">Botswana</option>
            <option value="ZW">Zimbabwe</option>
            <option value="ZM">Zambia</option>
          </select>
        </Field>
        <Field label="Physical Address" hint="Street, city, postal code">
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={cn(inputCls, "pl-9")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </Field>
        <Field label="VAT / Tax Number">
          <input className={inputCls} value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
        </Field>
        <Field label="Default Currency">
          <select className={selectCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="NAD">NAD – Namibian Dollar</option>
            <option value="ZAR">ZAR – South African Rand</option>
            <option value="USD">USD – US Dollar</option>
            <option value="EUR">EUR – Euro</option>
          </select>
        </Field>
        <Field label="Timezone">
          <select className={selectCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="Africa/Windhoek">Africa/Windhoek (WAT +02:00)</option>
            <option value="Africa/Johannesburg">Africa/Johannesburg (SAST +02:00)</option>
            <option value="Africa/Harare">Africa/Harare (CAT +02:00)</option>
            <option value="UTC">UTC +00:00</option>
          </select>
        </Field>
      </div>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Company profile saved successfully.
        </div>
      )}
      <SaveBar onSave={handleSave} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: My Account
// ---------------------------------------------------------------------------

function AccountTab() {
  const { user, profile, refresh } = useAuth();
  const { upload: uploadAvatar, uploading: avatarUploading } =
    useImageUpload("avatars");

  const [saved, setSaved] = useState(false);
  const [firstName, setFirstName] = useState("Admin");
  const [lastName, setLastName] = useState("User");
  const [email, setEmail] = useState("admin@itraxxbi.com.na");
  const [phone, setPhone] = useState("+264 81 000 0000");
  const [language, setLanguage] = useState("en");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Seed from the signed-in profile.
  useEffect(() => {
    if (!profile) return;
    setAvatarUrl(profile.avatar ?? null);
    setEmail(user?.email ?? "");
    if (profile.name) {
      const [first, ...rest] = profile.name.split(" ");
      setFirstName(first);
      setLastName(rest.join(" "));
    }
    if (profile.phone) setPhone(profile.phone);
  }, [profile, user]);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      const url = await uploadAvatar(file, avatarUrl);
      if (!url) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar: url })
        .eq("id", user.id);
      if (error) {
        toast.error(error.message || "Could not save photo.");
        return;
      }
      setAvatarUrl(url);
      await refresh();
      toast.success("Profile photo updated.");
    },
    [uploadAvatar, avatarUrl, user, refresh]
  );

  const handleSave = () => {
    setSaved(true);
    toast.success("Account details updated.");
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <SectionHeading title="My Account" subtitle="Manage your personal profile and preferences." />

      {/* Avatar */}
      <div className="mb-6 flex items-center gap-4">
        {avatarUrl ? (
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow">
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">
            {getInitials(`${firstName} ${lastName}`)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-slate-700">Profile Photo</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {avatarUploading ? "Uploading…" : "Change Photo"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First Name">
          <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last Name">
          <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Email Address">
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={cn(inputCls, "pl-9")} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </Field>
        <Field label="Phone">
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={cn(inputCls, "pl-9")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </Field>
        <Field label="Role">
          <input className={cn(inputCls, "bg-slate-50 text-slate-500")} value="Super Admin" disabled />
        </Field>
        <Field label="Language">
          <select className={selectCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="af">Afrikaans</option>
            <option value="de">German</option>
          </select>
        </Field>
      </div>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Account details updated.
        </div>
      )}
      <SaveBar onSave={handleSave} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Notifications
// ---------------------------------------------------------------------------

type NotifGroup = {
  group: string;
  items: { id: string; label: string; email: boolean; push: boolean; sms: boolean }[];
};

const defaultNotifs: NotifGroup[] = [
  {
    group: "Job Cards",
    items: [
      { id: "jc_assigned", label: "Job card assigned to me", email: true, push: true, sms: false },
      { id: "jc_status", label: "Job card status changed", email: true, push: true, sms: false },
      { id: "jc_overdue", label: "Job card overdue", email: true, push: true, sms: true },
    ],
  },
  {
    group: "Fleet & Tracking",
    items: [
      { id: "gps_offline", label: "GPS device goes offline", email: true, push: true, sms: true },
      { id: "speeding", label: "Speeding alert triggered", email: false, push: true, sms: false },
      { id: "geo_breach", label: "Geofence breach", email: false, push: true, sms: true },
    ],
  },
  {
    group: "Finance",
    items: [
      { id: "inv_due", label: "Invoice due in 3 days", email: true, push: false, sms: false },
      { id: "inv_overdue", label: "Invoice overdue", email: true, push: true, sms: true },
      { id: "payment_rcvd", label: "Payment received", email: true, push: true, sms: false },
    ],
  },
  {
    group: "HR & Leave",
    items: [
      { id: "leave_req", label: "New leave request submitted", email: true, push: true, sms: false },
      { id: "leave_approved", label: "My leave request approved/rejected", email: true, push: true, sms: false },
    ],
  },
];

function NotificationsTab() {
  const [notifs, setNotifs] = useState(defaultNotifs);
  const [saved, setSaved] = useState(false);

  const toggle = (groupIdx: number, itemIdx: number, channel: "email" | "push" | "sms") => {
    setNotifs((prev) => {
      const next = prev.map((g, gi) => ({
        ...g,
        items: g.items.map((item, ii) =>
          gi === groupIdx && ii === itemIdx ? { ...item, [channel]: !item[channel] } : item
        ),
      }));
      return next;
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <SectionHeading
        title="Notifications"
        subtitle="Choose how and when you receive alerts across the platform."
      />

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Event</span>
          <span className="text-center">Email</span>
          <span className="text-center">Push</span>
          <span className="text-center">SMS</span>
        </div>

        {notifs.map((group, gi) => (
          <div key={group.group}>
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {group.group}
            </div>
            {group.items.map((item, ii) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_80px_80px_80px] gap-2 border-b border-slate-100 px-4 py-3 last:border-0"
              >
                <span className="text-sm text-slate-700">{item.label}</span>
                {(["email", "push", "sms"] as const).map((ch) => (
                  <div key={ch} className="flex justify-center">
                    <button
                      onClick={() => toggle(gi, ii, ch)}
                      className={cn(
                        "h-5 w-9 rounded-full transition-colors duration-200",
                        item[ch] ? "bg-blue-500" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mx-0.5",
                          item[ch] ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Notification preferences saved.
        </div>
      )}
      <SaveBar onSave={handleSave} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Integrations
// ---------------------------------------------------------------------------

type Integration = {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  logo: string;
  category: string;
};

const integrations: Integration[] = [
  {
    id: "calamp",
    name: "CalAmp / Orbcomm",
    description: "Live GPS telemetry and ignition events from CalAmp LMU devices.",
    status: "connected",
    logo: "CA",
    category: "GPS & Telematics",
  },
  {
    id: "mix",
    name: "MiX Telematics",
    description: "Driver behaviour scoring and route replay from MiX Fleet Manager.",
    status: "connected",
    logo: "MT",
    category: "GPS & Telematics",
  },
  {
    id: "netstar",
    name: "Netstar",
    description: "Vehicle tracking and stolen vehicle recovery integration.",
    status: "error",
    logo: "NS",
    category: "GPS & Telematics",
  },
  {
    id: "sage",
    name: "Sage Accounting",
    description: "Sync invoices, payments and customers with Sage Business Cloud.",
    status: "disconnected",
    logo: "SG",
    category: "Finance",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Two-way sync of accounts receivable and reconciliation.",
    status: "disconnected",
    logo: "XE",
    category: "Finance",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send job card updates and invoice notifications via WhatsApp.",
    status: "connected",
    logo: "WA",
    category: "Messaging",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Transactional email delivery for invoices and alerts.",
    status: "connected",
    logo: "SG",
    category: "Messaging",
  },
];

const statusConfig = {
  connected: { label: "Connected", color: "text-green-600 bg-green-50 border-green-200", dot: "bg-green-500" },
  disconnected: { label: "Not Connected", color: "text-slate-500 bg-slate-50 border-slate-200", dot: "bg-slate-300" },
  error: { label: "Error", color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500" },
};

const logoColors: Record<string, string> = {
  CA: "bg-blue-600",
  MT: "bg-orange-500",
  NS: "bg-slate-700",
  SG: "bg-green-600",
  XE: "bg-sky-600",
  WA: "bg-green-500",
};

function IntegrationsTab() {
  const categories = [...new Set(integrations.map((i) => i.category))];

  return (
    <div>
      <SectionHeading
        title="Integrations"
        subtitle="Connect iTraxx BI to your GPS providers, accounting software, and messaging services."
      />

      {categories.map((cat) => (
        <div key={cat} className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{cat}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {integrations
              .filter((i) => i.category === cat)
              .map((intg) => {
                const s = statusConfig[intg.status];
                return (
                  <div
                    key={intg.id}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white",
                        logoColors[intg.logo] || "bg-slate-500"
                      )}
                    >
                      {intg.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{intg.name}</p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            s.color
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                          {intg.status === "error" && <AlertTriangle className="h-3 w-3" />}
                          {s.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{intg.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        {intg.status === "connected" ? (
                          <>
                            <button
                              onClick={() => toast.info(`${intg.name} configuration panel — coming soon`)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                            >
                              Configure
                            </button>
                            <button
                              onClick={() => toast.info(`${intg.name} disconnected`)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => toast.info(`Connecting to ${intg.name} — coming soon`)}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
                          >
                            {intg.status === "error" ? "Reconnect" : "Connect"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Billing
// ---------------------------------------------------------------------------

const invoiceHistory = [
  { id: "INV-2601", date: "2026-01-01", amount: "N$ 1,499", status: "PAID" },
  { id: "INV-2512", date: "2025-12-01", amount: "N$ 1,499", status: "PAID" },
  { id: "INV-2511", date: "2025-11-01", amount: "N$ 999", status: "PAID" },
];

function BillingTab() {
  return (
    <div>
      <SectionHeading title="Billing & Plan" subtitle="Manage your subscription, payment method and invoices." />

      {/* Current Plan */}
      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">Current Plan</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">Professional</p>
            <p className="mt-1 text-sm text-slate-600">
              Up to 50 vehicles · Unlimited users · TRAXX AI included
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">N$ 1,499</p>
            <p className="text-sm text-slate-500">per month</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => toast.info("Contact sales for enterprise pricing")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Upgrade to Enterprise
          </button>
          <button
            onClick={() => toast.info("Plan comparison — coming soon")}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            View All Plans
          </button>
        </div>
      </div>

      {/* Usage */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Tracked Vehicles", used: 34, limit: 50, unit: "vehicles" },
          { label: "Active Users", used: 12, limit: null, unit: "users" },
          { label: "Storage Used", used: 4.2, limit: 20, unit: "GB" },
        ].map((u) => (
          <div key={u.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{u.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {u.used}
              {u.limit ? <span className="text-sm font-normal text-slate-400"> / {u.limit} {u.unit}</span> : <span className="text-sm font-normal text-slate-400"> {u.unit}</span>}
            </p>
            {u.limit && (
              <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${(u.used / u.limit) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Payment Method */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Payment Method</h3>
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-14 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-white">
              VISA
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">•••• •••• •••• 4242</p>
              <p className="text-xs text-slate-400">Expires 08 / 2028</p>
            </div>
          </div>
          <button onClick={() => toast.info("Payment method update — coming soon")} className="text-sm font-medium text-blue-600 hover:underline">Update</button>
        </div>
      </div>

      {/* Invoice History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Invoice History</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoiceHistory.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.id}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.amount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toast.success(`Downloading invoice ${inv.id}...`)} className="text-xs font-medium text-blue-600 hover:underline">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Appearance
// ---------------------------------------------------------------------------

const themes = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const accents = [
  { id: "blue", label: "Blue", cls: "bg-blue-500" },
  { id: "indigo", label: "Indigo", cls: "bg-indigo-500" },
  { id: "violet", label: "Violet", cls: "bg-violet-500" },
  { id: "emerald", label: "Emerald", cls: "bg-emerald-500" },
  { id: "orange", label: "Orange", cls: "bg-orange-500" },
];

function AppearanceTab() {
  const [theme, setTheme] = useState("light");
  const [accent, setAccent] = useState("blue");
  const [compact, setCompact] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <SectionHeading title="Appearance" subtitle="Customise how the dashboard looks and feels." />

      <div className="space-y-8">
        {/* Theme */}
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">Theme</p>
          <div className="flex gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex-1 rounded-xl border-2 py-3 text-sm font-medium transition",
                  theme === t.id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accent colour */}
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">Accent Colour</p>
          <div className="flex gap-3">
            {accents.map((a) => (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                title={a.label}
                className={cn(
                  "h-8 w-8 rounded-full transition ring-2 ring-offset-2",
                  a.cls,
                  accent === a.id ? "ring-slate-900" : "ring-transparent"
                )}
              />
            ))}
          </div>
        </div>

        {/* Compact mode */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Compact Mode</p>
            <p className="text-xs text-slate-500">Reduce spacing and padding for denser layouts.</p>
          </div>
          <button
            onClick={() => setCompact((v) => !v)}
            className={cn(
              "h-6 w-11 rounded-full transition-colors duration-200",
              compact ? "bg-blue-500" : "bg-slate-200"
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 mx-0.5",
                compact ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Date format */}
        <Field label="Date Format">
          <select className={selectCls} defaultValue="dd/mm/yyyy">
            <option value="dd/mm/yyyy">DD/MM/YYYY</option>
            <option value="mm/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-mm-dd">YYYY-MM-DD</option>
          </select>
        </Field>
      </div>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Appearance preferences saved.
        </div>
      )}
      <SaveBar
        onSave={() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Security
// ---------------------------------------------------------------------------

const sessions = [
  { id: "1", device: "Chrome on Windows 11", location: "Windhoek, NA", ip: "41.182.xx.xx", current: true, lastSeen: "Now" },
  { id: "2", device: "Safari on iPhone 15", location: "Windhoek, NA", ip: "41.182.xx.xx", current: false, lastSeen: "2 hours ago" },
  { id: "3", device: "Chrome on MacBook", location: "Cape Town, ZA", ip: "197.223.xx.xx", current: false, lastSeen: "3 days ago" },
];

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [twoFa, setTwoFa] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeSessions, setActiveSessions] = useState(sessions);

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (!/\d/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      toast.error("New password must include a number and a symbol.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setSaved(true);
    toast.success("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRevokeSession = (sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session revoked.");
  };

  const handleRevokeAllOther = () => {
    setActiveSessions((prev) => prev.filter((s) => s.current));
    toast.success("All other sessions revoked.");
  };

  return (
    <div>
      <SectionHeading title="Security" subtitle="Manage your password, two-factor authentication and active sessions." />

      {/* Change Password */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">Change Password</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current Password">
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className={cn(inputCls, "pr-10")}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <div /> {/* spacer */}
          <Field label="New Password" hint="Minimum 8 characters, include a number and symbol.">
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className={cn(inputCls, "pr-10")}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password">
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                className={cn(inputCls, "pr-10")}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <button
            onClick={handleUpdatePassword}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Update Password
          </button>
        </div>
        {saved && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Password updated successfully.
          </div>
        )}
      </div>

      {/* 2FA */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Two-Factor Authentication (2FA)</h3>
            <p className="mt-1 text-xs text-slate-500">
              Add an extra layer of security using an authenticator app (TOTP).
            </p>
          </div>
          <button
            onClick={() => setTwoFa((v) => !v)}
            className={cn(
              "h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
              twoFa ? "bg-blue-500" : "bg-slate-200"
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 mx-0.5",
                twoFa ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
        {twoFa && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) to complete setup.
            <div className="mt-2 h-24 w-24 rounded bg-white border border-blue-200 flex items-center justify-center text-slate-400 text-xs">
              QR Code
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Active Sessions</h3>
          <button
            onClick={handleRevokeAllOther}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Revoke All Other Sessions
          </button>
        </div>
        <div className="space-y-3">
          {activeSessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className={cn("h-2 w-2 rounded-full", s.current ? "bg-green-500" : "bg-slate-300")} />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {s.device}
                    {s.current && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.location} · {s.ip} · {s.lastSeen}
                  </p>
                </div>
              </div>
              {!s.current && (
                <button
                  onClick={() => handleRevokeSession(s.id)}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("company");

  const tabContent: Record<Tab, React.ReactNode> = {
    company: <CompanyTab />,
    account: <AccountTab />,
    notifications: <NotificationsTab />,
    integrations: <IntegrationsTab />,
    billing: <BillingTab />,
    appearance: <AppearanceTab />,
    security: <SecurityTab />,
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Manage your company profile, integrations, and preferences.
        </p>
      </div>

      <div className="flex flex-1 gap-0">
        {/* Settings Sidebar */}
        <nav className="w-56 shrink-0 border-r border-slate-200 bg-white p-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-blue-600" : "text-slate-400")} />
                {tab.label}
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-blue-400" />}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl">{tabContent[activeTab]}</div>
        </main>
      </div>
    </div>
  );
}
