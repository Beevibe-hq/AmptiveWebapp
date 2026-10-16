import { useEffect, useState } from 'react';
import { getMySupportProfile, hasSupportPage } from '@/lib/api/support';

const SETUP_PATH = '/profile/support-setup';

/*
 * The support page lives on the support profile, not the user record (which always reports
 * support_enabled as false), so the menu has to ask for it. One lookup per user per session,
 * shared by the desktop and mobile menus; cleared when the user finishes setup.
 */
let cached: { userId: string; path: string } | null = null;
let pending: { userId: string; promise: Promise<string> } | null = null;

export function invalidateSupportPageLink() {
  cached = null;
  pending = null;
}

type MenuUser = { user_id?: string; username?: string } | null | undefined;

/** Where "Accept Gifts" should go: the user's own support page if they have one, otherwise setup. */
export function useSupportPageLink(user: MenuUser): string {
  const userId = user?.user_id;
  const [path, setPath] = useState(() => (cached && cached.userId === userId ? cached.path : SETUP_PATH));

  useEffect(() => {
    if (!userId) {
      setPath(SETUP_PATH);
      return;
    }
    if (cached?.userId === userId) {
      setPath(cached.path);
      return;
    }

    let cancelled = false;
    if (!pending || pending.userId !== userId) {
      const promise = getMySupportProfile()
        .then(profile => {
          const slug = profile?.username || user?.username || userId;
          return hasSupportPage(profile) && slug ? `/support/${slug}` : SETUP_PATH;
        })
        .catch(() => SETUP_PATH);
      pending = { userId, promise };
    }
    const request = pending;
    request.promise.then(result => {
      if (pending === request) {
        cached = { userId, path: result };
        pending = null;
      }
      if (!cancelled) setPath(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, user?.username]);

  return path;
}
