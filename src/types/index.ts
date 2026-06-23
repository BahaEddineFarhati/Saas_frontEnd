export interface User {
  id: string;
  fullName: string;
  email: string;
  firstName: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}
