import pool from "../db/pool";

export async function createNotification(
  userId: string,
  type: string,
  message: string,
) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, message)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, type, message, is_read, created_at::text`,
    [userId, type, message],
  );

  return rows[0];
}

export async function listOwnNotifications(userId: string) {
  const { rows } = await pool.query(
    `SELECT id, user_id, type, message, is_read, created_at::text
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );

  return rows;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
) {
  const { rows } = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, message, is_read, created_at::text`,
    [notificationId, userId],
  );

  return rows[0] ?? null;
}
