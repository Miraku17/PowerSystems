import { useEffect } from 'react';
import { useCurrentUser } from '@/stores/authStore';
import { useUsers } from '@/hooks/useSharedQueries';

/**
 * Auto-populates a name + signature field pair with the logged-in user
 * when the form value is still empty.
 *
 * @param setFormData - the store's setFormData function
 * @param nameField   - key for the name field (e.g. "attending_technician")
 * @param sigField    - key for the signature field (e.g. "attending_technician_signature")
 * @param currentValue - the current value of the name field (used to skip if already set)
 */
export function useAutoPopulateUser(
  setFormData: (data: Record<string, any>) => void,
  nameField: string,
  sigField: string,
  currentValue: string
) {
  const currentUser = useCurrentUser();
  const { data: users = [] } = useUsers();

  useEffect(() => {
    if (currentUser && users.length > 0 && !currentValue) {
      const matched = users.find(u => u.id === currentUser.id);
      if (matched) {
        setFormData({
          [nameField]: matched.fullName,
          [sigField]: matched.signature_url || "",
        });
      }
    }
  }, [currentUser, users]);
}
