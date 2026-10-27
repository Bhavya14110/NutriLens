"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
// AUTH DISABLED: LogOut icon was for the sign-out button
import { Copy, Crown, Loader2, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ErrorBox, PageHeader } from "@/components/common/states";
import { PrefsFields, type Prefs } from "@/components/profile/prefs-fields";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { qk, useMe } from "@/hooks/data";
import { allergenLabel } from "@/lib/allergens";
import { DIETS } from "@/lib/diet";
import { api } from "@/lib/fetcher";
import { profileSchema } from "@/lib/schemas";
import type { MeRes } from "@/types/api";
import { PushCard } from "./push-card";

export function SettingsScreen() {
  const { data, isLoading, error, refetch } = useMe();
  if (isLoading)
    return (
      <div className="space-y-4" aria-busy="true">
        <PageHeader title="Settings" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-3xl" />
        ))}
      </div>
    );
  if (error || !data) return <ErrorBox error={error} retry={() => refetch()} />;
  return (
    <div className="space-y-5">
      {/* AUTH DISABLED: sub used to be the signed-in email */}
      <PageHeader title="Settings" sub={`Guest mode · using ${data.email}`} />
      <Section title="Your profile" sub="Allergies and diet are shared with your household so scans and recipes work for everyone.">
        <ProfileForm me={data} />
      </Section>
      <Section title="Household" sub="Everyone here shares one pantry and shopping list.">
        <Household me={data} />
      </Section>
      <Section title="Notifications">
        <PushCard />
      </Section>
      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Light, dark or follow your device</p>
          <ThemeToggle />
        </div>
      </Section>
      {/* AUTH DISABLED: nothing to sign out of while the app runs as a guest
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" className="w-full">
          <LogOut aria-hidden="true" /> Sign out
        </Button>
      </form> */}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-5 md:p-6" aria-label={title}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {sub && <p className="mt-0.5 mb-4 text-sm text-muted-foreground">{sub}</p>}
      {!sub && <div className="mb-3" />}
      {children}
    </section>
  );
}

function ProfileForm({ me }: { me: MeRes }) {
  const qc = useQueryClient();
  const [name, setName] = useState(me.profile.name);
  const [prefs, setPrefs] = useState<Prefs>({ allergens: me.profile.allergens, diet: me.profile.diet, alcohol_ok: me.profile.alcohol_ok });
  const [err, setErr] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (v: unknown) => api("/api/me", { method: "PATCH", json: v }),
    onSuccess: () => {
      toast.success("Profile saved");
      // diet/alcohol change what recipes and drinks we pick
      ["me", "useitup", "drinks"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e) => toast.error(e.message),
  });

  function submit() {
    const p = profileSchema.safeParse({ name, ...prefs });
    if (!p.success) return setErr(p.error.issues[0].message);
    setErr(null);
    save.mutate(p.data);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="s-name">Name</Label>
        <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 max-w-sm" maxLength={60} />
      </div>
      <PrefsFields value={prefs} onChange={setPrefs} />
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      <Button onClick={submit} disabled={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Save profile
      </Button>
    </div>
  );
}

function Household({ me }: { me: MeRes }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [hname, setHname] = useState(me.hh?.name ?? "");
  const rename = useMutation({
    mutationFn: () => api("/api/household", { method: "PATCH", json: { name: hname } }),
    onSuccess: () => {
      toast.success("Household renamed");
      void qc.invalidateQueries({ queryKey: qk.me });
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const leave = useMutation({
    mutationFn: () => api("/api/household/leave", { method: "POST" }),
    onSuccess: () => {
      qc.clear();
      router.replace("/onboarding");
      router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  async function share() {
    if (!me.invite) return;
    const text = `Join our kitchen on NutriLens: ${me.invite}`;
    try {
      if (navigator.share) await navigator.share({ title: "Join my NutriLens household", text, url: me.invite });
      else {
        await navigator.clipboard.writeText(me.invite);
        toast.success("Invite link copied");
      }
    } catch {
      // user closed the share sheet - not an error
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="h-name">Household name</Label>
          <Input id="h-name" value={hname} onChange={(e) => setHname(e.target.value)} className="h-11" maxLength={60} />
        </div>
        <Button variant="outline" className="h-11" onClick={() => rename.mutate()} disabled={rename.isPending || !hname.trim() || hname === me.hh?.name}>
          Rename
        </Button>
      </div>

      {me.invite && (
        <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
          <p className="text-sm font-medium">Invite people</p>
          <p className="mt-0.5 text-xs opacity-80">
            Share this link, or give them the code <span className="font-mono font-semibold tracking-widest">{me.hh?.invite_code}</span>.
          </p>
          <div className="mt-3 flex gap-2">
            <Input readOnly value={me.invite} className="h-10 bg-card font-mono text-xs" aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="Copy invite link"
              onClick={() => navigator.clipboard.writeText(me.invite ?? "").then(() => toast.success("Invite link copied"))}
            >
              <Copy aria-hidden="true" />
            </Button>
            <Button size="icon-lg" aria-label="Share invite link" onClick={share}>
              <Share2 aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">Members ({me.mates.length})</p>
        <ul className="divide-y rounded-2xl border">
          {me.mates.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <Avatar>
                <AvatarFallback className="bg-primary/15 font-semibold text-primary">{m.name.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-medium">
                  {m.name}
                  {m.user_id === me.uid && <span className="text-xs text-muted-foreground">(you)</span>}
                  {m.role === "owner" && <Crown className="size-3.5 text-soon" aria-label="Owner" />}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.diet !== "none" && <Badge variant="secondary">{DIETS.find((d) => d.id === m.diet)?.label}</Badge>}
                  {m.allergens.map((a) => (
                    <Badge key={a} variant="outline" className="border-destructive/30 text-destructive">
                      {allergenLabel(a)}
                    </Badge>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" className="text-destructive hover:text-destructive">
            Leave household
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {me.hh?.name}?</DialogTitle>
            <DialogDescription>
              You&apos;ll lose access to its pantry and shopping list. {me.mates.length <= 1 ? "You're the last member, so the household and its data will be deleted." : "Others keep everything."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Stay</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => leave.mutate()} disabled={leave.isPending}>
              {leave.isPending && <Loader2 className="animate-spin" aria-hidden="true" />} Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
