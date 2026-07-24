"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { insforge } from '@/lib/insforge';

interface AuthContextType {
  user: any | null;
  session: any | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper: enrich the auth user with the public.users profile (role, cafeId, fullName)
  const enrichUser = async (authUser: any) => {
    if (!authUser?.id) return null;
    console.log('[Auth] enrichUser called with authUser:', authUser);
    const { data: profile, error: profileError } = await insforge.database
      .from('users')
      .select('id, email, full_name, role, cafe_id, is_active')
      .eq('id', authUser.id)
      .maybeSingle();
    if (profileError) {
      console.error('[Auth] Error loading user profile:', profileError);
    }
    console.log('[Auth] profile result:', { profile, profileError });
    const enriched = {
      ...authUser,
      id: authUser.id,
      email: authUser.email,
      fullName: profile?.full_name ?? authUser.metadata?.fullName ?? authUser.email,
      role: (profile?.role as 'worker' | 'admin') ?? authUser.metadata?.role ?? 'worker',
      cafeId: profile?.cafe_id ?? authUser.metadata?.cafeId ?? null,
      isActive: profile?.is_active ?? true,
    };
    console.log('[Auth] enrichUser result:', { authId: authUser.id, profile, enriched, cafeIdType: typeof enriched.cafeId });
    return enriched;
  };

  // Check current user on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await insforge.auth.getCurrentUser();
        if (error) {
          // Don't log "No refresh token" as an error, that just means no active session
          if (!error.message?.includes('No refresh token')) {
            console.error('Error checking session:', error);
          }
          setUser(null);
          setSession(null);
          return;
        }
        const enriched = await enrichUser(data.user);
        setUser(enriched);
        // setSession just to keep the state shape; adjust if needed later
        setSession(data.user);
        setAuthError(null);
      } catch (error: any) {
        // Don't log "No refresh token" as an unexpected error either
        if (!error.message?.includes('No refresh token')) {
          console.error('Unexpected error checking session:', error);
          setAuthError('AUTH_ERROR');
        }
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    insforge.auth.onAuthStateChange(
      // @ts-expect-error: Auth callback type handling
      async (event: string, authSession: any) => {
        console.log('Auth state change:', event);
        if (authSession?.user) {
          const enriched = await enrichUser(authSession.user);
          setUser(enriched);
        } else {
          setUser(null);
        }
        setSession(authSession);
        if (event === 'SIGNED_IN') {
          setAuthError(null);
        }
        if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    // Cleanup not needed for now; adjust based on SDK usage
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Map known error shapes to a stable code
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
          throw new Error('INVALID_CREDENTIALS');
        }
        throw error;
      }

      if (!data?.user) {
        throw new Error('No user returned from sign in');
      }

      const enriched = await enrichUser(data.user);
      setUser(enriched);
      setSession(data);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await insforge.auth.signOut();
      setUser(null);
      setSession(null);
      setAuthError(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    signIn,
    signOut,
    loading,
    authError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export { AuthProvider };
