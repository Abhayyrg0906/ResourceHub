const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');

const API_URL = 'http://127.0.0.1:5000/api';

// Helper for fetch JSON requests
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

async function runTests() {
  console.log('====================================================');
  console.log('  MILESTONE M9: NOTIFICATIONS VERIFICATION SUITE    ');
  console.log('====================================================\n');

  let ownerToken, requesterToken, otherToken;
  let ownerUser, requesterUser, otherUser;
  let testResourceId;
  let requestId1, requestId2, requestId3;
  let notificationIdToTest;

  try {
    // 0. Setup test users
    console.log('1. Setting up test users and resources...');
    
    const ownerEmail = `m9_owner_${Date.now()}@university.edu`;
    const requesterEmail = `m9_requester_${Date.now()}@university.edu`;
    const otherEmail = `m9_other_${Date.now()}@university.edu`;
    const defaultPassword = 'Password123';

    // Register users
    await request('POST', '/auth/register', {
      name: 'M9 Owner',
      email: ownerEmail,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 3
    });

    await request('POST', '/auth/register', {
      name: 'M9 Requester',
      email: requesterEmail,
      password: defaultPassword,
      department: 'Electrical Engineering',
      year_of_study: 2
    });

    await request('POST', '/auth/register', {
      name: 'M9 Other User',
      email: otherEmail,
      password: defaultPassword,
      department: 'Mechanical Engineering',
      year_of_study: 4
    });

    // Login users to acquire tokens & user objects
    const logOwner = await request('POST', '/auth/login', {
      email: ownerEmail,
      password: defaultPassword
    });
    ownerToken = logOwner.data.data.token;
    ownerUser = logOwner.data.data.user;

    const logRequester = await request('POST', '/auth/login', {
      email: requesterEmail,
      password: defaultPassword
    });
    requesterToken = logRequester.data.data.token;
    requesterUser = logRequester.data.data.user;

    const logOther = await request('POST', '/auth/login', {
      email: otherEmail,
      password: defaultPassword
    });
    otherToken = logOther.data.data.token;
    otherUser = logOther.data.data.user;

    console.log(`   [OK] Owner (ID: ${ownerUser.id}), Requester (ID: ${requesterUser.id}), Other (ID: ${otherUser.id}) created.`);

    // Fetch category
    const [categories] = await db.query('SELECT id FROM categories LIMIT 1');
    const categoryId = categories[0].id;

    // Create a resource owned by Owner
    const resCreate = await request('POST', '/resources', {
      title: 'M9 Test Algorithms Book',
      description: 'Introduction to Algorithms 4th Edition in great condition.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'LIKE_NEW',
      meetup_location: 'Campus Library 2nd Floor'
    }, ownerToken);
    testResourceId = resCreate.data.data.id;
    console.log(`   [OK] Created resource ID: ${testResourceId}`);

    // Create 2nd resource for reject test
    const resCreate2 = await request('POST', '/resources', {
      title: 'M9 Test Physics Lab Notebook',
      description: 'Unused lab notebook.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'NEW',
      meetup_location: 'Physics Lab Lobby'
    }, ownerToken);
    const testResourceId2 = resCreate2.data.data.id;

    // Create 3rd resource for cancel test
    const resCreate3 = await request('POST', '/resources', {
      title: 'M9 Test Chemistry Kit',
      description: 'Molecular model kit.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'Chemistry Hall'
    }, ownerToken);
    const testResourceId3 = resCreate3.data.data.id;

    // ----------------------------------------------------
    // TEST A: New exchange request creates owner notification
    // ----------------------------------------------------
    console.log('\n2. Testing [A]: New exchange request creates owner notification (EXCHANGE_REQUEST)...');
    const reqCreate = await request('POST', '/exchange-requests', {
      resource_id: testResourceId
    }, requesterToken);
    requestId1 = reqCreate.data.data.id;
    console.log(`   Exchange request #${requestId1} submitted by requester.`);

    // Fetch owner notifications
    const ownerNotesRes = await request('GET', '/notifications', null, ownerToken);
    const ownerNotes = ownerNotesRes.data.data;
    const reqNote = ownerNotes.find(n => (n.type === 'EXCHANGE_REQUEST' || n.notification_type === 'EXCHANGE_REQUEST') && n.related_id === requestId1);

    if (!reqNote) {
      throw new Error(`TEST A FAILED: Owner did not receive EXCHANGE_REQUEST notification for request #${requestId1}`);
    }
    console.log(`   [PASS] Owner received notification: "${reqNote.title}" - "${reqNote.message}"`);
    notificationIdToTest = reqNote.id;

    // ----------------------------------------------------
    // TEST B: Accepted request creates requester notification
    // ----------------------------------------------------
    console.log('\n3. Testing [B]: Accepted request creates requester notification (REQUEST_ACCEPTED)...');
    await request('PATCH', `/exchange-requests/${requestId1}/accept`, {}, ownerToken);

    const requesterNotesRes = await request('GET', '/notifications', null, requesterToken);
    const requesterNotes = requesterNotesRes.data.data;
    const acceptNote = requesterNotes.find(n => (n.type === 'REQUEST_ACCEPTED' || n.notification_type === 'REQUEST_ACCEPTED') && n.related_id === requestId1);

    if (!acceptNote) {
      throw new Error(`TEST B FAILED: Requester did not receive REQUEST_ACCEPTED notification for request #${requestId1}`);
    }
    console.log(`   [PASS] Requester received notification: "${acceptNote.title}" - "${acceptNote.message}"`);

    // ----------------------------------------------------
    // TEST C: Rejected request creates requester notification
    // ----------------------------------------------------
    console.log('\n4. Testing [C]: Rejected request creates requester notification (REQUEST_REJECTED)...');
    const reqCreate2 = await request('POST', '/exchange-requests', {
      resource_id: testResourceId2
    }, requesterToken);
    requestId2 = reqCreate2.data.data.id;

    await request('PATCH', `/exchange-requests/${requestId2}/reject`, {}, ownerToken);

    const requesterNotesRes2 = await request('GET', '/notifications', null, requesterToken);
    const rejectNote = requesterNotesRes2.data.data.find(n => (n.type === 'REQUEST_REJECTED' || n.notification_type === 'REQUEST_REJECTED') && n.related_id === requestId2);

    if (!rejectNote) {
      throw new Error(`TEST C FAILED: Requester did not receive REQUEST_REJECTED notification for request #${requestId2}`);
    }
    console.log(`   [PASS] Requester received notification: "${rejectNote.title}" - "${rejectNote.message}"`);

    // ----------------------------------------------------
    // TEST C.2: Cancelled request creates owner notification
    // ----------------------------------------------------
    console.log('\n5. Testing [C.2]: Cancelled request creates owner notification (REQUEST_CANCELLED)...');
    const reqCreate3 = await request('POST', '/exchange-requests', {
      resource_id: testResourceId3
    }, requesterToken);
    requestId3 = reqCreate3.data.data.id;

    await request('PATCH', `/exchange-requests/${requestId3}/cancel`, {}, requesterToken);

    const ownerNotesRes2 = await request('GET', '/notifications', null, ownerToken);
    const cancelNote = ownerNotesRes2.data.data.find(n => (n.type === 'REQUEST_CANCELLED' || n.notification_type === 'REQUEST_CANCELLED') && n.related_id === requestId3);

    if (!cancelNote) {
      throw new Error(`TEST C.2 FAILED: Owner did not receive REQUEST_CANCELLED notification for request #${requestId3}`);
    }
    console.log(`   [PASS] Owner received cancellation notification: "${cancelNote.title}"`);

    // ----------------------------------------------------
    // TEST D: Notification list only returns logged-in user's notifications (Isolation)
    // ----------------------------------------------------
    console.log('\n6. Testing [D]: Notification list tenant isolation...');
    const otherNotesRes = await request('GET', '/notifications', null, otherToken);
    if (otherNotesRes.data.data.length !== 0) {
      throw new Error(`TEST D FAILED: Third-party user received notifications that do not belong to them`);
    }
    const allBelongToOwner = ownerNotesRes2.data.data.every(n => n.user_id === ownerUser.id || n.recipient_id === ownerUser.id);
    if (!allBelongToOwner) {
      throw new Error(`TEST D FAILED: Owner notification list contains notifications for another user`);
    }
    console.log('   [PASS] Strict tenant isolation verified. No cross-user notification leakage.');

    // ----------------------------------------------------
    // TEST E: Unread count is correct
    // ----------------------------------------------------
    console.log('\n7. Testing [E]: Unread count calculation...');
    const ownerUnreadRes = await request('GET', '/notifications/unread-count', null, ownerToken);
    const expectedOwnerUnread = ownerNotesRes2.data.data.filter(n => !n.is_read).length;
    if (ownerUnreadRes.data.unread_count !== expectedOwnerUnread) {
      throw new Error(`TEST E FAILED: Expected unread_count ${expectedOwnerUnread}, got ${ownerUnreadRes.data.unread_count}`);
    }
    console.log(`   [PASS] Owner unread count is exact: ${ownerUnreadRes.data.unread_count}`);

    // ----------------------------------------------------
    // TEST F: Single notification can be marked read
    // ----------------------------------------------------
    console.log('\n8. Testing [F]: Single notification marked read (PATCH /api/notifications/:id/read)...');
    const markReadRes = await request('PATCH', `/notifications/${notificationIdToTest}/read`, {}, ownerToken);
    if (!markReadRes.data.success) {
      throw new Error('TEST F FAILED: Mark single notification read returned failure');
    }

    const ownerUnreadAfterOne = await request('GET', '/notifications/unread-count', null, ownerToken);
    if (ownerUnreadAfterOne.data.unread_count !== expectedOwnerUnread - 1) {
      throw new Error(`TEST F FAILED: Unread count did not decrement. Expected ${expectedOwnerUnread - 1}, got ${ownerUnreadAfterOne.data.unread_count}`);
    }
    console.log(`   [PASS] Single notification marked read, unread count correctly decremented.`);

    // ----------------------------------------------------
    // TEST G: Mark all read works
    // ----------------------------------------------------
    console.log('\n9. Testing [G]: Mark all notifications as read (PATCH /api/notifications/read-all)...');
    const markAllRes = await request('PATCH', '/notifications/read-all', {}, ownerToken);
    if (!markAllRes.data.success) {
      throw new Error('TEST G FAILED: Mark all notifications read returned failure');
    }

    const ownerUnreadAfterAll = await request('GET', '/notifications/unread-count', null, ownerToken);
    if (ownerUnreadAfterAll.data.unread_count !== 0) {
      throw new Error(`TEST G FAILED: Unread count should be 0, got ${ownerUnreadAfterAll.data.unread_count}`);
    }
    console.log(`   [PASS] Mark all as read succeeded. Unread count is now 0.`);

    // ----------------------------------------------------
    // TEST H: Unauthorized access is blocked
    // ----------------------------------------------------
    console.log('\n10. Testing [H]: Unauthorized access blocked without JWT...');
    const noAuthRes = await request('GET', '/notifications');
    if (noAuthRes.status !== 401) {
      throw new Error(`TEST H FAILED: Access without token returned status ${noAuthRes.status}, expected 401`);
    }
    console.log('   [PASS] Unauthenticated request blocked with 401.');

    // ----------------------------------------------------
    // TEST I: One user cannot mark another user's notification as read
    // ----------------------------------------------------
    console.log('\n11. Testing [I]: Cross-user modification forbidden...');
    const crossModRes = await request('PATCH', `/notifications/${notificationIdToTest}/read`, {}, requesterToken);
    if (crossModRes.status !== 403 && crossModRes.status !== 404) {
      throw new Error(`TEST I FAILED: Requester modifying owner notification returned status ${crossModRes.status}, expected 403/404`);
    }
    console.log(`   [PASS] Cross-user notification modification blocked with status ${crossModRes.status}.`);

    // ----------------------------------------------------
    // TEST J: Exchange completion requires QR verification
    // ----------------------------------------------------
    console.log('\n12. Testing [J]: Exchange completion still requires QR verification...');
    const compPrematureRes = await request('PATCH', `/exchange-requests/${requestId1}/complete`, {}, ownerToken);
    if (compPrematureRes.status !== 400 || !compPrematureRes.data.message.includes('QR verification is required')) {
      throw new Error(`TEST J FAILED: Premature exchange completion without QR was not rejected properly. Status: ${compPrematureRes.status}`);
    }
    console.log('   [PASS] QR verification requirement strictly preserved.');

    // ----------------------------------------------------
    // TEST QR & Exchange Completion: QR_VERIFIED and EXCHANGE_COMPLETED notifications
    // ----------------------------------------------------
    console.log('\n13. Testing QR Verification & Exchange Completion Notifications...');
    // Owner generates QR
    const qrGenRes = await request('POST', `/exchange-requests/${requestId1}/qr/generate`, {}, ownerToken);
    const verificationToken = qrGenRes.data.data.verification_token;

    // Requester verifies QR
    const qrVerRes = await request('POST', `/exchange-requests/${requestId1}/qr/verify`, {
      verification_token: verificationToken
    }, requesterToken);
    if (!qrVerRes.ok) {
      throw new Error(`QR verification failed: ${JSON.stringify(qrVerRes.data)}`);
    }

    // Check owner received QR_VERIFIED notification
    const ownerNotesAfterQr = await request('GET', '/notifications', null, ownerToken);
    const qrNote = ownerNotesAfterQr.data.data.find(n => (n.type === 'QR_VERIFIED' || n.notification_type === 'QR_VERIFIED') && n.related_id === requestId1);
    if (!qrNote) {
      throw new Error('QR_VERIFIED notification not received by owner');
    }
    console.log(`   [PASS] Owner received QR_VERIFIED notification: "${qrNote.title}" - "${qrNote.message}"`);

    // Owner marks complete
    const compRes = await request('PATCH', `/exchange-requests/${requestId1}/complete`, {}, ownerToken);
    if (!compRes.ok) {
      throw new Error(`Complete request failed: ${JSON.stringify(compRes.data)}`);
    }

    // Check requester received EXCHANGE_COMPLETED notification
    const reqNotesAfterComp = await request('GET', '/notifications', null, requesterToken);
    const compNote = reqNotesAfterComp.data.data.find(n => (n.type === 'EXCHANGE_COMPLETED' || n.notification_type === 'EXCHANGE_COMPLETED') && n.related_id === requestId1);
    if (!compNote) {
      throw new Error('EXCHANGE_COMPLETED notification not received by requester');
    }
    console.log(`   [PASS] Requester received EXCHANGE_COMPLETED notification: "${compNote.title}" - "${compNote.message}"`);

    // ----------------------------------------------------
    // TEST K: Review submission creates REVIEW_RECEIVED notification
    // ----------------------------------------------------
    console.log('\n14. Testing [K]: Review submission creates REVIEW_RECEIVED notification...');
    const revRes = await request('POST', '/reviews', {
      transaction_id: requestId1,
      rating: 5,
      review_text: 'Excellent handover, great condition and very polite student!'
    }, requesterToken);
    if (!revRes.ok) {
      throw new Error(`Review submission failed: ${JSON.stringify(revRes.data)}`);
    }

    // Check owner received REVIEW_RECEIVED notification
    const ownerNotesAfterReview = await request('GET', '/notifications', null, ownerToken);
    const reviewNote = ownerNotesAfterReview.data.data.find(n => (n.type === 'REVIEW_RECEIVED' || n.notification_type === 'REVIEW_RECEIVED') && n.related_id === requestId1);
    if (!reviewNote) {
      throw new Error('TEST K FAILED: Owner did not receive REVIEW_RECEIVED notification');
    }
    console.log(`   [PASS] Owner received REVIEW_RECEIVED notification: "${reviewNote.title}" - "${reviewNote.message}"`);

    console.log('\n====================================================');
    console.log('  ALL M9 TESTS (A THROUGH K) PASSED SUCCESSFULLY!    ');
    console.log('====================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST RUN FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
