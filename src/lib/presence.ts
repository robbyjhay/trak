/**
 * User presence status for the Connect/Messages UI.
 *
 * - "online":  positively confirmed by the active signaling system
 * - "offline": reliably confirmed offline (signaling connected, presence synced, user absent)
 * - "unknown": presence cannot be determined (disconnected, reconnecting, or bootstrap pending)
 */
export type PresenceStatus = "online" | "offline" | "unknown";

/**
 * Determine a user's presence status.
 *
 * @param userId         - the target user's ID
 * @param onlineUsers    - Set of user IDs known to be online via the signaling system
 * @param signalingConnected - whether the current user's WebSocket signaling is connected
 * @param presenceSynced     - whether the initial `online_users` bootstrap has been received
 *
 * Three states produce "unknown":
 * 1. signalingConnected is false (disconnected / reconnecting)
 * 2. signalingConnected is true but presenceSynced is false (connected, bootstrap pending)
 * 3. Both flags true — normal operation, returns "online" or "offline"
 *
 * This prevents a freshly connected client from showing everyone as "Offline"
 * before the server has delivered the authoritative online_users list.
 */
export function getPresenceStatus(
  userId: string,
  onlineUsers: Set<string>,
  signalingConnected: boolean,
  presenceSynced: boolean,
): PresenceStatus {
  if (!signalingConnected || !presenceSynced) return "unknown";
  return onlineUsers.has(userId) ? "online" : "offline";
}
