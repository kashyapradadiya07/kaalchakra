import { getSubscription } from './db';

/**
 * Server-side helper to check if a user has active Pro access entitlements.
 * Checks the database subscription status and period end date.
 * 
 * @param userId User identifier to check
 */
export async function hasProAccess(userId: string | null | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const subscription = await getSubscription(userId);
    
    if (!subscription) {
      return false;
    }

    // Active status check
    const isActive = subscription.status === 'active';
    
    // Check if period end is in the future
    const currentPeriodEnd = new Date(subscription.current_period_end).getTime();
    const now = Date.now();
    const isNotExpired = currentPeriodEnd > now;

    return isActive && isNotExpired;
  } catch (error) {
    console.error(`Error verifying Pro access for user ${userId}:`, error);
    return false;
  }
}
