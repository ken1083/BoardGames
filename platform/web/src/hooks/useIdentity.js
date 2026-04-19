export function getPlayerId() {
  let id = localStorage.getItem('playerId');
  if (!id) {
    // crypto.randomUUID only works in secure contexts (HTTPS or localhost)
    // For LAN play (HTTP), we need a fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    localStorage.setItem('playerId', id);
  }
  return id;
}

export function useIdentity() {
  return getPlayerId();
}
