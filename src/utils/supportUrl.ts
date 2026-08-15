/**
 * Utility functions for generating Amptive Support profile links.
 * Format rules:
 * - Creator / Default: giftmywork.getamptive.com/username
 * - Business: tipmybusiness.getamptive.com/username
 * - Event Organizer: supportmyevent.getamptive.com/username
 */

export function getSupportDomainPrefix(profileTypeOrObj?: any): string {
  let pType = '';
  if (typeof profileTypeOrObj === 'string') {
    pType = profileTypeOrObj;
  } else if (profileTypeOrObj && typeof profileTypeOrObj === 'object') {
    pType = profileTypeOrObj.profile_type || profileTypeOrObj.support_profile_type || profileTypeOrObj.type || '';
  }
  
  pType = pType.toLowerCase().trim();

  if (pType.includes('business') || pType.includes('biz') || pType === 'company' || pType === 'store' || pType === 'shop') {
    return 'tipmybusiness.getamptive.com';
  }
  if (pType.includes('organizer') || pType.includes('event')) {
    return 'supportmyevent.getamptive.com';
  }
  return 'giftmywork.getamptive.com';
}

export function formatSupportUrl(profileTypeOrObj?: any, slugOrUsername?: string | null): string {
  const domain = getSupportDomainPrefix(profileTypeOrObj);
  let base = slugOrUsername;
  if (!base && profileTypeOrObj && typeof profileTypeOrObj === 'object') {
    base = profileTypeOrObj.username || profileTypeOrObj.user_id;
  }
  const cleanBase = base ? String(base).replace(/^\/+/, '') : '';
  return `https://${domain}/${cleanBase}`;
}
