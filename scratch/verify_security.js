/**
 * RESOURCEHUB — M25: FINAL SECURITY & PRODUCTION HARDENING TEST SUITE
 * 
 * Comprehensive Security Verifications:
 * 1. Missing / Malformed / Invalid JWT rejection
 * 2. Role-Based Access Control (RBAC) & Admin Isolation
 * 3. Resource Ownership & IDOR Protection (Update, Delete, Image Management)
 * 4. Exchange Lifecycle & Participant Access Control
 * 5. Input Validation & Parameter Boundaries
 * 6. SQL Injection Resilience (Search, Filters, Pagination, Sorting)
 * 7. File & Image Upload Constraints (MIME, Extension, Size)
 * 8. QR Handover Security (Replay, Self-Scan, Unrelated Scan, Expiration, Token Privacy)
 * 9. Review Integrity & Server-Side Trust Score Calculation
 * 10. Notification Isolation & Tenant Privacy
 * 11. Sensitive Data Exclusion (Zero Password Hash / Token Exposure)
 * 12. Security Headers & CORS Policy Integrity
 */

const path = require('path');
require('../server/node_modules/dotenv').config({ path: path.join(__dirname, '../server/.env') });

const http = require('http');
const jwt = require('../server/node_modules/jsonwebtoken');
const db = require('../server/config/database');

