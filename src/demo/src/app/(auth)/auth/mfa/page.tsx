"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api-client";
import { mfaVerifyRequestSchema, type MfaVerifyRequest } from "@/lib/schemas";

export default function MfaPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<MfaVerifyRequest>({
    resolver: zodResolver(mfaVerifyRequestSchema),
    defaultValues: { code: "" },
  });

  async function onSubmit(values: MfaVerifyRequest) {
    setServerError(null);
    try {
      await apiPost("/api/auth/mfa", values);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login");
        return;
      }

      setServerError(
        error instanceof ApiError
          ? error.message
          : "Verification failed. Please try again.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-factor verification</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app. (Mock
          environment: use 000000.)
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              autoComplete="one-time-code"
              className="text-center text-xl tracking-[0.5em]"
              {...form.register("code")}
            />
            {form.formState.errors.code ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.code.message}
              </p>
            ) : null}
          </div>
          {serverError ? (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Verifying…" : "Verify"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
