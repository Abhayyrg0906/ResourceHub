const http = require('http');
const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');

const BASE_URL = 'http://localhost:5000/api';

function request(method, pathName, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + pathName);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    let body = null;
    if (data) {
      body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => (resBody += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, ok: false, raw: resBody });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('    RESOURCEHUB — M19: DASHBOARD ANALYTICS TEST SUITE          ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();

    // ----------------------------------------------------
    // STEP 1: User & Admin Setup
    // ----------------------------------------------------
    console.log('--- Step 1: User & Admin Setup ---');
    const studentAEmail = `student_a_${timestamp}@university.edu`;
    const studentBEmail = `student_b_${timestamp}@university.edu`;
    const adminEmail = `admin_m19_${timestamp}@university.edu`;
    const password = 'Password123!';

    // Register Student A
    const regA = await request('POST', '/auth/register', {
      name: 'Student Alpha',
      email: studentAEmail,
      password: password,
      department: 'Computer Science',
      year_of_study: 3
    });
    assert(regA.status === 201, 'Student A registered successfully');

    const logA = await request('POST', '/auth/login', { email: studentAEmail, password: password });
    const tokenA = logA.data?.data?.token;
    const userA = logA.data?.data?.user;
    assert(tokenA !== undefined, 'Student A logged in successfully');

    // Register Student B
    const regB = await request('POST', '/auth/register', {
      name: 'Student Beta',
      email: studentBEmail,
      password: password,
      department: 'Mechanical Engineering',
      year_of_study: 2
    });
    assert(regB.status === 201, 'Student B registered successfully');

    const logB = await request('POST', '/auth/login', { email: studentBEmail, password: password });
    const tokenB = logB.data?.data?.token;
    const userB = logB.data?.data?.user;
    assert(tokenB !== undefined, 'Student B logged in successfully');

    // Setup Admin user
    await request('POST', '/auth/register', {
      name: 'Platform Administrator',
      email: adminEmail,
      password: password,
      department: 'Administration',
      year_of_study: 4
    });
    await db.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE email = ?", [adminEmail]);

    const logAdmin = await request('POST', '/auth/login', { email: adminEmail, password: password });
    const adminToken = logAdmin.data?.data?.token;
    assert(adminToken !== undefined, 'Administrator authenticated successfully');

    // ----------------------------------------------------
    // STEP 2: Authentication & Authorization Enforcement
    // ----------------------------------------------------
    console.log('\n--- Step 2: Authentication & Authorization Enforcement ---');
    
    // 2a. Unauthenticated access blocked (401)
    const unauthStudentRes = await request('GET', '/analytics/student');
    assert(unauthStudentRes.status === 401, 'GET /analytics/student rejects unauthenticated requests with 401');

    const unauthAdminRes = await request('GET', '/analytics/admin');
    assert(unauthAdminRes.status === 401, 'GET /analytics/admin rejects unauthenticated requests with 401');

    const unauthAdminStatsRes = await request('GET', '/admin/stats');
    assert(unauthAdminStatsRes.status === 401, 'GET /admin/stats rejects unauthenticated requests with 401');

    // 2b. Student access to Admin analytics blocked (403)
    const studentToAdminRes = await request('GET', '/analytics/admin', null, tokenA);
    assert(studentToAdminRes.status === 403, 'GET /analytics/admin rejects student request with 403 Forbidden');

    const studentToAdminStatsRes = await request('GET', '/admin/stats', null, tokenA);
    assert(studentToAdminStatsRes.status === 403, 'GET /admin/stats rejects student request with 403 Forbidden');

    const studentToAdminAnalyticsRes = await request('GET', '/admin/analytics', null, tokenA);
    assert(studentToAdminAnalyticsRes.status === 403, 'GET /admin/analytics rejects student request with 403 Forbidden');

    // 2c. Student access to Student analytics allowed (200)
    const studentAnalyticsRes = await request('GET', '/analytics/student', null, tokenA);
    assert(studentAnalyticsRes.status === 200, 'GET /analytics/student allows authenticated student (200 OK)');
    assert(studentAnalyticsRes.data.success === true, 'Response indicates success');

    // Alias /analytics/me check
    const studentMeRes = await request('GET', '/analytics/me', null, tokenA);
    assert(studentMeRes.status === 200, 'GET /analytics/me alias endpoint succeeds (200 OK)');

    // 2d. Admin access to Admin analytics allowed (200)
    const adminAnalyticsRes = await request('GET', '/analytics/admin', null, adminToken);
    assert(adminAnalyticsRes.status === 200, 'GET /analytics/admin allows administrator (200 OK)');

    const adminStatsRes = await request('GET', '/admin/stats', null, adminToken);
    assert(adminStatsRes.status === 200, 'GET /admin/stats allows administrator (200 OK)');

    // ----------------------------------------------------
    // STEP 3: Strict User Isolation Testing
    // ----------------------------------------------------
    console.log('\n--- Step 3: Strict User Isolation Testing ---');

    // Student B has done nothing yet -> should have 0 listings, 0 wishlist, 0 trades
    const bInitialAnalytics = await request('GET', '/analytics/student', null, tokenB);
    assert(bInitialAnalytics.data.data.total_listings === 0, 'Student B starts with exactly 0 listings');
    assert(bInitialAnalytics.data.data.available_listings === 0, 'Student B starts with exactly 0 available listings');
    assert(bInitialAnalytics.data.data.completed_exchanges === 0, 'Student B starts with exactly 0 completed exchanges');
    assert(bInitialAnalytics.data.data.pending_requests === 0, 'Student B starts with exactly 0 pending requests');
    assert(bInitialAnalytics.data.data.wishlist_count === 0, 'Student B starts with exactly 0 wishlist items');

    // Student A creates 2 listings
    const catRes = await request('GET', '/categories');
    const categoryId = catRes.data.data[0].id;

    const create1 = await request('POST', '/resources', {
      title: `Calculus Textbook ${timestamp}`,
      description: 'Clean textbook for university calculus course.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 30.00,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Library 1st Floor'
    }, tokenA);
    assert(create1.status === 201, 'Student A created listing 1');
    const resource1Id = create1.data.data.id;

    const create2 = await request('POST', '/resources', {
      title: `Lab Goggles ${timestamp}`,
      description: 'Standard protective campus lab goggles.',
      category_id: categoryId,
      exchange_type: 'BORROW',
      price: null,
      item_condition: 'GOOD',
      meetup_location: 'Chemistry Hall'
    }, tokenA);
    assert(create2.status === 201, 'Student A created listing 2');

    // Student A saves listing in wishlist
    const wishRes = await request('POST', `/wishlist/${resource1Id}`, null, tokenA);
    assert(wishRes.status === 201 || wishRes.status === 200, 'Student A added resource to wishlist');

    // Re-check Student A analytics
    const aAnalyticsAfterCreate = await request('GET', '/analytics/student', null, tokenA);
    assert(aAnalyticsAfterCreate.data.data.total_listings === 2, 'Student A analytics reflects 2 total listings');
    assert(aAnalyticsAfterCreate.data.data.available_listings === 2, 'Student A analytics reflects 2 available listings');
    assert(aAnalyticsAfterCreate.data.data.wishlist_count === 1, 'Student A analytics reflects 1 wishlist item');

    // Verify Student B analytics is completely unaffected (Tenant Isolation)
    const bAnalyticsAfterCreate = await request('GET', '/analytics/student', null, tokenB);
    assert(bAnalyticsAfterCreate.data.data.total_listings === 0, 'Student B analytics strictly isolated: total_listings remains 0');
    assert(bAnalyticsAfterCreate.data.data.available_listings === 0, 'Student B analytics strictly isolated: available_listings remains 0');
    assert(bAnalyticsAfterCreate.data.data.wishlist_count === 0, 'Student B analytics strictly isolated: wishlist_count remains 0');

    // ----------------------------------------------------
    // STEP 4: Accurate Student Metric Aggregations
    // ----------------------------------------------------
    console.log('\n--- Step 4: Accurate Student Metric Aggregations ---');

    // 4a. Pending Requests (Incoming for Student A, Outgoing for Student B)
    const reqRes = await request('POST', '/exchange-requests', {
      resource_id: resource1Id,
      proposed_exchange_type: 'SELL',
      message: 'Hello, I want to purchase this textbook!'
    }, tokenB);
    assert(reqRes.status === 201, 'Student B proposed exchange request to Student A');
    const transactionId = reqRes.data.data.id;

    const aAfterReq = await request('GET', '/analytics/student', null, tokenA);
    assert(aAfterReq.data.data.pending_requests === 1, 'Student A pending_requests accurately incremented to 1');
    assert(aAfterReq.data.data.exchanges_breakdown.incoming_pending === 1, 'Student A has 1 incoming pending request');
    assert(aAfterReq.data.data.actionable_pending_requests.length === 1, 'Student A actionable_pending_requests contains the request');

    const bAfterReq = await request('GET', '/analytics/student', null, tokenB);
    assert(bAfterReq.data.data.pending_requests === 1, 'Student B pending_requests accurately reflects 1 outgoing request');
    assert(bAfterReq.data.data.exchanges_breakdown.outgoing_pending === 1, 'Student B has 1 outgoing pending request');

    // 4b. QR Handover & Exchange Completion
    // Student A accepts request
    const acceptRes = await request('PATCH', `/exchange-requests/${transactionId}/accept`, {}, tokenA);
    assert(acceptRes.status === 200, 'Student A accepted exchange request');

    // Student A generates handover QR
    const qrGenRes = await request('POST', `/exchange-requests/${transactionId}/qr/generate`, null, tokenA);
    assert(qrGenRes.status === 200, 'Student A generated handover QR code');
    const qrToken = qrGenRes.data.data.verification_token;

    // Student B verifies handover QR
    const qrScanRes = await request('POST', `/exchange-requests/${transactionId}/qr/verify`, { verification_token: qrToken }, tokenB);
    assert(qrScanRes.status === 200, 'Student B scanned and verified handover QR code');

    // Student A completes transaction
    const completeRes = await request('PATCH', `/exchange-requests/${transactionId}/complete`, {}, tokenA);
    assert(completeRes.status === 200, 'Student A completed exchange transaction');

    // 4c. Verify Completed Exchanges & QR Handovers for both participants
    const aAfterComplete = await request('GET', '/analytics/student', null, tokenA);
    assert(aAfterComplete.data.data.completed_exchanges === 1, 'Student A completed_exchanges accurately shows 1');
    assert(aAfterComplete.data.data.successful_qr_handovers === 1, 'Student A successful_qr_handovers accurately shows 1');
    assert(aAfterComplete.data.data.pending_requests === 0, 'Student A pending_requests cleared to 0');
    assert(aAfterComplete.data.data.available_listings === 1, 'Student A available_listings decremented to 1 (exchanged)');

    const bAfterComplete = await request('GET', '/analytics/student', null, tokenB);
    assert(bAfterComplete.data.data.completed_exchanges === 1, 'Student B completed_exchanges accurately shows 1');
    assert(bAfterComplete.data.data.successful_qr_handovers === 1, 'Student B successful_qr_handovers accurately shows 1');
    assert(bAfterComplete.data.data.pending_requests === 0, 'Student B pending_requests cleared to 0');

    // 4d. Reviews & Trust Score Aggregation
    // Student B submits 5-star review for Student A
    const reviewRes = await request('POST', '/reviews', {
      transaction_id: transactionId,
      rating: 5,
      review_text: 'Excellent seller, textbook in mint condition!'
    }, tokenB);
    assert(reviewRes.status === 201, 'Student B submitted 5-star review for Student A');

    const aAfterReview = await request('GET', '/analytics/student', null, tokenA);
    assert(aAfterReview.data.data.reviews_received === 1, 'Student A reviews_received accurately shows 1');
    assert(aAfterReview.data.data.average_rating_received === 5.0, 'Student A average_rating_received is 5.0');
    assert(aAfterReview.data.data.trust_score === 100.0, 'Student A trust_score reflects 100%');
    assert(typeof aAfterReview.data.data.reputation_score === 'number', 'Student A reputation_score is valid number');
    assert(typeof aAfterReview.data.data.reputation_tier === 'string', 'Student A reputation_tier is valid tier string');

    // ----------------------------------------------------
    // STEP 5: Platform Administrator Analytics Aggregation
    // ----------------------------------------------------
    console.log('\n--- Step 5: Platform Administrator Analytics Aggregation ---');
    const adminAnalytics = await request('GET', '/analytics/admin', null, adminToken);
    assert(adminAnalytics.status === 200, 'Fetched administrator analytics');
    const aData = adminAnalytics.data.data;

    // 5a. Backward Compatibility with M10 / M11
    assert(typeof aData.total_users === 'number' && aData.total_users >= 3, 'Top-level total_users is number (>= 3)');
    assert(typeof aData.active_users === 'number' && aData.active_users >= 1, 'Top-level active_users is number (>= 1)');
    assert(typeof aData.total_resources === 'number' && aData.total_resources >= 2, 'Top-level total_resources is number (>= 2)');
    assert(typeof aData.available_resources === 'number', 'Top-level available_resources is number');
    assert(typeof aData.total_exchange_requests === 'number' && aData.total_exchange_requests >= 1, 'Top-level total_exchange_requests >= 1');
    assert(typeof aData.completed_exchanges === 'number' && aData.completed_exchanges >= 1, 'Top-level completed_exchanges >= 1');
    assert(typeof aData.pending_reports === 'number', 'Top-level pending_reports is number');

    // 5b. Completion Rate
    assert(typeof aData.completion_rate === 'number', 'Completion rate calculated as number');
    assert(aData.completion_rate >= 0 && aData.completion_rate <= 100, `Completion rate within valid range [0, 100]: ${aData.completion_rate}%`);

    // 5c. Category Breakdown Objects
    assert(aData.users !== undefined && typeof aData.users.students === 'number', 'Users breakdown contains student count');
    assert(aData.resources !== undefined && typeof aData.resources.exchange_types === 'object', 'Resources breakdown contains exchange types');
    assert(aData.exchanges !== undefined && typeof aData.exchanges.completed === 'number', 'Exchanges breakdown contains completed count');
    assert(aData.qr_verifications !== undefined && aData.qr_verifications.verified >= 1, 'QR verifications contains verified handovers count');
    assert(typeof aData.qr_verifications.verification_rate === 'number', 'QR verification rate is valid percentage');
    assert(aData.reviews !== undefined && aData.reviews.total >= 1, 'Reviews breakdown reflects submitted reviews');
    assert(aData.reviews.distribution['5'] >= 1, 'Reviews distribution correctly records 5-star review');
    assert(aData.reports !== undefined && typeof aData.reports.total === 'number', 'Reports moderation statistics present');
    assert(aData.notifications !== undefined && typeof aData.notifications.total === 'number', 'Notification activity statistics present');

    // 5d. GET /api/admin/stats identical validation
    const adminStatsLegacy = await request('GET', '/admin/stats', null, adminToken);
    assert(adminStatsLegacy.status === 200, 'GET /admin/stats responds with 200 OK');
    assert(adminStatsLegacy.data.data.total_users === aData.total_users, 'GET /admin/stats total_users matches analytics');
    assert(adminStatsLegacy.data.data.completion_rate === aData.completion_rate, 'GET /admin/stats completion_rate matches analytics');

  } catch (err) {
    console.error('\n[UNEXPECTED TEST EXCEPTION]:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`  M19 ANALYTICS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
