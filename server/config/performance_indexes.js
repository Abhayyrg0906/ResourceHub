const db = require('./database');

/**
 * Idempotently ensures all high-performance indexes are created on the database tables.
 */
async function ensurePerformanceIndexes() {
  const indexesToEnsure = [
    {
      table: 'exchange_requests',
      indexName: 'idx_exchange_requests_status',
      columns: '(status)'
    },
    {
      table: 'exchange_requests',
      indexName: 'idx_exchange_requests_res_status',
      columns: '(resource_id, status)'
    },
    {
      table: 'exchange_requests',
      indexName: 'idx_exchange_requests_req_status',
      columns: '(requester_id, status)'
    },
    {
      table: 'users',
      indexName: 'idx_users_role_status',
      columns: '(role, status)'
    },
    {
      table: 'reports',
      indexName: 'idx_reports_entity',
      columns: '(reported_entity_type, reported_entity_id)'
    },
    {
      table: 'resources',
      indexName: 'idx_resources_owner_status',
      columns: '(owner_id, status)'
    },
    {
      table: 'resources',
      indexName: 'idx_resources_status_updated',
      columns: '(status, updated_at)'
    },
    {
      table: 'notifications',
      indexName: 'idx_notifications_recipient_created',
      columns: '(recipient_id, created_at)'
    }
  ];

  try {
    for (const item of indexesToEnsure) {
      const [existing] = await db.query(
        `SELECT COUNT(1) AS count 
         FROM INFORMATION_SCHEMA.STATISTICS 
         WHERE table_schema = DATABASE() 
           AND table_name = ? 
           AND index_name = ?`,
        [item.table, item.indexName]
      );

      if (!existing || existing[0].count === 0) {
        try {
          await db.query(`ALTER TABLE ${item.table} ADD INDEX ${item.indexName} ${item.columns}`);
          console.log(`[Performance] Created index ${item.indexName} on ${item.table} ${item.columns}`);
        } catch (indexErr) {
          // If already exists or concurrent creation, safely ignore
          if (!indexErr.message.includes('Duplicate key name')) {
            console.warn(`[Performance] Notice creating index ${item.indexName}:`, indexErr.message);
          }
        }
      }
    }
    return true;
  } catch (error) {
    console.error('[Performance] Error ensuring performance indexes:', error.message);
    return false;
  }
}

module.exports = {
  ensurePerformanceIndexes
};
