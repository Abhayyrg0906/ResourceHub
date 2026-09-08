/**
 * ResourceHub — Milestone M15: Enhanced User Profiles Verification Suite
 * 
 * Verifies:
 *  1. Authentication required on profile endpoints (401 Unauthorized)
 *  2. Authenticated user profile retrieval (GET /api/users/profile and /api/profile)
 *  3. Accurate aggregated statistics (completed_exchanges, active_listings, reviews)
 *  4. Strict exclusion of password_hash in profile responses
 *  5. Profile update functionality (name, department, year, bio, phone, photo)
 *  6. Format validations (year_of_study 1-6, name length, empty updates)
 *  7. Sensitive field protection (tampering with role, trust_score, status, id, password strictly prevented)
 *  8. Public profile inspection (GET /api/users/:id)
 *  9. Sensitive field protection in public view (no phone_number, no password_hash)
 * 10. Nonexistent user profile handling (404 Not Found)
 * 11. Review visibility & trust score integration in profile
 * 12. Active listings visibility in public profile
 * 13. Tenant isolation (users can only update their own profile)
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

async function runProfileVerification() {
  console.log('================================================================');
  console.log('  RESOURCEHUB — M15: ENHANCED USER PROFILES TEST SUITE          ');
  console.log('================================================================\n');

  const ts = Date.now();
  const emailA = `m15_alice_${ts}@university.edu`;
  const emailB = `m15_bob_${ts}@university.edu`;
  const defaultPassword = 'Password123';

  let userA, userB;
  let tokenA, tokenB;
  let resourceAId;
  let exchangeId;

  try {
    // -----------------------------------------------------------------
    // STEP 1: Registration & User Setup
    // -----------------------------------------------------------------
    console.log('--- Step 1: User Registration & Authentication ---');

    // Register Student A
    const regA = await request('POST', '/auth/register', {
      name: 'Alice Pioneer',
      email: emailA,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 3
    });
    assert(regA.status === 201, 'Student A registered successfully');
    userA = regA.data.data.user;

    // Register Student B
    const regB = await request('POST', '/auth/register', {
      name: 'Bob Explorer',
      email: emailB,
      password: defaultPassword,
      department: 'Mechanical Engineering',
      year_of_study: 2
    });
    assert(regB.status === 201, 'Student B registered successfully');
    userB = regB.data.data.user;

    // Activate both users in database
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 90.00 WHERE id = ?", [userA.id]);
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 85.00 WHERE id = ?", [userB.id]);

    // Login Student A
    const logA = await request('POST', '/auth/login', { email: emailA, password: defaultPassword });
    assert(logA.status === 200, 'Student A logged in successfully');
    tokenA = logA.data.data.token;

    // Login Student B
    const logB = await request('POST', '/auth/login', { email: emailB, password: defaultPassword });
    assert(logB.status === 200, 'Student B logged in successfully');
    tokenB = logB.data.data.token;

    // -----------------------------------------------------------------
    // STEP 2: Authentication Enforcement
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: Authentication Enforcement ---');

    const unauthGet1 = await request('GET', '/users/profile');
    assert(unauthGet1.status === 401, 'GET /users/profile rejects unauthenticated request with 401');

    const unauthGet2 = await request('GET', '/profile');
    assert(unauthGet2.status === 401, 'GET /profile alias rejects unauthenticated request with 401');

    const unauthPut = await request('PUT', '/users/profile', { bio: 'Hacker' });
    assert(unauthPut.status === 401, 'PUT /users/profile rejects unauthenticated request with 401');

    const unauthPublic = await request('GET', `/users/${userA.id}`);
    assert(unauthPublic.status === 401, 'GET /users/:id rejects unauthenticated request with 401');

    // -----------------------------------------------------------------
    // STEP 3: Retrieve Authenticated User Profile (Own Profile)
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Retrieve Authenticated User Profile ---');

    const profileRes = await request('GET', '/users/profile', null, tokenA);
    assert(profileRes.status === 200, 'GET /users/profile returns 200 OK');
    const pData = profileRes.data.data;
    assert(pData.id === userA.id, 'Profile ID matches authenticated user');
    assert(pData.name === 'Alice Pioneer', 'Profile name matches');
    assert(pData.email === emailA, 'Profile email matches');
    assert(pData.department === 'Computer Science', 'Profile department matches');
    assert(pData.year_of_study === 3, 'Profile year of study matches');
    assert(Number(pData.trust_score) === 90.00, 'Profile trust score matches');
    assert(pData.password_hash === undefined, 'password_hash is strictly NOT exposed in response');
    assert(pData.stats !== undefined, 'Profile includes stats object');
    assert(typeof pData.stats.completed_exchanges === 'number', 'stats includes completed_exchanges count');
    assert(typeof pData.stats.active_listings === 'number', 'stats includes active_listings count');
    assert(typeof pData.stats.review_count === 'number', 'stats includes review_count');
    assert(typeof pData.stats.average_rating === 'number', 'stats includes average_rating');

    // Test /api/profile alias route
    const aliasRes = await request('GET', '/profile', null, tokenA);
    assert(aliasRes.status === 200, 'GET /profile alias returns 200 OK');
    assert(aliasRes.data.data.id === userA.id, 'Alias returns identical authenticated profile');

    // -----------------------------------------------------------------
    // STEP 4: Profile Editing & Data Persistence
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Profile Update & Persistence ---');

    const updatePayload = {
      name: 'Alice Pioneer (Robotics)',
      department: 'Aerospace & Robotics',
      year_of_study: 4,
      phone_number: '+91 98765 43210',
      bio: 'Building autonomous quadcopters and exchanging specialized avionics components.',
      profile_photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
    };

    const updateRes = await request('PUT', '/users/profile', updatePayload, tokenA);
    assert(updateRes.status === 200, 'PUT /users/profile returns 200 OK');
    const updated = updateRes.data.data;
    assert(updated.name === 'Alice Pioneer (Robotics)', 'Updated name reflected in response');
    assert(updated.department === 'Aerospace & Robotics', 'Updated department reflected in response');
    assert(updated.year_of_study === 4, 'Updated year_of_study reflected in response');
    assert(updated.phone_number === '+91 98765 43210', 'Updated phone_number reflected in response');
    assert(updated.bio.includes('autonomous quadcopters'), 'Updated bio reflected in response');
    assert(updated.profile_photo_url.includes('images.unsplash.com'), 'Updated photo reflected in response');

    // Direct MySQL verification
    const [dbRows] = await db.query(
      'SELECT name, department, year_of_study, phone_number, bio, profile_photo_url FROM users WHERE id = ?',
      [userA.id]
    );
    assert(dbRows[0].name === 'Alice Pioneer (Robotics)', 'Database row has updated name');
    assert(dbRows[0].department === 'Aerospace & Robotics', 'Database row has updated department');
    assert(dbRows[0].year_of_study === 4, 'Database row has updated year');
    assert(dbRows[0].phone_number === '+91 98765 43210', 'Database row has updated phone');
    assert(dbRows[0].bio.includes('autonomous quadcopters'), 'Database row has updated bio');

    // -----------------------------------------------------------------
    // STEP 5: Input Validation Checks
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Input Validation Enforcement ---');

    // Name too short (< 2 chars)
    const badName = await request('PUT', '/users/profile', { name: 'A' }, tokenA);
    assert(badName.status === 400, 'Short name (< 2 chars) rejected with 400 Bad Request');

    // Invalid year (> 6)
    const badYear1 = await request('PUT', '/users/profile', { year_of_study: 7 }, tokenA);
    assert(badYear1.status === 400, 'Invalid year_of_study (7) rejected with 400 Bad Request');

    // Invalid year (< 1)
    const badYear2 = await request('PUT', '/users/profile', { year_of_study: 0 }, tokenA);
    assert(badYear2.status === 400, 'Invalid year_of_study (0) rejected with 400 Bad Request');

    // Empty update payload
    const emptyUpdate = await request('PUT', '/users/profile', {}, tokenA);
    assert(emptyUpdate.status === 400, 'Empty update payload rejected with 400 Bad Request');

    // -----------------------------------------------------------------
    // STEP 6: Sensitive Field Protection (Security Guard)
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: Sensitive Field Protection & Anti-Tampering ---');

    // Malicious attempt to escalate privileges or tamper with account integrity
    const exploitPayload = {
      name: 'Alice Pioneer (Robotics)',
      role: 'ADMIN',
      trust_score: 10.00,
      status: 'SUSPENDED',
      id: 99999,
      password: 'ExploitPassword123!',
      password_hash: '$2b$10$malicioushashhere',
      email: 'hacker@university.edu'
    };

    const exploitRes = await request('PUT', '/users/profile', exploitPayload, tokenA);
    assert(exploitRes.status === 200, 'PUT completed with sanitized whitelist processing');

    // Verify database state: Sensitive fields must NOT have changed
    const [secureCheck] = await db.query(
      'SELECT id, role, trust_score, status, email, password_hash FROM users WHERE id = ?',
      [userA.id]
    );
    const row = secureCheck[0];
    assert(row.id === userA.id, 'User ID was not altered');
    assert(row.role === 'STUDENT', 'User role remains STUDENT (privilege escalation prevented)');
    assert(Number(row.trust_score) === 90.00, 'Trust score was NOT altered by profile update');
    assert(row.status === 'ACTIVE', 'Account status was NOT altered');
    assert(row.email === emailA, 'Email was NOT altered through profile update');
    assert(!row.password_hash.includes('malicioushashhere'), 'Password hash was NOT overwritten');

    // Verify Student A can still log in with their original password
    const verifyLogin = await request('POST', '/auth/login', { email: emailA, password: defaultPassword });
    assert(verifyLogin.status === 200, 'User credentials remain intact and functional');

    // -----------------------------------------------------------------
    // STEP 7: Public Profile Inspection & Privacy
    // -----------------------------------------------------------------
    console.log('\n--- Step 7: Public Profile Inspection & Privacy ---');

    // Student B views Student A's public profile
    const publicRes = await request('GET', `/users/${userA.id}`, null, tokenB);
    assert(publicRes.status === 200, 'Student B can view Student A public profile');
    const pub = publicRes.data.data;
    assert(pub.id === userA.id, 'Public profile ID matches');
    assert(pub.name === 'Alice Pioneer (Robotics)', 'Public profile shows display name');
    assert(pub.department === 'Aerospace & Robotics', 'Public profile shows department');
    assert(pub.year_of_study === 4, 'Public profile shows year of study');
    assert(pub.bio.includes('autonomous quadcopters'), 'Public profile shows biography');
    assert(pub.trust_score !== undefined, 'Public profile includes trust score');
    assert(Array.isArray(pub.active_listings), 'Public profile includes active listings array');
    assert(Array.isArray(pub.reviews), 'Public profile includes reviews array');

    // Privacy verification: Sensitive fields MUST NOT be exposed to public
    assert(pub.password_hash === undefined, 'password_hash is strictly hidden from public profile');
    assert(pub.phone_number === undefined, 'phone_number is strictly hidden from public profile');

    // Nonexistent user check
    const nonExistentRes = await request('GET', '/users/999999', null, tokenB);
    assert(nonExistentRes.status === 404, 'GET /users/999999 returns 404 Not Found');

    // -----------------------------------------------------------------
    // STEP 8: Reviews & Active Listings Integration in Profile
    // -----------------------------------------------------------------
    console.log('\n--- Step 8: Reviews & Active Listings in Profile ---');

    // Create a resource listing owned by Student A
    const [cats] = await db.query('SELECT id FROM categories LIMIT 1');
    const catId = cats[0].id;

    const resA = await request('POST', '/resources', {
      title: `Avionics Micro-Controller ${ts}`,
      description: 'STM32-based flight controller with gyros.',
      category_id: catId,
      exchange_type: 'SELL',
      price: 600,
      item_condition: 'NEW',
      meetup_location: 'Robotics Lab'
    }, tokenA);
    assert(resA.status === 201, 'Student A listed a resource');
    resourceAId = resA.data.data.id;

    // Student B requests exchange
    const reqB = await request('POST', '/exchange-requests', {
      resource_id: resourceAId,
      price_agreed: 600
    }, tokenB);
    assert(reqB.status === 201, 'Student B requested exchange');
    exchangeId = reqB.data.data.id;

    // Student A accepts
    const accRes = await request('PUT', `/exchange-requests/${exchangeId}/accept`, {}, tokenA);
    assert(accRes.status === 200, 'Student A accepted exchange');

    // Generate QR & complete handover
    const qrGen = await request('POST', `/exchange-requests/${exchangeId}/qr`, {}, tokenA);
    assert(qrGen.status === 200, 'Student A generated QR');
    const qrToken = qrGen.data.data.verification_token;

    const qrVer = await request('POST', `/exchange-requests/${exchangeId}/qr/verify`, { verification_token: qrToken }, tokenB);
    assert(qrVer.status === 200, 'Student B verified QR');

    const compRes = await request('PUT', `/exchange-requests/${exchangeId}/complete`, {}, tokenA);
    assert(compRes.status === 200, 'Student A completed exchange');

    // Student B reviews Student A with 5 stars
    const revB = await request('POST', '/reviews', {
      transaction_id: exchangeId,
      rating: 5,
      review_text: 'Flawless condition flight controller and super friendly peer!'
    }, tokenB);
    assert(revB.status === 201, 'Student B submitted 5-star review for Student A');

    // Re-inspect Student A's public profile
    const updatedPub = await request('GET', `/users/${userA.id}`, null, tokenB);
    assert(updatedPub.status === 200, 'Fetched updated public profile');
    const pubData = updatedPub.data.data;

    // Check stats updated
    assert(pubData.stats.completed_exchanges >= 1, 'Profile stats show completed exchange');
    assert(pubData.stats.review_count >= 1, 'Profile stats show at least 1 review');
    assert(pubData.stats.average_rating === 5.0, 'Profile stats show 5.0 average rating');

    // Check review is listed with reviewer details
    const foundReview = pubData.reviews.find(r => r.rating === 5 && r.review_text.includes('Flawless condition'));
    assert(foundReview !== undefined, 'Submitted review appears in profile reviews list');
    assert(foundReview.reviewer_name === 'Bob Explorer', 'Review includes reviewer display name');
    console.log(`     Review verified: "${foundReview.review_text}" by ${foundReview.reviewer_name}`);

    // Create another active resource for Student A
    const resA2 = await request('POST', '/resources', {
      title: `Digital Calipers 150mm ${ts}`,
      description: 'Precision measurement tool.',
      category_id: catId,
      exchange_type: 'BORROW',
      item_condition: 'LIKE_NEW',
      meetup_location: 'Central Library'
    }, tokenA);
    assert(resA2.status === 201, 'Student A listed second resource');

    // Verify active listings appear in profile
    const profileWithListings = await request('GET', `/users/${userA.id}`, null, tokenB);
    const activeItem = profileWithListings.data.data.active_listings.find(item => item.id === resA2.data.data.id);
    assert(activeItem !== undefined, 'Active listing appears in user profile active_listings');
    assert(activeItem.title.includes('Digital Calipers'), 'Active listing title matches');

    // -----------------------------------------------------------------
    // STEP 9: User Isolation
    // -----------------------------------------------------------------
    console.log('\n--- Step 9: User Isolation ---');

    // Verify Student B's own profile was NOT affected by Student A's updates
    const bProfile = await request('GET', '/users/profile', null, tokenB);
    assert(bProfile.data.data.name === 'Bob Explorer', 'Student B profile remains isolated');
    assert(bProfile.data.data.department === 'Mechanical Engineering', 'Student B department intact');

    // -----------------------------------------------------------------
    // STEP 10: Cleanup
    // -----------------------------------------------------------------
    console.log('\n--- Step 10: Cleanup ---');
    await db.query('DELETE FROM reviews WHERE reviewer_id IN (?, ?) OR reviewed_id IN (?, ?)', [userA.id, userB.id, userA.id, userB.id]);
    if (exchangeId) await db.query('DELETE FROM qr_verifications WHERE transaction_id = ?', [exchangeId]);
    await db.query('DELETE FROM exchange_requests WHERE requester_id IN (?, ?)', [userA.id, userB.id]);
    await db.query('DELETE FROM resources WHERE owner_id IN (?, ?)', [userA.id, userB.id]);
    await db.query('DELETE FROM notifications WHERE recipient_id IN (?, ?)', [userA.id, userB.id]);
    await db.query('DELETE FROM users WHERE id IN (?, ?)', [userA.id, userB.id]);
    console.log('  [PASS] Test data cleaned up successfully');

    console.log('\n================================================================');
    console.log(`  ALL M15 PROFILE TESTS PASSED (${passedTests}/${totalTests})`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\nTest execution failed:', err);
    try {
      if (userA || userB) {
        const uids = [userA?.id, userB?.id].filter(Boolean);
        if (uids.length > 0) {
          const ph = uids.map(() => '?').join(',');
          await db.query(`DELETE FROM reviews WHERE reviewer_id IN (${ph}) OR reviewed_id IN (${ph})`, [...uids, ...uids]);
          if (exchangeId) await db.query('DELETE FROM qr_verifications WHERE transaction_id = ?', [exchangeId]);
          await db.query(`DELETE FROM exchange_requests WHERE requester_id IN (${ph})`, uids);
          await db.query(`DELETE FROM resources WHERE owner_id IN (${ph})`, uids);
          await db.query(`DELETE FROM notifications WHERE recipient_id IN (${ph})`, uids);
          await db.query(`DELETE FROM users WHERE id IN (${ph})`, uids);
        }
      }
    } catch (_) {}
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runProfileVerification();
