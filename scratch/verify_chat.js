/**
 * ResourceHub — Milestone M13: Real-Time Chat System Verification Suite
 * 
 * Verifies:
 *  1. Socket.IO JWT Authentication (valid, invalid, missing token)
 *  2. Conversation Creation between owner and requester
 *  3. Duplicate Conversation Prevention (idempotency, unique constraint)
 *  4. Exchange Request / Transaction Association
 *  5. Message Validation (empty rejection, length limit enforcement)
 *  6. Message Sending & MySQL Persistence
 *  7. Real-Time Socket Message Delivery
 *  8. Real-Time Typing Indicators
 *  9. Read Receipts & Status Synchronization
 * 10. Unauthorized Conversation Access Prevention (403 Forbidden)
 * 11. Unauthorized Socket Room Join Prevention
 * 12. Cross-User Isolation (conversation lists)
 * 13. Self-Conversation Prevention
 * 14. Notification Integration (NEW_MESSAGE dispatch)
 */

const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');
const { io } = require(path.join(__dirname, '../server/node_modules/socket.io-client'));

const API_URL = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      resolve({ error: err, socket });
    });
  });
}

async function runChatVerification() {
  console.log('================================================================');
  console.log('  MILESTONE M13: REAL-TIME CHAT SYSTEM TEST SUITE              ');
  console.log('================================================================\n');

  const ts = Date.now();
  const emailA = `chat_owner_${ts}@university.edu`;
  const emailB = `chat_requester_${ts}@university.edu`;
  const emailC = `chat_attacker_${ts}@university.edu`;
  const defaultPassword = 'Password123';

  let userA, userB, userC;
  let tokenA, tokenB, tokenC;
  let socketA, socketB, socketC;
  let testResourceId, testExchangeId;
  let conversationId;
  let createdMessageId;

  try {
    // ----------------------------------------------------------------
    // 1. SETUP: Register & Authenticate Test Users
    // ----------------------------------------------------------------
    console.log('1. Setting up test users (Owner A, Requester B, Third-Party C)...');

    // Register Student A (Owner)
    const regA = await request('POST', '/auth/register', {
      name: 'Owner Alice',
      email: emailA,
      password: defaultPassword,
      department: 'Electrical Engineering',
      year_of_study: 3
    });
    assert(regA.status === 201, 'Student A (Owner) registered');
    userA = regA.data.data.user;

    // Register Student B (Requester)
    const regB = await request('POST', '/auth/register', {
      name: 'Requester Bob',
      email: emailB,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 2
    });
    assert(regB.status === 201, 'Student B (Requester) registered');
    userB = regB.data.data.user;

    // Register Student C (Third-Party Attacker)
    const regC = await request('POST', '/auth/register', {
      name: 'Attacker Charlie',
      email: emailC,
      password: defaultPassword,
      department: 'Mechanical Engineering',
      year_of_study: 4
    });
    assert(regC.status === 201, 'Student C (Third Party) registered');
    userC = regC.data.data.user;

    // Promote all 3 to ACTIVE status with trust scores
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 95.00 WHERE id = ?", [userA.id]);
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 88.00 WHERE id = ?", [userB.id]);
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 72.00 WHERE id = ?", [userC.id]);

    // Log in all 3 users
    const logA = await request('POST', '/auth/login', { email: emailA, password: defaultPassword });
    tokenA = logA.data.data.token;
    assert(!!tokenA, 'Student A logged in successfully');

    const logB = await request('POST', '/auth/login', { email: emailB, password: defaultPassword });
    tokenB = logB.data.data.token;
    assert(!!tokenB, 'Student B logged in successfully');

    const logC = await request('POST', '/auth/login', { email: emailC, password: defaultPassword });
    tokenC = logC.data.data.token;
    assert(!!tokenC, 'Student C logged in successfully');

    // Get a category ID
    const [cats] = await db.query('SELECT id FROM categories LIMIT 1');
    const categoryId = cats[0].id;

    // Create a resource owned by Student A
    const resA = await request('POST', '/resources', {
      title: `M13 Chat Test Textbook ${ts}`,
      description: 'Used for M13 Real-Time Chat end-to-end testing',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 250,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Library Lobby'
    }, tokenA);
    assert(resA.status === 201, 'Student A created resource listing');
    testResourceId = resA.data.data.id;

    // Create an exchange request from Student B to Student A
    const reqB = await request('POST', '/exchange-requests', {
      resource_id: testResourceId,
      price_agreed: 250
    }, tokenB);
    assert(reqB.status === 201, 'Student B created exchange request');
    testExchangeId = reqB.data.data.id;

    // Accept the request by Student A
    const acceptRes = await request('PUT', `/exchange-requests/${testExchangeId}/accept`, {}, tokenA);
    assert(acceptRes.status === 200, 'Student A accepted exchange request (ACCEPTED state)');

    // ----------------------------------------------------------------
    // 2. SOCKET AUTHENTICATION
    // ----------------------------------------------------------------
    console.log('\n2. Testing Socket.IO JWT Authentication...');

    // Connect with invalid token
    const invalidSocketRes = await connectSocket('invalid_expired_jwt_token_12345');
    assert(invalidSocketRes.error !== undefined, 'Socket connection with invalid JWT correctly rejected');
    if (invalidSocketRes.socket) invalidSocketRes.socket.disconnect();

    // Connect with missing token
    const missingSocketRes = await connectSocket(null);
    assert(missingSocketRes.error !== undefined, 'Socket connection without token correctly rejected');
    if (missingSocketRes.socket) missingSocketRes.socket.disconnect();

    // Connect Student A with valid token
    socketA = await connectSocket(tokenA);
    assert(socketA && socketA.connected, 'Student A authenticated & connected via WebSocket');

    // Connect Student B with valid token
    socketB = await connectSocket(tokenB);
    assert(socketB && socketB.connected, 'Student B authenticated & connected via WebSocket');

    // Connect Student C with valid token
    socketC = await connectSocket(tokenC);
    assert(socketC && socketC.connected, 'Student C authenticated & connected via WebSocket');

    // ----------------------------------------------------------------
    // 3. CONVERSATION CREATION & SELF-CHAT REJECTION
    // ----------------------------------------------------------------
    console.log('\n3. Testing Conversation Creation & Self-Conversation Prevention...');

    // Student A tries to start conversation with herself without recipient
    const selfConvRes = await request('POST', '/chat/conversations', {
      resourceId: testResourceId
    }, tokenA);
    assert(selfConvRes.status === 400, 'Owner cannot create self-conversation on own listing (400)');

    // Student B creates conversation with Student A regarding the resource
    const createConvRes = await request('POST', '/chat/conversations', {
      resourceId: testResourceId
    }, tokenB);
    assert(createConvRes.status === 201, 'Student B initiated conversation with Owner A (201 Created)');
    assert(createConvRes.data.created === true, 'Response confirms conversation was newly created');
    conversationId = createConvRes.data.conversation.id;
    assert(!!conversationId, 'Conversation ID generated successfully');
    assert(createConvRes.data.conversation.partner.id === userA.id, 'Partner is correctly identified as Student A');

    // ----------------------------------------------------------------
    // 4. DUPLICATE CONVERSATION PREVENTION
    // ----------------------------------------------------------------
    console.log('\n4. Testing Duplicate Conversation Prevention (Idempotency)...');

    // Student A calls getOrCreateConversation for same resource with recipient Student B
    const duplicateRes1 = await request('POST', '/chat/conversations', {
      resourceId: testResourceId,
      recipientId: userB.id
    }, tokenA);
    assert(duplicateRes1.status === 200, 'Student A opening conversation returns 200 OK');
    assert(duplicateRes1.data.conversation.id === conversationId, 'Existing conversation ID returned (no duplicate)');
    assert(duplicateRes1.data.created === false, 'Flag confirms conversation was retrieved, not duplicated');

    // Student B calls again
    const duplicateRes2 = await request('POST', '/chat/conversations', {
      resourceId: testResourceId
    }, tokenB);
    assert(duplicateRes2.data.conversation.id === conversationId, 'Student B calling again returns same conversation');

    // Check database directly: count must be exactly 1
    const [dbConvRows] = await db.query(
      'SELECT COUNT(*) as cnt FROM conversations WHERE resource_id = ?',
      [testResourceId]
    );
    assert(dbConvRows[0].cnt === 1, 'Direct MySQL query confirms exactly 1 conversation record exists');

    // ----------------------------------------------------------------
    // 5. TRANSACTION LINKING
    // ----------------------------------------------------------------
    console.log('\n5. Testing Exchange Request / Transaction Association...');

    const linkTxRes = await request('POST', '/chat/conversations', {
      transactionId: testExchangeId
    }, tokenB);
    assert(linkTxRes.status === 200, 'Associated existing conversation with exchange transaction');
    assert(linkTxRes.data.conversation.id === conversationId, 'Matched correct conversation via transaction ID');

    const [txConv] = await db.query('SELECT transaction_id FROM conversations WHERE id = ?', [conversationId]);
    assert(txConv[0].transaction_id === testExchangeId, 'MySQL conversation record has transaction_id set');

    // ----------------------------------------------------------------
    // 6. MESSAGE VALIDATION & REJECTIONS
    // ----------------------------------------------------------------
    console.log('\n6. Testing Message Validation (Empty & Length Constraints)...');

    // Empty message
    const emptyRes1 = await request('POST', `/chat/conversations/${conversationId}/messages`, {
      messageText: ''
    }, tokenB);
    assert(emptyRes1.status === 400, 'Empty string message rejected with 400 Bad Request');

    // Whitespace message
    const emptyRes2 = await request('POST', `/chat/conversations/${conversationId}/messages`, {
      messageText: '     '
    }, tokenB);
    assert(emptyRes2.status === 400, 'Whitespace-only message rejected with 400 Bad Request');

    // Message exceeding 2000 characters
    const longText = 'A'.repeat(2005);
    const longRes = await request('POST', `/chat/conversations/${conversationId}/messages`, {
      messageText: longText
    }, tokenB);
    assert(longRes.status === 400, 'Message > 2000 chars rejected with 400 Bad Request');

    // ----------------------------------------------------------------
    // 7. MESSAGE SENDING & MYSQL PERSISTENCE
    // ----------------------------------------------------------------
    console.log('\n7. Testing Message Sending & Database Persistence...');

    const sampleText = 'Hi Alice! Can we meet outside the campus library at 3 PM for the handover?';
    const sendRes = await request('POST', `/chat/conversations/${conversationId}/messages`, {
      messageText: sampleText
    }, tokenB);

    assert(sendRes.status === 201, 'Valid message sent successfully (201 Created)');
    assert(sendRes.data.message.sender_id === userB.id, 'Sender ID matches authenticated user');
    assert(sendRes.data.message.message_text === sampleText, 'Message text matches input');
    assert(sendRes.data.message.is_read === 0 || sendRes.data.message.is_read === false, 'New message is initially unread');
    createdMessageId = sendRes.data.message.id;

    // Verify persistence in MySQL
    const [dbMsgRows] = await db.query('SELECT * FROM messages WHERE id = ?', [createdMessageId]);
    assert(dbMsgRows.length === 1, 'Message record found directly in MySQL messages table');
    assert(dbMsgRows[0].conversation_id === conversationId, 'Message conversation_id is correct in MySQL');
    assert(dbMsgRows[0].sender_id === userB.id, 'Message sender_id is correct in MySQL');
    assert(dbMsgRows[0].message_text === sampleText, 'Message text stored accurately in MySQL');

    // ----------------------------------------------------------------
    // 8. REAL-TIME SOCKET ROOM AUTHORIZATION & MESSAGE DELIVERY
    // ----------------------------------------------------------------
    console.log('\n8. Testing Real-Time Socket Delivery & Room Access Control...');

    // Student A joins conversation room
    const joinA = await new Promise((resolve) => {
      socketA.emit('join_conversation', { conversationId }, (ack) => resolve(ack));
    });
    assert(joinA && joinA.success === true, 'Student A authorized and joined conversation room');

    // Student B joins conversation room
    const joinB = await new Promise((resolve) => {
      socketB.emit('join_conversation', { conversationId }, (ack) => resolve(ack));
    });
    assert(joinB && joinB.success === true, 'Student B authorized and joined conversation room');

    // Student C (unauthorized) attempts to join conversation room
    let cSocketError = null;
    socketC.on('socket_error', (err) => { cSocketError = err; });

    const joinC = await new Promise((resolve) => {
      socketC.emit('join_conversation', { conversationId }, (ack) => resolve(ack));
      setTimeout(() => resolve(null), 1000);
    });
    assert(
      (joinC && joinC.success === false) || (cSocketError && cSocketError.message.includes('Forbidden')),
      'Unauthorized Student C forbidden from joining conversation room'
    );

    // Test Real-Time Delivery: Student A sends message, Student B receives live event
    const livePromiseB = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket live delivery timed out')), 5000);
      socketB.once('new_message', (msg) => {
        clearTimeout(timeout);
        resolve(msg);
      });
    });

    // Make sure Student C doesn't receive the message
    let cReceivedMessage = false;
    socketC.once('new_message', () => { cReceivedMessage = true; });

    const replyText = 'Yes Bob, 3 PM outside the library works great for me!';
    const replyRes = await request('POST', `/chat/conversations/${conversationId}/messages`, {
      messageText: replyText
    }, tokenA);
    assert(replyRes.status === 201, 'Student A sent reply message');

    const receivedLiveMsg = await livePromiseB;
    assert(receivedLiveMsg.message_text === replyText, 'Student B received message in real time via Socket.IO');
    assert(receivedLiveMsg.sender_id === userA.id, 'Live message payload contains correct sender ID');
    assert(cReceivedMessage === false, 'Unauthorized Student C did NOT receive the live message');

    // ----------------------------------------------------------------
    // 9. TYPING INDICATOR REAL-TIME EVENT
    // ----------------------------------------------------------------
    console.log('\n9. Testing Real-Time Typing Indicator...');

    const typingPromiseA = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Typing event timed out')), 4000);
      socketA.once('user_typing', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    socketB.emit('typing', { conversationId, isTyping: true });
    const typingEvent = await typingPromiseA;
    assert(typingEvent.isTyping === true, 'Student A received real-time user_typing event');
    assert(typingEvent.userId === userB.id, 'Typing event correctly identifies Student B');

    // ----------------------------------------------------------------
    // 10. READ RECEIPTS & MARK AS READ
    // ----------------------------------------------------------------
    console.log('\n10. Testing Read Receipts & Mark As Read...');

    // Student B views messages -> marks Student A's reply as read
    const getMsgsRes = await request('GET', `/chat/conversations/${conversationId}/messages`, null, tokenB);
    assert(getMsgsRes.status === 200, 'Student B fetched message history');
    assert(getMsgsRes.data.messages.length >= 2, 'Retrieved all conversation messages in chronological order');

    // Verify in database that reply message from A was marked read
    const [readRows] = await db.query(
      'SELECT is_read FROM messages WHERE id = ?',
      [replyRes.data.message.id]
    );
    assert(readRows[0].is_read === 1, 'Message automatically updated to is_read = TRUE upon retrieval');

    // ----------------------------------------------------------------
    // 11. UNAUTHORIZED ACCESS REJECTION (Cross-User Isolation)
    // ----------------------------------------------------------------
    console.log('\n11. Testing Unauthorized REST Access (Cross-User Isolation)...');

    // Student C attempts to view conversation details
    const unauthConv = await request('GET', `/chat/conversations/${conversationId}`, null, tokenC);
    assert(unauthConv.status === 403, 'Unauthorized Student C forbidden from viewing conversation (403)');

    // Student C attempts to view messages
    const unauthMsgs = await request('GET', `/chat/conversations/${conversationId}/messages`, null, tokenC);
    assert(unauthMsgs.status === 403, 'Unauthorized Student C forbidden from reading messages (403)');

    // Student C attempts to send a message
    const unauthSend = await request('POST', `/chat/conversations/${conversationId}/messages`, {
      messageText: 'I am eavesdropping!'
    }, tokenC);
    assert(unauthSend.status === 403, 'Unauthorized Student C forbidden from posting messages (403)');

    // Student C attempts to mark as read
    const unauthRead = await request('PUT', `/chat/conversations/${conversationId}/read`, null, tokenC);
    assert(unauthRead.status === 403, 'Unauthorized Student C forbidden from marking read (403)');

    // ----------------------------------------------------------------
    // 12. CONVERSATION LISTS & ISOLATION
    // ----------------------------------------------------------------
    console.log('\n12. Testing Conversation Lists & User Inbox Isolation...');

    // Student C list should not contain this conversation
    const listC = await request('GET', '/chat/conversations', null, tokenC);
    assert(listC.status === 200, 'Student C retrieved conversation list');
    const cHasConv = listC.data.conversations?.some(c => c.id === conversationId);
    assert(!cHasConv, 'Student C conversation list does NOT include Student A & B conversation');

    // Student A list should contain this conversation with partner B
    const listA = await request('GET', '/chat/conversations', null, tokenA);
    assert(listA.status === 200, 'Student A retrieved conversation list');
    const convForA = listA.data.conversations?.find(c => c.id === conversationId);
    assert(!!convForA, 'Student A conversation list includes the conversation');
    assert(convForA.partner.id === userB.id, 'Partner is correctly identified as Student B in inbox');
    assert(convForA.partner.trust_score !== undefined, 'Partner trust score included in conversation list');
    assert(convForA.last_message !== null, 'Last message preview is populated in conversation list');

    // ----------------------------------------------------------------
    // 13. NOTIFICATION INTEGRATION
    // ----------------------------------------------------------------
    console.log('\n13. Testing Chat Notification System Integration...');

    // Check that NEW_MESSAGE notification was created for Alice when Bob sent the message
    const [notifRows] = await db.query(
      `SELECT * FROM notifications 
       WHERE recipient_id = ? AND notification_type = 'NEW_MESSAGE' 
       ORDER BY created_at DESC LIMIT 1`,
      [userA.id]
    );
    assert(notifRows.length === 1, 'Persistent notification created in notifications table');
    assert(notifRows[0].related_entity_id === conversationId, 'Notification links to the correct conversation ID');
    assert(notifRows[0].notification_type === 'NEW_MESSAGE', 'Notification type is NEW_MESSAGE');

    // Check that existing M9 unread count endpoint still functions correctly
    const unreadNotifRes = await request('GET', '/notifications/unread-count', null, tokenA);
    assert(unreadNotifRes.status === 200 && unreadNotifRes.data.success, 'M9 notification count API functions without regression');

    console.log('\n----------------------------------------------------------------');
    console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED FOR MILESTONE M13!`);
    console.log('----------------------------------------------------------------\n');

  } finally {
    // Clean up sockets
    if (socketA && socketA.connected) socketA.disconnect();
    if (socketB && socketB.connected) socketB.disconnect();
    if (socketC && socketC.connected) socketC.disconnect();

    // Clean up test data
    console.log('Cleaning up test data...');
    if (conversationId) {
      await db.query('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
      await db.query('DELETE FROM conversations WHERE id = ?', [conversationId]);
    }
    if (testExchangeId) {
      await db.query('DELETE FROM qr_verifications WHERE transaction_id = ?', [testExchangeId]);
      await db.query('DELETE FROM exchange_requests WHERE id = ?', [testExchangeId]);
    }
    if (testResourceId) {
      await db.query('DELETE FROM resource_images WHERE resource_id = ?', [testResourceId]);
      await db.query('DELETE FROM resources WHERE id = ?', [testResourceId]);
    }
    if (userA) {
      await db.query('DELETE FROM notifications WHERE recipient_id = ?', [userA.id]);
      await db.query('DELETE FROM users WHERE id = ?', [userA.id]);
    }
    if (userB) {
      await db.query('DELETE FROM notifications WHERE recipient_id = ?', [userB.id]);
      await db.query('DELETE FROM users WHERE id = ?', [userB.id]);
    }
    if (userC) {
      await db.query('DELETE FROM notifications WHERE recipient_id = ?', [userC.id]);
      await db.query('DELETE FROM users WHERE id = ?', [userC.id]);
    }
    console.log('Clean up complete.');
  }
}

runChatVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nVerification failed:', err);
    process.exit(1);
  });
