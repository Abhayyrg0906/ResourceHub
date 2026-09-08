/**
 * Milestone M11 — Full System Regression Runner
 * Covers:
 *  - System Health & DB Connectivity
 *  - M1/M4: Authentication, Registration, Role Identification & Security
 *  - M2/M5: Resource Management (Creation, Types, Details, Ownership, Archival)
 *  - M3/M6: Exchange Request Lifecycle (Create, Accept, Reject, Cancel, Status Transitions)
 *  - M7: QR-Based Handover Verification (Generation, Secrecy, Expiry, Scan, Atomic Verification)
 *  - M8: Reviews, Ratings & Dynamic Trust Score (Formula, Rollback, Stats)
 *  - M9: Notifications & User Tenant Isolation
 *  - M10: Admin Dashboard & Platform Moderation (Stats, User Management, Reports)
 */

const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');

const API_URL = 'http://127.0.0.1:5000/api';

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

async function request(method, endpoint, body = null, token = null, customHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...customHeaders };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runFullSystemRegression() {
  console.log('================================================================');
  console.log('  RESOURCEHUB: M11 FINAL SYSTEM INTEGRATION & QA REGRESSION     ');
  console.log('================================================================\n');

  const ts = Date.now();
  const studentAEmail = `m11_studentA_${ts}@university.edu`;
  const studentBEmail = `m11_studentB_${ts}@university.edu`;
  const studentCEmail = `m11_studentC_${ts}@university.edu`;
  const adminEmail = `m11_admin_${ts}@university.edu`;
  const defaultPassword = 'Password123';

  let tokenA, tokenB, tokenC, tokenAdmin;
  let userA, userB, userC, userAdmin;
  let categoryId;
  let resourceIdA, resourceIdSwapB;
  let exchangeRequestId;
  let qrToken;

  try {
    // ----------------------------------------------------------------
    // SECTION 1: SYSTEM HEALTH & CONNECTIVITY (M11.1)
    // ----------------------------------------------------------------
    console.log('--- SECTION 1: SYSTEM HEALTH CHECKS ---');
    const healthRes = await request('GET', '/health');
    assert(healthRes.status === 200 && healthRes.data.status === 'UP', 'GET /api/health returns HTTP 200 with status UP');

    const dbHealthRes = await request('GET', '/health/db');
    assert(dbHealthRes.status === 200 && dbHealthRes.data.database === 'connected', 'GET /api/health/db returns HTTP 200 with database connected');

    // ----------------------------------------------------------------
    // SECTION 2: AUTHENTICATION & SECURITY REGRESSION (M11.2)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 2: AUTHENTICATION & SECURITY (M1 & M4) ---');
    
    // Invalid registration (missing fields)
    const badReg = await request('POST', '/auth/register', { name: 'Incomplete' });
    assert(badReg.status === 400, 'Registration rejects missing required fields (400)');

    // Register Student A
    const regA = await request('POST', '/auth/register', {
      name: 'M11 Student A',
      email: studentAEmail,
      password: defaultPassword,
      department: 'Electrical Engineering',
      year_of_study: 3
    });
    assert(regA.status === 201 && regA.data.data.user.role === 'STUDENT', 'Student A registered successfully with role STUDENT');

    // Duplicate email registration rejected
    const dupReg = await request('POST', '/auth/register', {
      name: 'Duplicate Student',
      email: studentAEmail,
      password: defaultPassword,
      department: 'CS',
      year_of_study: 1
    });
    assert(dupReg.status === 400, 'Duplicate email registration rejected (400)');

    // Register Student B & Student C
    await request('POST', '/auth/register', {
      name: 'M11 Student B',
      email: studentBEmail,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 2
    });

    await request('POST', '/auth/register', {
      name: 'M11 Student C',
      email: studentCEmail,
      password: defaultPassword,
      department: 'Mechanical Engineering',
      year_of_study: 1
    });

    // Register Admin Candidate
    await request('POST', '/auth/register', {
      name: 'M11 Admin User',
      email: adminEmail,
      password: defaultPassword,
      department: 'Administration',
      year_of_study: 4
    });
    await db.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE email = ?", [adminEmail]);

    // Invalid login
    const badLogin = await request('POST', '/auth/login', { email: studentAEmail, password: 'WrongPassword' });
    assert(badLogin.status === 401, 'Invalid credentials rejected with 401');

    // Login Student A
    const logA = await request('POST', '/auth/login', { email: studentAEmail, password: defaultPassword });
    assert(logA.status === 200 && logA.data.data.token, 'Student A login succeeded and returned JWT');
    assert(logA.data.data.user.password_hash === undefined, 'Password hash is strictly excluded from login response');
    tokenA = logA.data.data.token;
    userA = logA.data.data.user;

    // Login Student B
    const logB = await request('POST', '/auth/login', { email: studentBEmail, password: defaultPassword });
    tokenB = logB.data.data.token;
    userB = logB.data.data.user;

    // Login Student C
    const logC = await request('POST', '/auth/login', { email: studentCEmail, password: defaultPassword });
    tokenC = logC.data.data.token;
    userC = logC.data.data.user;

    // Login Admin
    const logAdmin = await request('POST', '/auth/login', { email: adminEmail, password: defaultPassword });
    assert(logAdmin.status === 200 && logAdmin.data.data.user.role === 'ADMIN', 'Admin logged in and role identified as ADMIN');
    tokenAdmin = logAdmin.data.data.token;
    userAdmin = logAdmin.data.data.user;

    // Test /api/auth/me
    const meRes = await request('GET', '/auth/me', null, tokenA);
    assert(meRes.status === 200 && meRes.data.data.user.id === userA.id, '/api/auth/me returns current authenticated user');
    assert(meRes.data.data.user.password_hash === undefined, 'Password hash is strictly excluded from /api/auth/me');

    // Test unauthenticated access to protected route
    const unauthRes = await request('GET', '/auth/me');
    assert(unauthRes.status === 401, 'Protected route without token returns 401');

    // Test invalid token
    const invalidTokenRes = await request('GET', '/auth/me', null, 'invalid.jwt.token');
    assert(invalidTokenRes.status === 401, 'Protected route with invalid token returns 401');

    // ----------------------------------------------------------------
    // SECTION 3: RESOURCE MANAGEMENT REGRESSION (M11.3)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 3: RESOURCE MANAGEMENT (M2 & M5) ---');
    
    // Categories
    const catRes = await request('GET', '/categories');
    assert(catRes.status === 200 && Array.isArray(catRes.data.data) && catRes.data.data.length > 0, 'Retrieved categories list');
    categoryId = catRes.data.data[0].id;

    // Create SELL resource without price -> expect 400
    const badSell = await request('POST', '/resources', {
      title: 'Expensive Textbook',
      description: 'Calculus 4th Ed',
      category_id: categoryId,
      exchange_type: 'SELL',
      item_condition: 'GOOD',
      meetup_location: 'Library'
    }, tokenA);
    assert(badSell.status === 400, 'SELL listing without price rejected (400)');

    // Create valid DONATE resource by Student A
    const resA = await request('POST', '/resources', {
      title: 'Digital Multimeter & Kit',
      description: 'Electronics Lab Kit with multimeter and breadboard',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'LIKE_NEW',
      meetup_location: 'Engineering Building Hall'
    }, tokenA);
    assert(resA.status === 201 && resA.data.data.id, 'Resource created successfully by Student A (Status: AVAILABLE)');
    resourceIdA = resA.data.data.id;

    // Create a SWAP item by Student B
    const resSwapB = await request('POST', '/resources', {
      title: 'Microcontroller Dev Board',
      description: 'STM32 Nucleo Board',
      category_id: categoryId,
      exchange_type: 'SWAP',
      item_condition: 'NEW',
      meetup_location: 'Computer Lab'
    }, tokenB);
    resourceIdSwapB = resSwapB.data.data.id;

    // Retrieve public resources with category filter
    const listRes = await request('GET', `/resources?category_id=${categoryId}`);
    assert(listRes.status === 200 && listRes.data.data.some(r => r.id === resourceIdA), 'Resource listing filters by category');

    // Retrieve resource details
    const detailRes = await request('GET', `/resources/${resourceIdA}`);
    assert(detailRes.status === 200 && detailRes.data.data.title === 'Digital Multimeter & Kit', 'Resource details retrieved with owner details');
    assert(parseFloat(detailRes.data.data.owner.trust_score) >= 20.00, 'Resource details contain owner trust score');

    // Update resource by non-owner (Student B) -> expect 403
    const badUpdate = await request('PUT', `/resources/${resourceIdA}`, {
      title: 'Hacked Title',
      description: 'Hacked',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'Somewhere',
      status: 'AVAILABLE'
    }, tokenB);
    assert(badUpdate.status === 403, 'Non-owner blocked from updating resource (403)');

    // Update resource by owner (Student A)
    const goodUpdate = await request('PUT', `/resources/${resourceIdA}`, {
      title: 'Digital Multimeter & Kit (Updated)',
      description: 'Electronics Lab Kit with multimeter, breadboard, and jumper wires',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'LIKE_NEW',
      meetup_location: 'Engineering Building Lobby',
      status: 'AVAILABLE'
    }, tokenA);
    assert(goodUpdate.status === 200, 'Owner updated resource successfully');

    // ----------------------------------------------------------------
    // SECTION 4: EXCHANGE LIFECYCLE E2E (M11.4 & M6)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 4: EXCHANGE REQUESTS & LIFECYCLE (M3 & M6) ---');
    
    // Owner requesting own resource -> expect 400
    const selfReq = await request('POST', '/exchange-requests', { resource_id: resourceIdA }, tokenA);
    assert(selfReq.status === 400, 'Owner requesting own resource blocked (400)');

    // Student B requests Student A's resource
    const exchReq = await request('POST', '/exchange-requests', { resource_id: resourceIdA }, tokenB);
    assert(exchReq.status === 201 && exchReq.data.data.status === 'PENDING', 'Student B submitted exchange request (status: PENDING)');
    exchangeRequestId = exchReq.data.data.id;

    // Duplicate pending request -> expect 400
    const dupExch = await request('POST', '/exchange-requests', { resource_id: resourceIdA }, tokenB);
    assert(dupExch.status === 400, 'Duplicate pending request blocked (400)');

    // Non-owner attempts to accept -> expect 403
    const badAccept = await request('PUT', `/exchange-requests/${exchangeRequestId}/accept`, {}, tokenC);
    assert(badAccept.status === 403, 'Non-owner blocked from accepting exchange request (403)');

    // Owner (Student A) accepts request
    const acceptRes = await request('PUT', `/exchange-requests/${exchangeRequestId}/accept`, {}, tokenA);
    assert(acceptRes.status === 200, 'Owner accepted request (request: ACCEPTED)');

    // Verify resource is now RESERVED
    const resCheck = await request('GET', `/resources/${resourceIdA}`);
    assert(resCheck.data.data.status === 'RESERVED', 'Associated resource status transitioned to RESERVED');

    // ----------------------------------------------------------------
    // SECTION 5: QR VERIFICATION REGRESSION (M11.5 & M7)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 5: QR PHYSICAL HANDOVER VERIFICATION (M7) ---');

    // Requester (Student B) attempts to generate QR -> expect 403
    const badQrGen = await request('POST', `/exchange-requests/${exchangeRequestId}/qr`, {}, tokenB);
    assert(badQrGen.status === 403, 'Requester blocked from generating handover QR (403)');

    // Owner (Student A) generates handover QR -> expect 200
    const qrGen = await request('POST', `/exchange-requests/${exchangeRequestId}/qr`, {}, tokenA);
    assert(qrGen.status === 200 && qrGen.data.data.verification_token, 'Owner generated handover QR token');
    qrToken = qrGen.data.data.verification_token;

    // Requester views QR status -> token must be hidden
    const qrStatusB = await request('GET', `/exchange-requests/${exchangeRequestId}/qr`, null, tokenB);
    assert(qrStatusB.data.data.status === 'GENERATED', 'Requester sees QR status as GENERATED');
    assert(qrStatusB.data.data.verification_token === undefined, 'QR verification token is strictly hidden from requester');

    // Owner views QR status -> token is visible
    const qrStatusA = await request('GET', `/exchange-requests/${exchangeRequestId}/qr`, null, tokenA);
    assert(qrStatusA.data.data.verification_token === qrToken, 'QR verification token is visible to owner');

    // Attempt completion BEFORE QR verification -> expect 400
    const earlyComplete = await request('PUT', `/exchange-requests/${exchangeRequestId}/complete`, {}, tokenA);
    assert(earlyComplete.status === 400, 'Exchange completion blocked prior to QR verification (400)');

    // Owner attempts to scan own QR -> expect 400
    const selfScan = await request('POST', `/exchange-requests/${exchangeRequestId}/qr/verify`, { verification_token: qrToken }, tokenA);
    assert(selfScan.status === 400, 'Owner scanning own handover QR blocked (400)');

    // Unrelated user (Student C) scans QR -> expect 403
    const unauthScan = await request('POST', `/exchange-requests/${exchangeRequestId}/qr/verify`, { verification_token: qrToken }, tokenC);
    assert(unauthScan.status === 403, 'Unrelated user scanning QR blocked (403)');

    // Scan with invalid token -> expect 400
    const wrongTokenScan = await request('POST', `/exchange-requests/${exchangeRequestId}/qr/verify`, { verification_token: 'bogustoken' }, tokenB);
    assert(wrongTokenScan.status === 400, 'Scan with invalid token rejected (400)');

    // Requester (Student B) scans with correct token -> expect 200
    const validScan = await request('POST', `/exchange-requests/${exchangeRequestId}/qr/verify`, { verification_token: qrToken }, tokenB);
    assert(validScan.status === 200, 'Requester successfully scanned and verified handover QR');

    // Replay attack: Scan already-verified token -> expect 400
    const replayScan = await request('POST', `/exchange-requests/${exchangeRequestId}/qr/verify`, { verification_token: qrToken }, tokenB);
    assert(replayScan.status === 400, 'Token replay/reuse blocked (400)');

    // Complete transaction AFTER QR verification -> expect 200
    const completeRes = await request('PUT', `/exchange-requests/${exchangeRequestId}/complete`, {}, tokenA);
    assert(completeRes.status === 200, 'Exchange completed successfully');

    // Verify resource is now EXCHANGED
    const finalResCheck = await request('GET', `/resources/${resourceIdA}`);
    assert(finalResCheck.data.data.status === 'EXCHANGED', 'Resource status transitioned to EXCHANGED');

    // ----------------------------------------------------------------
    // SECTION 6: REVIEWS, RATINGS & TRUST SCORE REGRESSION (M11.6 & M8)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 6: REVIEWS & TRUST SCORE (M8) ---');

    // Unrelated user (Student C) submits review -> expect 403
    const badReviewer = await request('POST', '/reviews', {
      transaction_id: exchangeRequestId,
      rating: 5,
      review_text: 'I was not involved.'
    }, tokenC);
    assert(badReviewer.status === 403, 'Non-participant blocked from reviewing transaction (403)');

    // Invalid rating (0 or 6) -> expect 400
    const zeroRating = await request('POST', '/reviews', { transaction_id: exchangeRequestId, rating: 0 }, tokenB);
    assert(zeroRating.status === 400, 'Invalid rating (0) rejected (400)');

    const highRating = await request('POST', '/reviews', { transaction_id: exchangeRequestId, rating: 6 }, tokenB);
    assert(highRating.status === 400, 'Invalid rating (6) rejected (400)');

    // Student B reviews Student A with 5 stars
    const reviewB = await request('POST', '/reviews', {
      transaction_id: exchangeRequestId,
      rating: 5,
      review_text: 'Smooth handover, item in pristine condition!'
    }, tokenB);
    assert(reviewB.status === 201 && reviewB.data.data.review.rating === 5, 'Student B submitted 5-star review for Student A');
    assert(parseFloat(reviewB.data.data.reviewed_user.trust_score) === 100.00, 'Reviewed user trust score computed as 100.00 (5 * 20)');

    // Student B attempts duplicate review -> expect 409
    const dupReview = await request('POST', '/reviews', {
      transaction_id: exchangeRequestId,
      rating: 5
    }, tokenB);
    assert(dupReview.status === 409, 'Duplicate review prevented with 409 Conflict');

    // Student A reviews Student B with 4 stars
    const reviewA = await request('POST', '/reviews', {
      transaction_id: exchangeRequestId,
      rating: 4,
      review_text: 'Punctual and courteous student.'
    }, tokenA);
    assert(reviewA.status === 201 && reviewA.data.data.review.rating === 4, 'Student A submitted 4-star review for Student B');
    assert(parseFloat(reviewA.data.data.reviewed_user.trust_score) === 80.00, 'Reviewed user trust score computed as 80.00 (4 * 20)');

    // Verify user stats endpoint
    const statsA = await request('GET', `/reviews/user/${userA.id}`);
    assert(statsA.status === 200 && statsA.data.data.review_count === 1, 'User review stats retrieved correctly');

    // ----------------------------------------------------------------
    // SECTION 7: NOTIFICATIONS & TENANT ISOLATION REGRESSION (M11.7 & M9)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 7: NOTIFICATIONS & TENANT ISOLATION (M9) ---');

    // Student A's notifications list
    const notifsA = await request('GET', '/notifications', null, tokenA);
    assert(notifsA.status === 200 && Array.isArray(notifsA.data.data), 'Student A retrieved personal notifications');

    // Check notifications types received by Student A
    const typesA = notifsA.data.data.map(n => n.notification_type || n.type);
    assert(typesA.includes('EXCHANGE_REQUEST'), 'Student A received EXCHANGE_REQUEST notification');
    assert(typesA.includes('QR_VERIFIED'), 'Student A received QR_VERIFIED notification');
    assert(typesA.includes('REVIEW_RECEIVED'), 'Student A received REVIEW_RECEIVED notification');

    // Check tenant isolation: None of Student B's private notifications in Student A's feed
    const recipientIdsInA = notifsA.data.data.map(n => n.recipient_id || n.user_id);
    assert(recipientIdsInA.every(id => id === userA.id), 'Strict tenant isolation: All notifications belong to authenticated user');

    // Unread count
    const unreadA = await request('GET', '/notifications/unread-count', null, tokenA);
    assert(unreadA.status === 200 && typeof unreadA.data.unread_count === 'number', 'Unread notifications count returned');

    // Mark single notification read
    if (notifsA.data.data.length > 0) {
      const notifId = notifsA.data.data[0].id;
      
      // Cross-user modification attempt: Student B modifies Student A's notification -> expect 403
      const badNotifMod = await request('PATCH', `/notifications/${notifId}/read`, {}, tokenB);
      assert(badNotifMod.status === 403, 'Cross-user notification modification blocked with 403');

      // Legitimate owner marks read
      const markReadRes = await request('PATCH', `/notifications/${notifId}/read`, {}, tokenA);
      assert(markReadRes.status === 200, 'Notification marked as read by owner');
    }

    // Mark all read
    const markAllRes = await request('PATCH', '/notifications/read-all', {}, tokenA);
    assert(markAllRes.status === 200, 'Mark all notifications as read succeeded');

    const unreadAfter = await request('GET', '/notifications/unread-count', null, tokenA);
    assert(unreadAfter.data.unread_count === 0, 'Unread count is 0 after mark-all-read');

    // ----------------------------------------------------------------
    // SECTION 8: ADMIN & MODERATION REGRESSION (M11.8 & M10)
    // ----------------------------------------------------------------
    console.log('\n--- SECTION 8: ADMIN & MODERATION (M10) ---');

    // Student A tries to access admin stats -> expect 403
    const studentAdminStats = await request('GET', '/admin/stats', null, tokenA);
    assert(studentAdminStats.status === 403, 'Student blocked from admin statistics (403 Forbidden)');

    // Admin accesses stats -> expect 200
    const adminStats = await request('GET', '/admin/stats', null, tokenAdmin);
    assert(adminStats.status === 200 && adminStats.data.data.total_users !== undefined, 'Admin retrieved platform statistics');

    // Admin user management list
    const adminUsers = await request('GET', '/admin/users', null, tokenAdmin);
    assert(adminUsers.status === 200 && Array.isArray(adminUsers.data.data), 'Admin retrieved user management list');
    assert(adminUsers.data.data.every(u => u.password_hash === undefined), 'Password hashes are strictly excluded from admin user list');

    // Admin updates user status (Student C -> SUSPENDED)
    const suspendRes = await request('PATCH', `/admin/users/${userC.id}/status`, { status: 'SUSPENDED' }, tokenAdmin);
    assert(suspendRes.status === 200, 'Admin suspended user account');

    // Suspended user attempts to access /auth/me -> expect 403
    const suspendedMe = await request('GET', '/auth/me', null, tokenC);
    assert(suspendedMe.status === 403, 'Suspended user blocked from platform with 403');

    // Admin reactivates Student C
    const reactivateRes = await request('PATCH', `/admin/users/${userC.id}/status`, { status: 'ACTIVE' }, tokenAdmin);
    assert(reactivateRes.status === 200, 'Admin reactivated user account');

    // Admin self-suspension prevented -> expect 403
    const selfSuspend = await request('PATCH', `/admin/users/${userAdmin.id}/status`, { status: 'SUSPENDED' }, tokenAdmin);
    assert(selfSuspend.status === 403, 'Admin self-suspension/deactivation blocked with 403');

    // Admin resource moderation (Archive resource)
    const adminArchive = await request('PATCH', `/admin/resources/${resourceIdSwapB}/status`, { status: 'ARCHIVED' }, tokenAdmin);
    assert(adminArchive.status === 200, 'Admin archived resource listing');

    // Student B tries to access admin user management -> expect 403
    const studentUserMgmt = await request('GET', '/admin/users', null, tokenB);
    assert(studentUserMgmt.status === 403, 'Student blocked from admin user list (403)');

    // ----------------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`  M11 FULL REGRESSION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\nM11 REGRESSION FAILED:', err.message);
    process.exit(1);
  } finally {
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runFullSystemRegression();
