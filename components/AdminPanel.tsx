"use client";

import { useEffect, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Search, Shield, Infinity, RotateCcw, Loader2 } from "lucide-react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

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

export default function AdminPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifyError = (message: string) =>
    toast.error(message, {
      position: "top-right",
      autoClose: 4000,
      theme: "dark",
      transition: Bounce,
    });

  const notifySuccess = (message: string) =>
    toast.success(message, {
      position: "top-right",
      autoClose: 3000,
      theme: "dark",
      transition: Bounce,
    });

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) {
        setListOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

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
        setListOpen(true);
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

  const selectUser = (user: AdminUser) => {
    setSelected(user);
    setQuery(user.email);
    setListOpen(false);
  };

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ToastContainer />
      <header className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Admin · File limits
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Search users by name or email. Default limit is 5.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div ref={searchRef} className="relative space-y-2">
              <label className="text-sm text-muted-foreground">Search users</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Start typing a name or email…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                    setListOpen(true);
                  }}
                  onFocus={() => {
                    if (results.length > 0) setListOpen(true);
                  }}
                  className="pl-9 pr-9"
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {listOpen && query.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg overflow-hidden">
                  {results.length === 0 && !isSearching ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      No users found
                    </p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto py-1">
                      {results.map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/70 transition-colors"
                            onClick={() => selectUser(user)}
                          >
                            {user.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.imageUrl}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                                {(user.firstName?.[0] || user.email[0] || "?").toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {displayName(user)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {user.limitLabel}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selected && (
          <Card className="shadow-md">
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-start gap-3">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                    {(selected.firstName?.[0] || selected.email[0] || "?").toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-base truncate">
                    {displayName(selected)}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selected.email}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {selected.id}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current file limit</p>
                  <p className="text-xl font-semibold">{selected.limitLabel}</p>
                </div>
                {selected.isUnlimited ? (
                  <Infinity className="h-6 w-6 text-primary shrink-0" />
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {!selected.isUnlimited ? (
                  <Button
                    className="flex-1"
                    disabled={isUpdating}
                    onClick={() => setUnlimited(true)}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Infinity className="h-4 w-4 mr-2" />
                    )}
                    Grant unlimited
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isUpdating}
                    onClick={() => setUnlimited(false)}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset to 5
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
