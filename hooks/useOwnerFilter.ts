import { isDemoOwner, isDemoTenant } from '../lib/supabase';

export const useOwnerFilter = () => {
  const isDemo = isDemoOwner();
  const demoOwnerId = '00000000-0000-0000-0000-000000000001';
  const realOwnerId = '7f6d904a-0de0-4602-aba3-d777f173aef6';

  /**
   * Get the owner_id to filter by
   */
  const getOwnerId = (): string => {
    if (isDemo) {
      return demoOwnerId;
    }
    return realOwnerId;
  };

  /**
   * Check if user can see admin features
   */
  const isOwner = (): boolean => {
    return !isDemoTenant();
  };

  return {
    ownerId: getOwnerId(),
    isOwner: isOwner(),
    isDemo,
    isDemoTenant: isDemoTenant()
  };
};
