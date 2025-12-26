import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// ============= Types =============
export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
  };
  last_active_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type AppRole = 'admin' | 'user' | 'auditor';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  loading: boolean;
  profileLoading: boolean;
}

// ============= Hook =============
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: true,
    profileLoading: false,
  });

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, profileLoading: true }));
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return profile as UserProfile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Fetch user roles
  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        return ['user'];
      }

      return roles?.map(r => r.role as AppRole) || ['user'];
    } catch (error) {
      console.error('Error fetching roles:', error);
      return ['user'];
    }
  }, []);

  // Update last active timestamp
  const updateLastActive = useCallback(async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }));

        // Fetch profile and roles after auth state change
        if (session?.user) {
          setTimeout(async () => {
            const [profile, roles] = await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id),
            ]);

            setState(prev => ({
              ...prev,
              profile,
              roles,
              profileLoading: false,
            }));

            // Update last active
            updateLastActive(session.user.id);
          }, 0);
        } else {
          setState(prev => ({
            ...prev,
            profile: null,
            roles: [],
            profileLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));

      if (session?.user) {
        Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]).then(([profile, roles]) => {
          setState(prev => ({
            ...prev,
            profile,
            roles,
            profileLoading: false,
          }));
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRoles, updateLastActive]);

  // ============= Auth Methods =============
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
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
  };

  // ============= Profile Methods =============
  const updateProfile = async (updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'preferences'>>) => {
    if (!state.user) {
      return { error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.user.id)
      .select()
      .single();

    if (!error && data) {
      setState(prev => ({ ...prev, profile: data as UserProfile }));
    }

    return { data, error };
  };

  // ============= Role Helpers =============
  const hasRole = (role: AppRole): boolean => {
    return state.roles.includes(role);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isAuditor = (): boolean => {
    return hasRole('auditor') || hasRole('admin');
  };

  // ============= Refresh Methods =============
  const refreshProfile = async () => {
    if (!state.user) return;
    
    const profile = await fetchProfile(state.user.id);
    if (profile) {
      setState(prev => ({ ...prev, profile }));
    }
  };

  const refreshRoles = async () => {
    if (!state.user) return;
    
    const roles = await fetchRoles(state.user.id);
    setState(prev => ({ ...prev, roles }));
  };

  return {
    // State
    user: state.user,
    session: state.session,
    profile: state.profile,
    roles: state.roles,
    loading: state.loading,
    profileLoading: state.profileLoading,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    
    // Profile methods
    updateProfile,
    refreshProfile,
    
    // Role methods
    hasRole,
    isAdmin,
    isAuditor,
    refreshRoles,
  };
}
