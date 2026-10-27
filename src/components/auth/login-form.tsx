"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNext } from "@/lib/safe-next";
import { supabaseBrowser } from "@/lib/supabase/client";

const emailSchema = z.email("That email doesn't look right");

export function LoginForm() {
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(sp.get("error") === "link" ? "That sign-in link has expired or was already used. Send a new one." : null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [sent, setSent] = useState(false);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setErr(null);
    setBusy("email");
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: parsed.data, options: { emailRedirectTo: callback() } });
    setBusy(null);
    if (error) return setErr(linkError(error.code, error.message, error.status));
    setSent(true);
  }

  async function google() {
    setErr(null);
    setBusy("google");
    const { error } = await supabaseBrowser().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) {
      setBusy(null);
      setErr("Google sign-in isn't available right now. Use the email link instead.");
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 text-center" role="status">
          <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
          <p className="mt-3 font-medium">Check your inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Open it on this device.
          </p>
          <Button variant="link" className="mt-2" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <form onSubmit={sendLink} className="mt-6 space-y-3" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(err)}
                aria-describedby={err ? "login-err" : undefined}
                className="h-11"
              />
            </div>
            {err && (
              <p id="login-err" role="alert" className="text-sm text-destructive">
                {err}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={busy !== null}>
              {busy === "email" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
              Email me a sign-in link
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="h-11 w-full" onClick={google} disabled={busy !== null}>
            {busy === "google" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <GoogleIcon />}
            Continue with Google
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// supabase has two different limits that both come back as 429 - say which one it is
function linkError(code: string | undefined, msg: string, status: number | undefined) {
  if (code === "over_email_send_rate_limit") return "We've hit the email limit for this hour (Supabase's built-in mailer only sends a few per hour). Try again later, or use Google.";
  const secs = msg.match(/after (\d+) seconds?/)?.[1];
  if (secs) return `Please wait ${secs} seconds before asking for another link.`;
  if (code === "over_request_rate_limit" || status === 429) return "Too many tries from this device. Wait a few minutes and try again.";
  if (code === "email_address_invalid") return "That email address isn't accepted. Check it and try again.";
  return "We couldn't send the link. Check the address and try again.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}
