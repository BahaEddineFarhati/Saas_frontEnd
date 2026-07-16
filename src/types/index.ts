import type { User } from './user';

export * from './user';
export * from './job';
export * from './candidate';
export * from './notification';
export * from './chat';
export * from './activity';
export * from './dashboard';
export * from './email';
export * from './usage';
export * from './api';

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOrgSuspended: boolean;
  setIsOrgSuspended: (v: boolean) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  updateUserProfile: (userData: Partial<User>, newAccessToken?: string, newRefreshToken?: string) => void;
  updateTokens: (newAccessToken: string, newRefreshToken: string) => void;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}
