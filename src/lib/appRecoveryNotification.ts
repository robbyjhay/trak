/**
 * App Recovery system notification.
 *
 * A hardcoded, persistent notification shown at the top of the notification
 * panel for every user. It is deliberately NOT persisted per-user in the
 * database (no duplicate rows): it lives only here in the UI layer.
 *
 * Update the message text here, or remove the single `<RecoveryNotice>`
 * reference in the topbar to retire it entirely.
 */

export const APP_RECOVERY_NOTIFICATION_ID = "app-recovery-v1";

export const APP_RECOVERY_NOTIFICATION_TYPE = "app_recovery";

export const APP_RECOVERY_ICON_PATH =
  "M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6z M9 12l2 2 4-4";

export interface RecoveryNotice {
  id: string;
  type: string;
  text: string;
}

export const APP_RECOVERY_NOTIFICATION: RecoveryNotice = {
  id: APP_RECOVERY_NOTIFICATION_ID,
  type: APP_RECOVERY_NOTIFICATION_TYPE,
  text: "TRAK is back and stable. We apologize for the interruption, which was caused by a database issue. Steps have been taken to prevent it from happening again. The app has also been updated with newer features and improvements. Feel free to check them out.",
};