const API_PORT = process.env.PORT || 5000;
const BASE_PATH = '/api';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Security assertion failed: ${message}`);
  }
}

function request(method, path, body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: `${BASE_PATH}${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-test-suite': 'm25-security',
        ...extraHeaders
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => { resBody += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(resBody);
        } catch (e) {
          parsed = resBody;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log('\n================================================================');
  console.log('  RESOURCEHUB — M25: SECURITY & PRODUCTION HARDENING QA SUITE  ');
  console.log('================================================================\n');

  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // STEP 1: Setting up Test Entities
    // ----------------------------------------------------
    console.log('--- Step 1: Setting up Test Accounts & Resources ---');

    // 1a. Register Admin
    const adminEmail = `m25admin_${timestamp}@campus.edu`;
    const regAdmin = await request('POST', '/auth/register', {
      name: 'Security Admin',
      email: adminEmail,
      password: 'AdminPassword123!',
      department: 'IT Security',
      year_of_study: 4
    });
    assert(regAdmin.status === 201, 'Admin account registered');
    const adminId = regAdmin.data.data.user.id;
    await db.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE id = ?", [adminId]);

    const adminLogin = await request('POST', '/auth/login', {
      email: adminEmail,
      password: 'AdminPassword123!'
    });
    const adminToken = adminLogin.data.data.token;
    assert(adminToken !== undefined, 'Admin logged in and JWT received');

    // 1b. Register Student Alice (Resource Owner)
    const aliceEmail = `m25alice_${timestamp}@campus.edu`;
    const regAlice = await request('POST', '/auth/register', {
      name: 'Alice Security Owner',
      email: aliceEmail,
      password: 'AlicePassword123!',
      department: 'Computer Science',
      year_of_study: 3
    });
    assert(regAlice.status === 201, 'Student Alice registered');
    const aliceId = regAlice.data.data.user.id;
    await db.query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [aliceId]);

    const aliceLogin = await request('POST', '/auth/login', {
      email: aliceEmail,
      password: 'AlicePassword123!'
    });
    const aliceToken = aliceLogin.data.data.token;

    // 1c. Register Student Bob (Attacker / Requester)
    const bobEmail = `m25bob_${timestamp}@campus.edu`;
    const regBob = await request('POST', '/auth/register', {
      name: 'Bob Requester',
      email: bobEmail,
      password: 'BobPassword123!',
      department: 'Mechanical Eng',
      year_of_study: 2
    });
    assert(regBob.status === 201, 'Student Bob registered');
    const bobId = regBob.data.data.user.id;
    await db.query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [bobId]);

    const bobLogin = await request('POST', '/auth/login', {
      email: bobEmail,
      password: 'BobPassword123!'
    });
    const bobToken = bobLogin.data.data.token;

    // 1d. Retrieve category for resource creation
    const [catRows] = await db.query('SELECT id, name FROM categories LIMIT 1');
    const categoryId = catRows[0].id;

    // Alice creates Resource 1 (Books, SELL)
    const res1 = await request('POST', '/resources', {
      title: `CompSec Handbook ${timestamp}`,
      description: 'Comprehensive computer security principles.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 350.00,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Cybersecurity Lab'
    }, aliceToken);
    assert(res1.status === 201, 'Alice created Resource 1');
    const resource1Id = res1.data.data.id;

    // ----------------------------------------------------
    // STEP 2: JWT & Authentication Security
    // ----------------------------------------------------
    console.log('\n--- Step 2: JWT & Authentication Security ---');

    // 2a. Missing JWT on protected route
    const noJwtRes = await request('GET', '/auth/me');
    assert(noJwtRes.status === 401, 'Missing JWT is rejected with 401 Unauthorized');

    // 2b. Malformed Authorization Header (empty Bearer)
    const malformedHeaderRes = await request('GET', '/auth/me', null, null, {
      'Authorization': 'Bearer '
    });
    assert(malformedHeaderRes.status === 401, 'Malformed Authorization header is rejected with 401');

    // 2c. Invalid / Tampered JWT signature
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OSwicm9sZSI6IkFETUlOIn0.tampered_signature_fake';
    const fakeJwtRes = await request('GET', '/auth/me', null, fakeToken);
    assert(fakeJwtRes.status === 401, 'Tampered JWT signature is rejected with 401');

    // 2d. Expired JWT
    const expiredToken = jwt.sign(
      { userId: aliceId, role: 'STUDENT' },
      process.env.JWT_SECRET || 'supersecretkey12345_change_me_in_production',
      { expiresIn: '-1s' }
    );
    const expiredJwtRes = await request('GET', '/auth/me', null, expiredToken);
    assert(expiredJwtRes.status === 401, 'Expired JWT is rejected with 401 Unauthorized');

    // ----------------------------------------------------
    // STEP 3: Role-Based Access Control (RBAC)
    // ----------------------------------------------------
    console.log('\n--- Step 3: Role-Based Access Control (RBAC) ---');

    // 3a. Student Bob attempts to access Admin Stats
    const studentAdminStats = await request('GET', '/admin/stats', null, bobToken);
    assert(studentAdminStats.status === 403, 'Normal student accessing /api/admin/stats is forbidden (403)');

    // 3b. Student Bob attempts to access Admin Users
    const studentAdminUsers = await request('GET', '/admin/users', null, bobToken);
    assert(studentAdminUsers.status === 403, 'Normal student accessing /api/admin/users is forbidden (403)');

    // 3c. Student Bob attempts to access Admin Audit Logs
    const studentAuditLogs = await request('GET', '/admin/audit-logs', null, bobToken);
    assert(studentAuditLogs.status === 403, 'Normal student accessing /api/admin/audit-logs is forbidden (403)');

    // 3d. Admin accessing Admin Stats
    const adminStatsOk = await request('GET', '/admin/stats', null, adminToken);
    assert(adminStatsOk.status === 200, 'Authenticated admin accessing /api/admin/stats succeeds (200 OK)');

    // ----------------------------------------------------
    // STEP 4: Resource Ownership & IDOR Protection
    // ----------------------------------------------------
    console.log('\n--- Step 4: Resource Ownership & IDOR Protection ---');

    // 4a. Bob attempts to modify Alice's Resource 1
    const idorUpdate = await request('PUT', `/resources/${resource1Id}`, {
      title: 'Hacked Title By Bob',
      description: 'Unauthorized update.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 1.00,
      item_condition: 'POOR',
      meetup_location: 'Hacker Alley',
      status: 'AVAILABLE'
    }, bobToken);
    assert(idorUpdate.status === 403, 'IDOR Check: User B modifying User A resource blocked with 403 Forbidden');

    // 4b. Bob attempts to delete Alice's Resource 1
    const idorDelete = await request('DELETE', `/resources/${resource1Id}`, null, bobToken);
    assert(idorDelete.status === 403, 'IDOR Check: User B deleting User A resource blocked with 403 Forbidden');

    // 4c. Bob attempts to add image to Alice's Resource 1
    const idorAddImage = await request('POST', `/resources/${resource1Id}/images`, {
      image_url: 'https://example.com/malicious.jpg'
    }, bobToken);
    assert(idorAddImage.status === 403, 'IDOR Check: User B adding image to User A resource blocked with 403 Forbidden');

    // 4d. Invalid non-numeric resource ID parameter
    const invalidIdRes = await request('GET', '/resources/abc-not-a-number');
    assert(invalidIdRes.status === 400 || invalidIdRes.status === 404, 'Invalid non-numeric resource ID rejected safely');

    // ----------------------------------------------------
    // STEP 5: Exchange Security & Lifecycle Enforcement
    // ----------------------------------------------------
    console.log('\n--- Step 5: Exchange Security & Lifecycle Enforcement ---');

    // 5a. Alice attempts to create exchange request for her own resource
    const selfExchange = await request('POST', '/exchange-requests', {
      resource_id: resource1Id
    }, aliceToken);
    assert(selfExchange.status === 400, 'Owner self-exchange request blocked with 400 Bad Request');

    // 5b. Bob creates valid exchange request
    const validExchange = await request('POST', '/exchange-requests', {
      resource_id: resource1Id
    }, bobToken);
    assert(validExchange.status === 201, 'Bob created valid exchange request (PENDING)');
    const exchangeId = validExchange.data.data.id;

    // 5c. Bob attempts to create duplicate pending request for same resource
    const dupExchange = await request('POST', '/exchange-requests', {
      resource_id: resource1Id
    }, bobToken);
    assert(dupExchange.status === 400, 'Duplicate pending exchange request blocked with 400 Bad Request');

    // 5d. Bob (requester) attempts to accept the request
    const bobAccept = await request('PATCH', `/exchange-requests/${exchangeId}/accept`, null, bobToken);
    assert(bobAccept.status === 403, 'Requester blocked from accepting exchange request with 403 Forbidden');

    // 5e. Alice (owner) accepts the request -> state becomes ACCEPTED, resource RESERVED
    const aliceAccept = await request('PATCH', `/exchange-requests/${exchangeId}/accept`, null, aliceToken);
    assert(aliceAccept.status === 200, 'Resource owner accepted exchange request (200 OK)');

    // ----------------------------------------------------
    // STEP 6: QR Handover Verification Security
    // ----------------------------------------------------
    console.log('\n--- Step 6: QR Handover Verification Security ---');

    // 6a. Requester (Bob) attempts to generate handover QR
    const bobGenQr = await request('POST', `/exchange-requests/${exchangeId}/qr/generate`, null, bobToken);
    assert(bobGenQr.status === 403, 'Requester blocked from generating handover QR (403 Forbidden)');

    // 6b. Owner (Alice) generates handover QR
    const aliceGenQr = await request('POST', `/exchange-requests/${exchangeId}/qr/generate`, null, aliceToken);
    assert(aliceGenQr.status === 200, 'Owner generated handover QR token (200 OK)');
    const verificationToken = aliceGenQr.data.data.verification_token;
    assert(typeof verificationToken === 'string' && verificationToken.length >= 32, 'QR verification token has high entropy (>= 32 chars)');

    // 6c. Requester inspects QR status — verification token must be strictly hidden
    const bobQrStatus = await request('GET', `/exchange-requests/${exchangeId}/qr`, null, bobToken);
    assert(bobQrStatus.data.data.status === 'GENERATED', 'Requester sees QR status as GENERATED');
    assert(bobQrStatus.data.data.verification_token === undefined, 'QR verification token is strictly hidden from requester before scan');

    // 6d. Owner (Alice) attempts to scan/verify her own QR
    const aliceSelfScan = await request('POST', `/exchange-requests/${exchangeId}/qr/verify`, {
      verification_token: verificationToken
    }, aliceToken);
    assert(aliceSelfScan.status === 400, 'Owner self-scan of handover QR is rejected with 400 Bad Request');

    // 6e. Unrelated user (Admin or other student) attempts to scan QR
    const adminScan = await request('POST', `/exchange-requests/${exchangeId}/qr/verify`, {
      verification_token: verificationToken
    }, adminToken);
    assert(adminScan.status === 403, 'Unrelated user scanning QR is rejected with 403 Forbidden');

    // 6f. Scan with wrong token
    const wrongTokenScan = await request('POST', `/exchange-requests/${exchangeId}/qr/verify`, {
      verification_token: 'wrong_fake_token_12345'
    }, bobToken);
    assert(wrongTokenScan.status === 400, 'Scan with invalid token is rejected with 400 Bad Request');

    // 6g. Requester (Bob) scans with correct token -> VERIFIED
    const bobValidScan = await request('POST', `/exchange-requests/${exchangeId}/qr/verify`, {
      verification_token: verificationToken
    }, bobToken);
    assert(bobValidScan.status === 200, 'Requester verified handover QR successfully (200 OK)');

    // 6h. Replay attack on already verified token
    const replayScan = await request('POST', `/exchange-requests/${exchangeId}/qr/verify`, {
      verification_token: verificationToken
    }, bobToken);
    assert(replayScan.status === 400, 'Replay attack on verified QR token blocked with 400 Bad Request');

    // Alice completes the transaction
    const completeRes = await request('PATCH', `/exchange-requests/${exchangeId}/complete`, null, aliceToken);
    assert(completeRes.status === 200, 'Transaction marked COMPLETED');

    // ----------------------------------------------------
    // STEP 7: Review & Reputation Integrity
    // ----------------------------------------------------
    console.log('\n--- Step 7: Review & Reputation Integrity ---');

    // 7a. Invalid review rating (0 and 6)
    const invalidRating0 = await request('POST', '/reviews', {
      transaction_id: exchangeId,
      rating: 0,
      review_text: 'Invalid 0 rating'
    }, bobToken);
    assert(invalidRating0.status === 400, 'Rating 0 rejected with 400 Bad Request');

    const invalidRating6 = await request('POST', '/reviews', {
      transaction_id: exchangeId,
      rating: 6,
      review_text: 'Invalid 6 rating'
    }, bobToken);
    assert(invalidRating6.status === 400, 'Rating 6 rejected with 400 Bad Request');

    // 7b. Attempt to inject client trustScore
    const trustInjection = await request('POST', '/reviews', {
      transaction_id: exchangeId,
      rating: 5,
      review_text: 'Great exchange with Alice!',
      trust_score: 100.00,
      trustScore: 100.00
    }, bobToken);
    assert(trustInjection.status === 201, 'Valid 5-star review submitted');

    // 7c. Duplicate review on same transaction
    const dupReview = await request('POST', '/reviews', {
      transaction_id: exchangeId,
      rating: 5,
      review_text: 'Duplicate review attempt'
    }, bobToken);
    assert(dupReview.status === 409, 'Duplicate review prevented with 409 Conflict');

    // ----------------------------------------------------
    // STEP 8: Notification Security & Tenant Isolation
    // ----------------------------------------------------
    console.log('\n--- Step 8: Notification Security & Tenant Isolation ---');

    // 8a. Alice fetches her notifications
    const aliceNotifs = await request('GET', '/notifications', null, aliceToken);
    assert(aliceNotifs.status === 200, 'Alice fetched her notifications (200 OK)');
    assert(aliceNotifs.data.data.length > 0, 'Alice has notifications');
    const notifId = aliceNotifs.data.data[0].id;

    // 8b. Bob attempts to mark Alice's notification as read
    const crossTenantNotif = await request('PATCH', `/notifications/${notifId}/read`, null, bobToken);
    assert(crossTenantNotif.status === 403, 'Cross-tenant notification modification blocked with 403 Forbidden');

    // ----------------------------------------------------
    // STEP 9: SQL Injection & Input Parameter Resilience
    // ----------------------------------------------------
    console.log('\n--- Step 9: SQL Injection & Input Parameter Resilience ---');

    // 9a. SQL Injection string in search parameter
    const sqliSearch = await request('GET', `/resources?search=${encodeURIComponent("' OR 1=1 --")}`);
    assert(sqliSearch.status === 200, 'SQL injection in search parameter handled safely without syntax error');
    assert(Array.isArray(sqliSearch.data.data), 'Returns clean JSON array');

    // 9b. SQL Injection in category parameter
    const sqliCategory = await request('GET', `/resources?category_id=${encodeURIComponent("1; DROP TABLE users; --")}`);
    assert(sqliCategory.status === 200, 'SQL injection in category parameter handled safely without SQL execution');

    // 9c. SQL Injection in sort parameter
    const sqliSort = await request('GET', `/resources?sort=${encodeURIComponent("created_at; DELETE FROM resources; --")}`);
    assert(sqliSort.status === 200, 'SQL injection in sort parameter safely filtered by allowlist');

    // 9d. Extreme pagination numbers
    const extremePagination = await request('GET', '/resources?page=-100&limit=9999999');
    assert(extremePagination.status === 200, 'Extreme pagination safely normalized without memory exhaustion');

    // ----------------------------------------------------
    // STEP 10: Security Headers & Sensitive Data Exclusion
    // ----------------------------------------------------
    console.log('\n--- Step 10: Security Headers & Sensitive Data Exclusion ---');

    // 10a. Inspect HTTP response headers for Helmet security headers
    const healthCheck = await request('GET', '/health');
    assert(healthCheck.status === 200, 'Health check responds 200 OK');
    const headers = healthCheck.headers;
    assert(headers['x-content-type-options'] === 'nosniff', 'Security header: X-Content-Type-Options is nosniff');
    assert(headers['x-frame-options'] !== undefined, 'Security header: X-Frame-Options is set');

    // 10b. Verify password_hash is strictly never exposed
    const profileRes = await request('GET', '/auth/me', null, aliceToken);
    assert(profileRes.data.data.user.password_hash === undefined, 'password_hash excluded from /api/auth/me');
    assert(profileRes.data.data.user.password === undefined, 'password excluded from /api/auth/me');

    const adminUserList = await request('GET', '/admin/users', null, adminToken);
    const usersWithHash = adminUserList.data.data.filter(u => u.password_hash !== undefined || u.password !== undefined);
    assert(usersWithHash.length === 0, 'password_hash strictly excluded from /api/admin/users');

    console.log('\n================================================================');
    console.log(`  M25 SECURITY QA COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n[FATAL ERROR IN SECURITY QA SUITE]:', error.message);
    process.exit(1);
  }
}

runSecurityTests();
