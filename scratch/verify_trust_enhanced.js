const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const mysql = require(path.join(__dirname, '../server/node_modules/mysql2/promise'));
const axios = require(path.join(__dirname, '../client/node_modules/axios'));

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  let dbConnection;
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('================================================================');
    console.log(' RESOURCEHUB — M17: ENHANCED TRUST & REPUTATION SYSTEM TESTS');
    console.log('================================================================\n');

    // Helper: Clean up and recreate test accounts
    const setupAccounts = async () => {
      await dbConnection.query("DELETE FROM reviews");
      await dbConnection.query("DELETE FROM qr_verifications");
      await dbConnection.query("DELETE FROM exchange_requests");
      await dbConnection.query("DELETE FROM reports");
      await dbConnection.query("DELETE FROM resource_images");
      await dbConnection.query("DELETE FROM resources");
      await dbConnection.query(
        "DELETE FROM users WHERE email IN ('trust_owner@test.edu', 'trust_req@test.edu', 'trust_iso@test.edu', 'trust_admin@test.edu')"
      );

      // Register owner
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Trust Owner',
        email: 'trust_owner@test.edu',
        password: 'Password123',
        department: 'CS',
        year_of_study: 3
      });

      // Register requester
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Trust Requester',
        email: 'trust_req@test.edu',
        password: 'Password123',
        department: 'EE',
        year_of_study: 2
      });

      // Register isolated user
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Trust Isolated',
        email: 'trust_iso@test.edu',
        password: 'Password123',
        department: 'ME',
        year_of_study: 1
      });

      // Register admin
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Trust Admin',
        email: 'trust_admin@test.edu',
        password: 'Password123',
        department: 'AdminDept',
        year_of_study: 4
      });

      // Activate all test accounts & elevate admin
      await dbConnection.query("UPDATE users SET status = 'ACTIVE' WHERE email IN ('trust_owner@test.edu', 'trust_req@test.edu', 'trust_iso@test.edu', 'trust_admin@test.edu')");
      await dbConnection.query("UPDATE users SET role = 'ADMIN' WHERE email = 'trust_admin@test.edu'");

      // Login to get tokens
      const loginOwner = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'trust_owner@test.edu',
        password: 'Password123'
      });
      const loginReq = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'trust_req@test.edu',
        password: 'Password123'
      });
      const loginIso = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'trust_iso@test.edu',
        password: 'Password123'
      });
      const loginAdmin = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'trust_admin@test.edu',
        password: 'Password123'
      });

      return {
        tokenOwner: loginOwner.data.data.token,
        tokenReq: loginReq.data.data.token,
        tokenIso: loginIso.data.data.token,
        tokenAdmin: loginAdmin.data.data.token,
        userOwner: loginOwner.data.data.user,
        userReq: loginReq.data.data.user,
        userIso: loginIso.data.data.user
      };
    };

    // -------------------------------------------------------------
    // TEST 1: Initial Baseline Reputation Score & Breakdown
    // -------------------------------------------------------------
    console.log('TEST 1: Baseline Reputation Score & Factor Verification');
    const { tokenOwner, tokenReq, tokenIso, tokenAdmin, userOwner, userReq, userIso } = await setupAccounts();

    const baselineRepRes = await axios.get(`${BASE_URL}/users/${userOwner.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });

    assert(baselineRepRes.status === 200, 'Baseline reputation endpoint returns 200');
    const repData = baselineRepRes.data.data;
    assert(repData.reputation_score !== undefined, 'Reputation score is returned');
    assert(repData.tier !== undefined, 'Reputation tier is returned');
    assert(repData.factors !== undefined, '4-factor breakdown object exists');
    assert(repData.factors.review_quality.weight_percent === 40, 'Review quality weight is 40%');
    assert(repData.factors.completed_exchanges.weight_percent === 30, 'Completed exchanges weight is 30%');
    assert(repData.factors.reliability.weight_percent === 20, 'Reliability weight is 20%');
    assert(repData.factors.account_standing.weight_percent === 10, 'Account standing weight is 10%');
    
    // For new user with 0 completed exchanges:
    // Review: 100 * 0.40 = 40.0 pts
    // Exchanges: 0 * 0.30 = 0.0 pts
    // Reliability: 100 * 0.20 = 20.0 pts
    // Account Standing: 100 * 0.10 = 10.0 pts
    // Total Baseline = 40 + 0 + 20 + 10 = 70.0 pts
    assert(repData.reputation_score === 70.00, `Baseline score for new member with 0 exchanges is exactly 70.00 (got ${repData.reputation_score})`);
    console.log(`  -> Baseline score: ${repData.reputation_score} (${repData.tier})`);

    // -------------------------------------------------------------
    // TEST 2: Completed Exchange Increases Reputation Points
    // -------------------------------------------------------------
    console.log('\nTEST 2: Completed Exchange Increases Reputation Volume & Points');
    
    // 1. Owner lists resource
    const [catRows] = await dbConnection.query('SELECT id FROM categories LIMIT 1');
    const catId = catRows[0].id;
    const resListing = await axios.post(`${BASE_URL}/resources`, {
      title: 'Operating Systems Concepts Book',
      description: 'Used 10th edition textbook for CS student',
      category_id: catId,
      exchange_type: 'BORROW',
      item_condition: 'GOOD',
      meetup_location: 'Central Library'
    }, { headers: { Authorization: `Bearer ${tokenOwner}` } });
    const resourceId = resListing.data.data.id;

    // 2. Requester requests exchange
    const reqRes = await axios.post(`${BASE_URL}/exchange-requests`, {
      resource_id: resourceId,
      borrow_duration_days: 7
    }, { headers: { Authorization: `Bearer ${tokenReq}` } });
    const exchangeId = reqRes.data.data.id;

    // 3. Owner accepts request
    await axios.patch(`${BASE_URL}/exchange-requests/${exchangeId}/accept`, {}, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });

    // 4. Owner generates QR
    const qrGenRes = await axios.post(`${BASE_URL}/exchange-requests/${exchangeId}/qr`, {}, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    const qrToken = qrGenRes.data.data.verification_token;

    // 5. Requester verifies QR
    await axios.post(`${BASE_URL}/exchange-requests/${exchangeId}/qr/verify`, {
      verification_token: qrToken
    }, { headers: { Authorization: `Bearer ${tokenReq}` } });

    // 6. Complete exchange
    await axios.patch(`${BASE_URL}/exchange-requests/${exchangeId}/complete`, {}, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });

    // Check updated owner reputation score
    const updatedOwnerRepRes = await axios.get(`${BASE_URL}/users/${userOwner.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    const updatedOwnerRep = updatedOwnerRepRes.data.data;
    assert(updatedOwnerRep.factors.completed_exchanges.completed_count === 1, 'Owner completed exchanges count is now 1');
    assert(updatedOwnerRep.factors.completed_exchanges.qr_verified_count === 1, 'Owner verified QR count is now 1');
    assert(updatedOwnerRep.reputation_score > 70.00, `Owner reputation score increased above baseline (now ${updatedOwnerRep.reputation_score})`);
    console.log(`  -> Owner score after 1 verified exchange: ${updatedOwnerRep.reputation_score}`);

    // Check requester reputation score also updated
    const updatedReqRepRes = await axios.get(`${BASE_URL}/users/${userReq.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenReq}` }
    });
    const updatedReqRep = updatedReqRepRes.data.data;
    assert(updatedReqRep.factors.completed_exchanges.completed_count === 1, 'Requester completed count is now 1');
    assert(updatedReqRep.reputation_score > 70.00, `Requester reputation score increased above baseline (now ${updatedReqRep.reputation_score})`);

    // -------------------------------------------------------------
    // TEST 3: Cancellation Affects Reliability Factor Score
    // -------------------------------------------------------------
    console.log('\nTEST 3: Cancellation Affects Reliability Score');

    // Create another listing & request, then cancel it
    const resListing2 = await axios.post(`${BASE_URL}/resources`, {
      title: 'Lab Kit Arduino',
      description: 'Complete Arduino starter kit',
      category_id: catId,
      exchange_type: 'BORROW',
      item_condition: 'LIKE_NEW',
      meetup_location: 'EE Block'
    }, { headers: { Authorization: `Bearer ${tokenOwner}` } });

    const reqRes2 = await axios.post(`${BASE_URL}/exchange-requests`, {
      resource_id: resListing2.data.data.id,
      borrow_duration_days: 3
    }, { headers: { Authorization: `Bearer ${tokenReq}` } });
    const exchangeId2 = reqRes2.data.data.id;

    const scoreBeforeCancel = updatedReqRep.reputation_score;

    // Requester cancels request
    await axios.patch(`${BASE_URL}/exchange-requests/${exchangeId2}/cancel`, {}, {
      headers: { Authorization: `Bearer ${tokenReq}` }
    });

    const repAfterCancelRes = await axios.get(`${BASE_URL}/users/${userReq.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenReq}` }
    });
    const repAfterCancel = repAfterCancelRes.data.data;
    assert(repAfterCancel.factors.reliability.cancelled_count === 1, 'Requester cancelled count is now 1');
    assert(repAfterCancel.factors.reliability.cancellation_rate > 0, 'Requester cancellation rate is > 0');
    assert(repAfterCancel.factors.reliability.factor_score < 100, 'Requester reliability factor score dropped below 100%');
    assert(repAfterCancel.reputation_score < scoreBeforeCancel, `Requester reputation score decreased after cancellation (${repAfterCancel.reputation_score} < ${scoreBeforeCancel})`);
    console.log(`  -> Requester score after cancellation: ${repAfterCancel.reputation_score} (Reliability factor: ${repAfterCancel.factors.reliability.factor_score}%)`);

    // -------------------------------------------------------------
    // TEST 4: Peer Review Rating Influences Reputation and M8 Trust Score
    // -------------------------------------------------------------
    console.log('\nTEST 4: Peer Review Updates Both Legacy trust_score and M17 reputation_score');

    // Requester reviews Owner with 5 stars for the completed exchange
    const reviewRes = await axios.post(`${BASE_URL}/reviews`, {
      transaction_id: exchangeId,
      rating: 5,
      review_text: 'Excellent peer! Handover was smooth and verified.'
    }, { headers: { Authorization: `Bearer ${tokenReq}` } });

    assert(reviewRes.status === 201, 'Review submitted successfully (201)');
    const reviewedData = reviewRes.data.data.reviewed_user;
    assert(reviewedData.trust_score === 100.00, `Legacy trust_score strictly maintains M8 formula (5★ = 100.00, got ${reviewedData.trust_score})`);
    assert(reviewedData.reputation_score !== undefined, 'reputation_score returned in review response');

    // Check DB record directly
    const [dbOwnerRows] = await dbConnection.query('SELECT trust_score, reputation_score FROM users WHERE id = ?', [userOwner.id]);
    assert(parseFloat(dbOwnerRows[0].trust_score) === 100.00, 'DB users.trust_score is 100.00');
    assert(parseFloat(dbOwnerRows[0].reputation_score) > 70.00, 'DB users.reputation_score is > 70.00');
    console.log(`  -> Owner DB record: trust_score=${dbOwnerRows[0].trust_score}, reputation_score=${dbOwnerRows[0].reputation_score}`);

    // -------------------------------------------------------------
    // TEST 5: Duplicate Review Prevention (Anti-Manipulation)
    // -------------------------------------------------------------
    console.log('\nTEST 5: Duplicate Review Prevention (Anti-Manipulation)');
    try {
      await axios.post(`${BASE_URL}/reviews`, {
        transaction_id: exchangeId,
        rating: 1,
        review_text: 'Trying to manipulate review rating'
      }, { headers: { Authorization: `Bearer ${tokenReq}` } });
      assert(false, 'Duplicate review should be rejected with 409');
    } catch (dupErr) {
      assert(dupErr.response && dupErr.response.status === 409, 'Duplicate review rejected with 409 Conflict');
    }

    // Ensure score did not change after attempted manipulation
    const [dbOwnerAfterDup] = await dbConnection.query('SELECT trust_score, reputation_score FROM users WHERE id = ?', [userOwner.id]);
    assert(parseFloat(dbOwnerAfterDup[0].trust_score) === 100.00, 'Trust score remained 100.00 after blocked duplicate review');

    // -------------------------------------------------------------
    // TEST 6: Transaction Rollback Integrity
    // -------------------------------------------------------------
    console.log('\nTEST 6: Transaction Rollback Integrity');
    // Simulate rollback during review creation via testing header
    // Owner tries to review requester with simulated failure
    const [reqBeforeRollback] = await dbConnection.query('SELECT trust_score, reputation_score FROM users WHERE id = ?', [userReq.id]);
    try {
      await axios.post(`${BASE_URL}/reviews`, {
        transaction_id: exchangeId,
        rating: 4,
        review_text: 'Good transaction'
      }, { 
        headers: { 
          Authorization: `Bearer ${tokenOwner}`,
          'x-simulate-rollback': 'true'
        } 
      });
      assert(false, 'Simulated rollback error was expected');
    } catch (rbErr) {
      assert(rbErr.response && rbErr.response.status === 500, 'Rollback error correctly caught and returned 500');
    }

    const [reqAfterRollback] = await dbConnection.query('SELECT trust_score, reputation_score FROM users WHERE id = ?', [userReq.id]);
    assert(parseFloat(reqAfterRollback[0].reputation_score) === parseFloat(reqBeforeRollback[0].reputation_score), 'Requester reputation score untouched after transaction rollback');

    // -------------------------------------------------------------
    // TEST 7: User Isolation
    // -------------------------------------------------------------
    console.log('\nTEST 7: User Isolation');
    const [isoRows] = await dbConnection.query('SELECT trust_score, reputation_score FROM users WHERE id = ?', [userIso.id]);
    assert(parseFloat(isoRows[0].trust_score) === 100.00, 'Isolated user trust score untouched in DB (100.00)');
    
    const isoRepRes = await axios.get(`${BASE_URL}/users/${userIso.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenIso}` }
    });
    assert(isoRepRes.data.data.reputation_score === 70.00, 'Isolated user reputation score remains strictly at baseline 70.00');

    // -------------------------------------------------------------
    // TEST 8: Safe Boundaries Clamped Between [0.00, 100.00]
    // -------------------------------------------------------------
    console.log('\nTEST 8: Safe Boundary Clamping [0.00, 100.00]');
    const repBreakdown = await axios.get(`${BASE_URL}/users/${userOwner.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    const s = repBreakdown.data.data.reputation_score;
    assert(s >= 0.00 && s <= 100.00, `Reputation score (${s}) is within safe boundary [0.00, 100.00]`);

    // -------------------------------------------------------------
    // TEST 9: Admin Inspection Endpoint (GET /api/admin/users/:id/reputation)
    // -------------------------------------------------------------
    console.log('\nTEST 9: Admin Inspection Endpoint');
    const adminRepRes = await axios.get(`${BASE_URL}/admin/users/${userOwner.id}/reputation`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert(adminRepRes.status === 200, 'Admin can inspect user reputation breakdown (200)');
    assert(adminRepRes.data.data.factors !== undefined, 'Admin inspection contains factors');
    assert(adminRepRes.data.data.badges !== undefined, 'Admin inspection contains badges list');

    // Test non-admin cannot access admin endpoint
    try {
      await axios.get(`${BASE_URL}/admin/users/${userOwner.id}/reputation`, {
        headers: { Authorization: `Bearer ${tokenOwner}` }
      });
      assert(false, 'Non-admin access to admin inspection must be rejected');
    } catch (forbidErr) {
      assert(forbidErr.response && forbidErr.response.status === 403, 'Non-admin rejected with 403 Forbidden');
    }

    // -------------------------------------------------------------
    // TEST 10: Admin User List Includes reputation_score
    // -------------------------------------------------------------
    console.log('\nTEST 10: Admin User List Includes reputation_score');
    const adminUsersRes = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert(adminUsersRes.status === 200, 'Admin users list returns 200');
    const adminUserList = adminUsersRes.data.data;
    const ownerFromAdmin = adminUserList.find(u => u.id === userOwner.id);
    assert(ownerFromAdmin !== undefined, 'Owner found in admin user list');
    assert(ownerFromAdmin.reputation_score !== undefined, 'Owner has reputation_score in admin list');
    assert(ownerFromAdmin.trust_score !== undefined, 'Owner has trust_score in admin list');

    console.log('\n================================================================');
    console.log(` ALL M17 TESTS PASSED SUCCESSFULLY (${passedTests}/${totalTests})`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\nTest Suite Failed with error:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  } finally {
    if (dbConnection) {
      await dbConnection.end();
    }
  }
}

runTests();
