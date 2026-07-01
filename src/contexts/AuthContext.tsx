import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  employee_id: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'employee';
  designation_id: string | null;
  work_location: string | null;
  must_change_password: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const profileRef = useRef<Profile | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        profileRef.current = data as Profile;
        setProfile(data as Profile);
      }
      if (error) {
        console.error('Error fetching profile:', error);
      }
    } catch (err) {
      console.error('Profile fetch exception:', err);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          setIsLoading(false);
          initialLoadDone.current = true;
        });
      } else {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          if (!initialLoadDone.current || !profileRef.current) {
            setIsLoading(true);
            fetchProfile(session.user.id).finally(() => {
              setIsLoading(false);
              initialLoadDone.current = true;
            });
          } else {
            // Background silent token refresh - do NOT set isLoading(true)
            fetchProfile(session.user.id);
          }
        } else {
          initialLoadDone.current = false;
          profileRef.current = null;
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    initialLoadDone.current = false;
    profileRef.current = null;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
