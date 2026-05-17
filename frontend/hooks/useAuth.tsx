'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient, User } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  loginWithGoogle: (idToken: string) => Promise<void>;
  devLogin: () => void;  // 개발용 로그인
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check if user is logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        apiClient.setToken(storedToken);
        setState({
          user,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await apiClient.loginWithGoogle(idToken);
    
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    localStorage.setItem('auth_token', response.token);
    apiClient.setToken(response.token);
    
    setState({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    apiClient.setToken(null);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // 개발용 로그인 (OAuth 없이 테스트)
  const devLogin = useCallback(() => {
    const devUser = {
      id: 'dev-user-001',
      email: 'dev@test.com',
      name: 'Dev Tester',
    };
    const devToken = 'dev-token-for-testing';
    
    localStorage.setItem('auth_user', JSON.stringify(devUser));
    localStorage.setItem('auth_token', devToken);
    apiClient.setToken(devToken);
    
    setState({
      user: devUser,
      token: devToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, loginWithGoogle, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
