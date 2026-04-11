"use client";

import {
  createBrowserSupabaseClient,
  hasBrowserSupabasePublicEnv,
} from "@/lib/supabase/client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/profile";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSigningOut: boolean;
  supabaseEnabled: boolean;
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const BOOTSTRAP_ADMIN_EMAILS = new Set(["24onair@gmail.com"]);
const AUTH_REQUEST_TIMEOUT_MS = 1800;

function buildBootstrapAdminProfile(user: User, currentProfile: UserProfile | null) {
  const email = user.email?.trim().toLowerCase();
  if (!email || !BOOTSTRAP_ADMIN_EMAILS.has(email)) {
    return currentProfile;
  }

  return {
    id: currentProfile?.id ?? user.id,
    email: currentProfile?.email ?? user.email ?? "",
    name:
      currentProfile?.name ||
      (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "") ||
      user.email ||
      "관리자",
    phone:
      currentProfile?.phone ||
      (typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : ""),
    primarySiteId:
      currentProfile?.primarySiteId ??
      (typeof user.user_metadata?.primary_site_id === "string"
        ? user.user_metadata.primary_site_id
        : null),
    approvalStatus: "approved",
    isAdmin: true,
    createdAt: currentProfile?.createdAt ?? new Date().toISOString(),
    updatedAt: currentProfile?.updatedAt ?? new Date().toISOString(),
  } satisfies UserProfile;
}

async function loadProfile(accessToken: string): Promise<UserProfile | null> {
  try {
    const response = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as { profile?: UserProfile; error?: string };

    if (!response.ok || !payload.profile) {
      return null;
    }

    return payload.profile;
  } catch {
    return null;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseEnabled = hasBrowserSupabasePublicEnv();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled) {
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    let mounted = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!mounted) {
        return;
      }

      setIsLoading(false);
    }, 4000);

    async function syncSessionProfile() {
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        AUTH_REQUEST_TIMEOUT_MS,
        { data: { session: null }, error: null }
      );

      if (!mounted) {
        return;
      }

      const {
        data: { session },
      } = sessionResult;

      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (nextUser && session?.access_token) {
        const nextProfile = await withTimeout(
          loadProfile(session.access_token),
          AUTH_REQUEST_TIMEOUT_MS,
          null
        );
        setProfile(buildBootstrapAdminProfile(nextUser, nextProfile));
      } else {
        setProfile(null);
      }
    }

    async function initialize() {
      try {
        await syncSessionProfile();
      } catch {
        if (!mounted) {
          return;
        }

        setUser(null);
        setProfile(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    const handleWindowFocus = () => {
      void syncSessionProfile().catch(() => {
        if (!mounted) {
          return;
        }

        setUser(null);
        setProfile(null);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleWindowFocus();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser && session?.access_token) {
          const nextProfile = await withTimeout(
            loadProfile(session.access_token),
            AUTH_REQUEST_TIMEOUT_MS,
            null
          );
          setProfile(buildBootstrapAdminProfile(nextUser, nextProfile));
        } else {
          setProfile(null);
        }
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingTimeout);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [supabaseEnabled]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isSigningOut,
      supabaseEnabled,
      getAccessToken: async () => {
        if (!supabaseEnabled) {
          return null;
        }

        try {
          const supabase = createBrowserSupabaseClient();
          const sessionResult = await withTimeout(
            supabase.auth.getSession(),
            AUTH_REQUEST_TIMEOUT_MS,
            { data: { session: null }, error: null }
          );
          const {
            data: { session },
          } = sessionResult;
          return session?.access_token ?? null;
        } catch {
          return null;
        }
      },
      signOut: async () => {
        if (!supabaseEnabled) {
          return;
        }

        setIsSigningOut(true);
        setUser(null);
        setProfile(null);
        setIsLoading(false);

        try {
          const supabase = createBrowserSupabaseClient();
          await Promise.race([
            supabase.auth.signOut(),
            new Promise((resolve) => window.setTimeout(resolve, 1200)),
          ]);
        } catch (error) {
          console.warn("Supabase signOut fallback", error);
        } finally {
          try {
            const storageKeys = Object.keys(window.localStorage);
            for (const key of storageKeys) {
              if (key.includes("-auth-token")) {
                window.localStorage.removeItem(key);
              }
            }
          } catch (storageError) {
            console.warn("Supabase localStorage cleanup fallback", storageError);
          }

          setUser(null);
          setProfile(null);
          setIsLoading(false);
          setIsSigningOut(false);
          window.location.assign("/");
        }
      },
    }),
    [isLoading, isSigningOut, profile, supabaseEnabled, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
