"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Infinity, RotateCcw, Loader2, Users, ChevronRight } from "lucide-react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";

type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  permitted_no_of_files: number;
  limitLabel: string;
  isUnlimited: boolean;
};

function displayName(user: AdminUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
}

function Avatar({ user, size }: { user: AdminUser; size: "sm" | "lg" }) {
  const box = size === "sm" ? "size-8 text-xs" : "size-11 text-sm";
  if (user.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.imageUrl} alt="" className={cn(box, "shrink-0 rounded-full object-cover")} />
    );
  }
  return (
    <div className={cn(box, "flex shrink-0 items-center justify-center rounded-full bg-muted font-medium")}>
      {(user.firstName?.[0] || user.email[0] || "?").toUpperCase()}
    </div>
  );
}

function LimitBadge({ user }: { user: AdminUser }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-px text-xs font-medium tabular-nums",
        user.isUnlimited ? "bg-brand-soft text-brand" : "bg-muted text-muted-foreground"
      )}
    >
      {user.isUnlimited && <Infinity className="size-3" />}
      {user.limitLabel}
    </span>
  );
}

export default function AdminPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyError = (message: string) =>
    toast.error(message, {
      position: "top-right",
      autoClose: 4000,
      theme: "light",
      transition: Bounce,
    });

  const notifySuccess = (message: string) =>
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      theme: "light",
      transition: Bounce,
    });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/users?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (!res.ok) {
          notifyError(data.error || "Search failed");
          setResults([]);
          return;
        }
        setResults(data.users ?? []);
      } catch {
        notifyError("Search failed");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const setUnlimited = async (unlimited: boolean) => {
    if (!selected) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, unlimited }),
      });
      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || "Update failed");
        return;
      }
      setSelected(data);
      setResults((prev) =>
        prev.map((u) => (u.id === data.id ? data : u))
      );
      notifySuccess(
        unlimited
          ? "User now has unlimited uploads"
          : "User reset to default limit of 5"
      );
    } catch {
      notifyError("Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const hasQuery = query.trim().length >= 2;

  return (
    <AppShell>
      <ToastContainer />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find a user by name or email and change their upload limit. The default limit is 5 files.
          </p>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 pl-9 pr-9"
                  autoComplete="off"
                  aria-label="Search users"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border bg-card">
                <div className="flex h-9 items-center border-b bg-muted/40 px-4 text-xs font-medium text-muted-foreground">
                  <span className="flex-1">User</span>
                  <span className="w-24 text-right">File limit</span>
                  <span className="w-6" />
                </div>
                {!hasQuery ? (
                  <div className="flex flex-col items-center px-6 py-14 text-center">
                    <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Users className="size-5" />
                    </span>
                    <p className="text-sm font-medium">Search to see users</p>
                    <p className="mt-1 text-sm text-muted-foreground">Type at least two characters.</p>
                  </div>
                ) : isSearching && results.length === 0 ? (
                  <div className="divide-y">
                    {[56, 42, 64].map((w) => (
                      <div key={w} className="flex h-14 animate-pulse items-center gap-3 px-4">
                        <div className="size-8 rounded-full bg-muted" />
                        <div className="h-3 rounded bg-muted" style={{ width: `${w * 0.6}%` }} />
                      </div>
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">No users found</p>
                ) : (
                  <ul className="divide-y">
                    {results.map((user) => {
                      const active = selected?.id === user.id;
                      return (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(user)}
                            aria-current={active ? "true" : undefined}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                              active ? "bg-muted/70" : "hover:bg-muted/40"
                            )}
                          >
                            <Avatar user={user} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{displayName(user)}</span>
                              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                            </span>
                            <span className="w-24 text-right">
                              <LimitBadge user={user} />
                            </span>
                            <ChevronRight className="size-4 w-6 shrink-0 text-muted-foreground/60" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <aside className="rounded-xl border bg-card lg:sticky lg:top-9">
              {selected ? (
                <>
                  <div className="flex items-center gap-3 border-b p-4">
                    <Avatar user={selected} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{displayName(selected)}</p>
                      <p className="truncate text-sm text-muted-foreground">{selected.email}</p>
                    </div>
                  </div>
                  <dl className="space-y-3 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">File limit</dt>
                      <dd><LimitBadge user={selected} /></dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">User ID</dt>
                      <dd className="mt-1 break-all font-mono text-xs">{selected.id}</dd>
                    </div>
                  </dl>
                  <div className="border-t p-4">
                    {!selected.isUnlimited ? (
                      <Button className="w-full" disabled={isUpdating} onClick={() => setUnlimited(true)}>
                        {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <Infinity className="size-4" />}
                        Grant unlimited
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled={isUpdating} onClick={() => setUnlimited(false)}>
                        {isUpdating ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                        Reset to 5
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-5">
                  <p className="text-sm font-medium">No user selected</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick someone from the list to see their limit and change it.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
