import type { Metadata } from "next";
import { ApiSettings } from "@/components/settings/api-settings";

export const metadata: Metadata = { title: "API Settings" };

export default function ApiSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">API Settings</h1>
        <p className="text-sm text-muted-foreground">
          API key management, webhook registration, and quota — Business plan
        </p>
      </div>
      <ApiSettings />
    </div>
  );
}
