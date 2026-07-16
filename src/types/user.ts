export interface User {
  id: string;
  fullName: string;
  email: string;
  firstName: string;
  lastName?: string;
  organisationId?: string;
  role?: string | undefined;
}

export interface Organisation {
  id?: string;
  name?: string;
  slug?: string;
  plan?: string;
  suspended?: boolean;
}

export interface InviteToken {
  id: string;
  email: string;
  organisationId: string;
  role: string;
  expiresAt: string;
  usedAt?: string | null;
}

export interface AuthUser extends User {
  accessToken?: string;
}
