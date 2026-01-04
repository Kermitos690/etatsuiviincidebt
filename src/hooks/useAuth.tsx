import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AuthError,
  AuthResponse,
  AuthTokenResponsePassword,
  PostgrestError,
  Session,
  User,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ============= Types =============
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: {
    theme: "light" | "dark" | "system";
    language: string;
    notifications: boolean;
  };
  last_active_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AppRole = "admin" | "user" | "auditor";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  profileLoading: boolean;
}

interface AuthContextValue {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  profileLoading: boolean;

  // Auth methods
  signIn: (email: string, password: string) => Promise<AuthTokenResponsePassword>;
  signUp: (email: string, password: string, displayName?: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: AuthError | null }>;

  // Profile methods
  updateProfile: (
    updates: Partial<Pick<UserProfile, "display_name" | "avatar_url" | "preferences">>
  ) => Promise<{ data: UserProfile | null; error: PostgrestError | Error | null }>;
  refreshProfile: () => Promise<void>;

  // Role methods
  hasRole: (role: AppRole) => boolean;
  isAdmin: () => boolean;
  isAuditor: () => boolean;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: true,
    profileLoading: false,
  });

  // Prevent duplicate "hydrate" runs across rapid session events.
  const lastHydratedUserIdRef = useRef<string | null>(null);

  // ============= Helpers =============
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (error) {
      // If policies temporarily block reads, do not brick the UI.
      console.error("Error fetching profile:", error);
      return null;
    }

    return (data as UserProfile | null) ?? null;
  }, []);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    if (error) {
      console.error("Error fetching roles:", error);
      return ["user"];
    }

    const roles = (data ?? []).map((r) => r.role as AppRole);
    return roles.length ? roles : ["user"];
  }, []);

  const ensureUserRoleExists = useCallback(async (userId: string) => {
    // IMPORTANT: user may have multiple roles (e.g. admin + user). Never use maybeSingle() here.
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1);

    if (error) {
      console.error("Error checking roles:", error);
      return;
    }

    if ((data ?? []).length > 0) return;

    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: "user" });

    // Duplicate inserts can happen on first boot; treat as success.
    if (insertError && (insertError as any).code !== "23505") {
      console.error("Error creating default role:", insertError);
    }
  }, []);

  const updateLastActive = useCallback(async (userId: string) => {
    try {
      await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
    } catch (error) {
      console.error("Error updating last active:", error);
    }
  }, []);

  // ============= Auth lifecycle (single instance via Provider) =============
  useEffect(() => {
    // Listener first (must stay synchronous)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hydrate profile + roles when user changes
  useEffect(() => {
    const userId = state.user?.id ?? null;

    if (!userId) {
      lastHydratedUserIdRef.current = null;
      setState((prev) => ({ ...prev, profile: null, roles: [], profileLoading: false }));
      return;
    }

    if (lastHydratedUserIdRef.current === userId) return;
    lastHydratedUserIdRef.current = userId;

    let cancelled = false;

    (async () => {
      setState((prev) => ({ ...prev, profileLoading: true }));

      try {
        await ensureUserRoleExists(userId);

        const [profile, roles] = await Promise.all([fetchProfile(userId), fetchRoles(userId)]);

        if (cancelled) return;

        setState((prev) => ({
          ...prev,
          profile,
          roles,
          profileLoading: false,
        }));

        // Best-effort; do not block UI
        updateLastActive(userId);
      } catch (e) {
        console.error("Error hydrating auth state:", e);
        if (!cancelled) {
          setState((prev) => ({ ...prev, profileLoading: false, roles: prev.roles.length ? prev.roles : ["user"] }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.user?.id, ensureUserRoleExists, fetchProfile, fetchRoles, updateLastActive]);

  // ============= Auth Methods =============
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthTokenResponsePassword> => {
      return await supabase.auth.signInWithPassword({ email, password });
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
      const redirectUrl = `${window.location.origin}/`;

      return await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split("@")[0],
          },
        },
      });
    },
    []
  );

  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      lastHydratedUserIdRef.current = null;
      setState({
        user: null,
        session: null,
        profile: null,
        roles: [],
        loading: false,
        profileLoading: false,
      });
    }
    return { error };
  }, []);

  // ============= Profile Methods =============
  const updateProfile = useCallback(
    async (
      updates: Partial<Pick<UserProfile, "display_name" | "avatar_url" | "preferences">>
    ): Promise<{ data: UserProfile | null; error: PostgrestError | Error | null }> => {
      const userId = state.user?.id;
      if (!userId) return { data: null, error: new Error("Not authenticated") };

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (!error && data) {
        setState((prev) => ({ ...prev, profile: data as UserProfile }));
      }

      return { data: (data as UserProfile | null) ?? null, error };
    },
    [state.user?.id]
  );

  const refreshProfile = useCallback(async () => {
    const userId = state.user?.id;
    if (!userId) return;

    const profile = await fetchProfile(userId);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user?.id, fetchProfile]);

  const refreshRoles = useCallback(async () => {
    const userId = state.user?.id;
    if (!userId) return;

    const roles = await fetchRoles(userId);
    setState((prev) => ({ ...prev, roles }));
  }, [state.user?.id, fetchRoles]);

  // ============= Role Helpers =============
  const hasRole = useCallback((role: AppRole) => state.roles.includes(role), [state.roles]);

  const isAdmin = useCallback(() => hasRole("admin"), [hasRole]);

  const isAuditor = useCallback(() => hasRole("auditor") || hasRole("admin"), [hasRole]);

  const value: AuthContextValue = useMemo(
    () => ({
      user: state.user,
      session: state.session,
      profile: state.profile,
      roles: state.roles,
      loading: state.loading,
      profileLoading: state.profileLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      hasRole,
      isAdmin,
      isAuditor,
      refreshRoles,
    }),
    [
      state.user,
      state.session,
      state.profile,
      state.roles,
      state.loading,
      state.profileLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      hasRole,
      isAdmin,
      isAuditor,
      refreshRoles,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
