import type { Metadata } from "next";
import { UserSettingsView } from "@/components/settings/user-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, security, sell-channel connections, notifications, and data
          rights
        </p>
      </div>
      <UserSettingsView />
    </div>
  );
}
