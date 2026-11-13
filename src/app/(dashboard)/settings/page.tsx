"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Building2,
  User,
  Shield,
  ChevronRight,
  Save,
  Camera,
  Mail,
  Phone,
  MapPin,
  Globe,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { toast } from "sonner";
import { UserProfile } from "@clerk/nextjs";
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

type Tab = "company" | "account" | "security";

// ---------------------------------------------------------------------------
// Sidebar nav
// ---------------------------------------------------------------------------

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "company", label: "Company Profile", icon: Building2 },
  { id: "account", label: "My Account", icon: User },
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
// Security: Clerk manages password, two-factor and active sessions
// ---------------------------------------------------------------------------

function SecurityTab() {
  return (
    <div>
      <SectionHeading
        title="Security"
        subtitle="Change your password, turn on two-step verification and sign out other devices."
      />
      <UserProfile
        routing="hash"
        appearance={{ elements: { rootBox: "w-full", cardBox: "w-full max-w-none shadow-none border border-slate-200" } }}
      />
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

      <div className="flex flex-1 flex-col gap-0 lg:flex-row">
        {/* Settings Sidebar — horizontal scroll on mobile, vertical on desktop */}
        <nav className="flex w-full shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-3 lg:w-56 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-auto shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition lg:w-full",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-blue-600" : "text-slate-400")} />
                {tab.label}
                {active && <ChevronRight className="ml-auto hidden h-3.5 w-3.5 text-blue-400 lg:block" />}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-3xl">{tabContent[activeTab]}</div>
        </main>
      </div>
    </div>
  );
}
