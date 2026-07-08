export interface User {
  id: string;
  fullName: string;
  email: string;
  firstName: string;
  lastName?: string;
  organisationId?: string;
  role?: string | undefined;
}

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
