const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');

async function migrate() {
    console.log('Running M13 database migrations...');

    const createConversations = `
    CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_id INT NOT NULL,
        transaction_id INT NULL,
        participant1_id INT NOT NULL,
        participant2_id INT NOT NULL,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (transaction_id) REFERENCES exchange_requests(id) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (participant1_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (participant2_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

        UNIQUE KEY uq_conv_res_participants (resource_id, participant1_id, participant2_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createMessages = `
    CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_id INT NOT NULL,
        message_text TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.query(createConversations);
    await db.query(createMessages);

    // Create indexes safely if not existing
    const [convIndexes] = await db.query('SHOW INDEX FROM conversations');
    const existingConvIndexes = new Set(convIndexes.map(i => i.Key_name));

    if (!existingConvIndexes.has('idx_conversations_p1_last_msg')) {
        await db.query('CREATE INDEX idx_conversations_p1_last_msg ON conversations(participant1_id, last_message_at)');
    }
    if (!existingConvIndexes.has('idx_conversations_p2_last_msg')) {
        await db.query('CREATE INDEX idx_conversations_p2_last_msg ON conversations(participant2_id, last_message_at)');
    }
    if (!existingConvIndexes.has('idx_conversations_transaction')) {
        await db.query('CREATE INDEX idx_conversations_transaction ON conversations(transaction_id)');
    }

    const [msgIndexes] = await db.query('SHOW INDEX FROM messages');
    const existingMsgIndexes = new Set(msgIndexes.map(i => i.Key_name));

    if (!existingMsgIndexes.has('idx_messages_conv_created')) {
        await db.query('CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at)');
    }
    if (!existingMsgIndexes.has('idx_messages_conv_read')) {
        await db.query('CREATE INDEX idx_messages_conv_read ON messages(conversation_id, is_read)');
    }

    console.log('M13 migrations executed successfully!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
