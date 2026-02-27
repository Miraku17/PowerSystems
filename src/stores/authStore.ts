import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  username: string;
  role: UserRole;
  address?: string;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  // Permission helpers
  isAdmin: () => boolean;
  canEditRecord: (createdById: string | undefined) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),

      // Check if current user is admin
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },

      // Check if current user can edit a record
      // Admin can edit all, regular users can only edit their own
      canEditRecord: (createdById) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return createdById === user.id;
      },
    }),
    {
      name: 'psi-auth',
    }
  )
);

// Selector hooks for common use cases
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useIsAdmin = () => useAuthStore((state) => state.isAdmin());
export const useCanEditRecord = (createdById: string | undefined) =>
  useAuthStore((state) => state.canEditRecord(createdById));
