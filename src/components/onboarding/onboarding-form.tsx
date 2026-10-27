"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Home, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PrefsFields, type Prefs } from "@/components/profile/prefs-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/fetcher";
import { onboardSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Props = { email: string; hhName: string | null; init: Prefs & { name: string } };

export function OnboardingForm({ email, hhName, init }: Props) {
  const router = useRouter();
  // someone arriving from an invite link already has a household - skip that step
  const steps = hhName ? (["you", "prefs"] as const) : (["you", "home", "prefs"] as const);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(init.name || email.split("@")[0]);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [hname, setHname] = useState("");
  const [code, setCode] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({ allergens: init.allergens, diet: init.diet, alcohol_ok: init.alcohol_ok });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cur = steps[step];

  function nextStep() {
    setErr(null);
    if (cur === "you" && !name.trim()) return setErr("Tell us what to call you.");
    if (cur === "home" && mode === "create" && !hname.trim()) return setErr("Give your household a name — like “Flat 4B” or “Sharma family”.");
    if (cur === "home" && mode === "join" && !/^[a-f0-9]{8}$/i.test(code.trim())) return setErr("Invite codes are 8 characters, like 3fa9c210.");
    setStep((s) => s + 1);
  }

  async function finish() {
    const payload = {
      name,
      ...prefs,
      hh: hhName ? { mode: "keep" as const } : mode === "create" ? { mode: "create" as const, name: hname } : { mode: "join" as const, code },
    };
    const parsed = onboardSchema.safeParse(payload);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setBusy(true);
    setErr(null);
    try {
      await api("/api/onboarding", { method: "POST", json: parsed.data });
      toast.success("You're all set. Let's fill that pantry!");
      router.replace("/home");
      router.refresh();
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}>
            <span className="sr-only">
              Step {i + 1} of {steps.length}
              {i === step ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={cur} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
          {cur === "you" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-semibold">Hi there 👋</h1>
                <p className="text-sm text-muted-foreground">Let&apos;s set up your kitchen. Takes under a minute.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">What should we call you?</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" className="h-11" maxLength={60} />
              </div>
              {hhName && (
                <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                  You&apos;re joining <strong>{hhName}</strong>.
                </p>
              )}
            </div>
          )}

          {cur === "home" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">Your household</h2>
                <p className="text-sm text-muted-foreground">Everyone in a household shares one pantry and shopping list.</p>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Household">
                {(
                  [
                    ["create", Home, "Start a new one"],
                    ["join", Users, "Join with a code"],
                  ] as const
                ).map(([m, Icon, label]) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={cn("flex flex-col items-start gap-2 rounded-2xl border p-4 text-left text-sm font-medium", mode === m ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted")}
                  >
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              {mode === "create" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="hname">Household name</Label>
                  <Input id="hname" placeholder="Flat 4B, Sharma family…" value={hname} onChange={(e) => setHname(e.target.value)} className="h-11" maxLength={60} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="code">Invite code</Label>
                  <Input id="code" placeholder="3fa9c210" value={code} onChange={(e) => setCode(e.target.value)} className="h-11 font-mono tracking-widest" maxLength={8} autoCapitalize="none" />
                  <p className="text-xs text-muted-foreground">Find it in Settings → Household on a housemate&apos;s phone.</p>
                </div>
              )}
            </div>
          )}

          {cur === "prefs" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">Food preferences</h2>
                <p className="text-sm text-muted-foreground">Used to flag allergens and pick recipes you&apos;ll actually eat.</p>
              </div>
              <PrefsFields value={prefs} onChange={setPrefs} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {err && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {err}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || busy} className={cn(step === 0 && "invisible")}>
          <ArrowLeft aria-hidden="true" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={nextStep} size="lg" className="h-11 px-5">
            Continue <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={finish} size="lg" className="h-11 px-5" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />} Finish setup
          </Button>
        )}
      </div>
    </div>
  );
}
