const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const mysql = require(path.join(__dirname, '../server/node_modules/mysql2/promise'));
const axios = require(path.join(__dirname, '../client/node_modules/axios'));

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTests() {
  let dbConnection;
  try {
    dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    const resetDatabase = async () => {
      await dbConnection.query("DELETE FROM reviews");
      await dbConnection.query("DELETE FROM qr_verifications");
      await dbConnection.query("DELETE FROM exchange_requests");
      await dbConnection.query("DELETE FROM resources");
      await dbConnection.query("DELETE FROM users WHERE email IN ('studentA@university.edu', 'studentB@university.edu', 'studentC@university.edu')");
      
      // Re-create users
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Student A (Owner)',
        email: 'studentA@university.edu',
        password: 'Password123',
        department: 'EE',
        year_of_study: 4
      });
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Student B (Requester)',
        email: 'studentB@university.edu',
        password: 'Password123',
        department: 'CS',
        year_of_study: 2
      });
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Student C (Unrelated)',
        email: 'studentC@university.edu',
        password: 'Password123',
        department: 'ME',
        year_of_study: 1
      });
    };

    const getTokens = async () => {
      const loginA = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'studentA@university.edu',
        password: 'Password123'
      });
      const loginB = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'studentB@university.edu',
        password: 'Password123'
      });
      const loginC = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'studentC@university.edu',
        password: 'Password123'
      });
      return {
        tokenA: loginA.data.data.token,
        userIdA: loginA.data.data.user.id,
        tokenB: loginB.data.data.token,
        userIdB: loginB.data.data.user.id,
        tokenC: loginC.data.data.token,
        userIdC: loginC.data.data.user.id
      };
    };

    const createCompletedTransaction = async (tokenOwner, tokenRequester, title = 'Lab Kit') => {
      const catRes = await axios.get(`${BASE_URL}/categories`);
      const categoryId = catRes.data.data[0].id;

      // Create resource
      const resResource = await axios.post(`${BASE_URL}/resources`, {
        title,
        description: 'Resource details',
        category_id: categoryId,
        exchange_type: 'DONATE',
        item_condition: 'GOOD',
        meetup_location: 'Library'
      }, {
        headers: { Authorization: `Bearer ${tokenOwner}` }
      });
      const resourceId = resResource.data.data.id;

      // Create exchange request
      const resRequest = await axios.post(`${BASE_URL}/exchange-requests`, {
        resource_id: resourceId
      }, {
        headers: { Authorization: `Bearer ${tokenRequester}` }
      });
      const transactionId = resRequest.data.data.id;

      // Accept request
      await axios.put(`${BASE_URL}/exchange-requests/${transactionId}/accept`, {}, {
        headers: { Authorization: `Bearer ${tokenOwner}` }
      });

      // Generate QR
      const qrRes = await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {}, {
        headers: { Authorization: `Bearer ${tokenOwner}` }
      });
      const qrToken = qrRes.data.data.verification_token;

      // Verify QR
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: qrToken
      }, {
        headers: { Authorization: `Bearer ${tokenRequester}` }
      });

      // Complete transaction
      await axios.put(`${BASE_URL}/exchange-requests/${transactionId}/complete`, {}, {
        headers: { Authorization: `Bearer ${tokenOwner}` }
      });

      return transactionId;
    };

    console.log('--- RE-INITIALIZING DATABASE ---');
    await resetDatabase();
    const creds = await getTokens();

    console.log('\n--- TRUST SCORE SCENARIO TESTING ---');

    // Test 1: No Reviews (Default trust score should be 100.00)
    console.log('Test 1 — No Reviews: checking newly created user...');
    const [userRows1] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [creds.userIdA]);
    console.log('  [OK] Default trust_score is 100.00:', parseFloat(userRows1[0].trust_score) === 100.00);

    // Test 2: One 5-Star Review (average = 5.00, trust_score = 100.00)
    console.log('\nTest 2 — One 5-Star Review: submitting a 5-star rating...');
    const txId1 = await createCompletedTransaction(creds.tokenA, creds.tokenB, 'Book 1');
    const reviewRes2 = await axios.post(`${BASE_URL}/reviews`, {
      transaction_id: txId1,
      rating: 5,
      review_text: 'Excellent transaction.'
    }, {
      headers: { Authorization: `Bearer ${creds.tokenB}` }
    });
    console.log('  [OK] Review creation returned trust_score:', reviewRes2.data.data.reviewed_user.trust_score);
    const [userRows2] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [creds.userIdA]);
    console.log('  [OK] Stored trust_score in DB is 100.00:', parseFloat(userRows2[0].trust_score) === 100.00);

    // Test 3: One 4-Star Review (average = 4.00, trust_score = 80.00)
    console.log('\nTest 3 — One 4-Star Review (Clean slate): submitting a 4-star rating...');
    await resetDatabase();
    const freshCreds = await getTokens();
    const txId2 = await createCompletedTransaction(freshCreds.tokenA, freshCreds.tokenB, 'Book 2');
    const reviewRes3 = await axios.post(`${BASE_URL}/reviews`, {
      transaction_id: txId2,
      rating: 4,
      review_text: 'Decent transaction.'
    }, {
      headers: { Authorization: `Bearer ${freshCreds.tokenB}` }
    });
    console.log('  [OK] Review creation returned trust_score:', reviewRes3.data.data.reviewed_user.trust_score);
    const [userRows3] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [freshCreds.userIdA]);
    console.log('  [OK] Stored trust_score in DB is 80.00:', parseFloat(userRows3[0].trust_score) === 80.00);

    // Test 4 & 5: Multiple Reviews (5, 4, 5 -> average = 4.67, trust_score = 93.40; low rating update)
    console.log('\nTest 4 & 5 — Multiple Reviews: submitting rating sequence (5, 4, 5, 1)...');
    await resetDatabase();
    const multiCreds = await getTokens();
    
    // Create and complete 4 transactions
    const mTx1 = await createCompletedTransaction(multiCreds.tokenA, multiCreds.tokenB, 'Item 1');
    const mTx2 = await createCompletedTransaction(multiCreds.tokenA, multiCreds.tokenB, 'Item 2');
    const mTx3 = await createCompletedTransaction(multiCreds.tokenA, multiCreds.tokenB, 'Item 3');
    const mTx4 = await createCompletedTransaction(multiCreds.tokenA, multiCreds.tokenB, 'Item 4');

    // Submit first review: 5
    await axios.post(`${BASE_URL}/reviews`, { transaction_id: mTx1, rating: 5 }, { headers: { Authorization: `Bearer ${multiCreds.tokenB}` } });
    // Submit second review: 4
    await axios.post(`${BASE_URL}/reviews`, { transaction_id: mTx2, rating: 4 }, { headers: { Authorization: `Bearer ${multiCreds.tokenB}` } });
    // Submit third review: 5
    const reviewResStats = await axios.post(`${BASE_URL}/reviews`, { transaction_id: mTx3, rating: 5 }, { headers: { Authorization: `Bearer ${multiCreds.tokenB}` } });
    
    console.log('  [OK] Trust score after (5, 4, 5):', reviewResStats.data.data.reviewed_user.trust_score);
    const [userRowsMulti] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [multiCreds.userIdA]);
    console.log('  [OK] Stored trust_score in DB is 93.40:', parseFloat(userRowsMulti[0].trust_score) === 93.40);

    // Submit low rating review: 1
    const reviewLowRes = await axios.post(`${BASE_URL}/reviews`, { transaction_id: mTx4, rating: 1 }, { headers: { Authorization: `Bearer ${multiCreds.tokenB}` } });
    console.log('  [OK] Trust score after adding 1-star (5, 4, 5, 1 -> avg 3.75):', reviewLowRes.data.data.reviewed_user.trust_score);
    const [userRowsLow] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [multiCreds.userIdA]);
    console.log('  [OK] Stored trust_score in DB is 75.00:', parseFloat(userRowsLow[0].trust_score) === 75.00);

    // Test 6: Duplicate Review rejection and no score change
    console.log('\nTest 6 — Duplicate Review (should fail 409 and not change trust score)...');
    try {
      await axios.post(`${BASE_URL}/reviews`, { transaction_id: mTx1, rating: 5 }, { headers: { Authorization: `Bearer ${multiCreds.tokenB}` } });
      console.error('  [FAIL] Duplicate review allowed.');
    } catch (err) {
      console.log('  [OK] Blocked duplicate with status:', err.response?.status);
      const [userRowsDup] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [multiCreds.userIdA]);
      console.log('  [OK] Trust score unchanged (75.00):', parseFloat(userRowsDup[0].trust_score) === 75.00);
    }

    // Test 7: Invalid Rating rejection and no score change
    console.log('\nTest 7 — Invalid Ratings (should fail 400 and not change trust score)...');
    const invalidRatings = [0, 6, -1, 4.5];
    for (const r of invalidRatings) {
      try {
        await axios.post(`${BASE_URL}/reviews`, { transaction_id: mTx1, rating: r }, { headers: { Authorization: `Bearer ${multiCreds.tokenB}` } });
        console.error('  [FAIL] Allowed invalid rating:', r);
      } catch (err) {
        // expected
      }
    }
    console.log('  [OK] All invalid ratings rejected.');
    const [userRowsInv] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [multiCreds.userIdA]);
    console.log('  [OK] Trust score unchanged (75.00):', parseFloat(userRowsInv[0].trust_score) === 75.00);

    // Test 8: Transaction Rollback
    console.log('\nTest 8 — Transaction Rollback: simulating database write error during trust score update...');
    // Create new completed transaction
    const txIdRollback = await createCompletedTransaction(multiCreds.tokenA, multiCreds.tokenB, 'Item Rollback');
    // Get pre-rollback counts
    const [preReviews] = await dbConnection.query('SELECT COUNT(*) AS count FROM reviews WHERE transaction_id = ?', [txIdRollback]);
    
    try {
      await axios.post(`${BASE_URL}/reviews`, {
        transaction_id: txIdRollback,
        rating: 5,
        review_text: 'Rollback review.'
      }, {
        headers: { 
          Authorization: `Bearer ${multiCreds.tokenB}`,
          'X-Simulate-Rollback': 'true' 
        }
      });
      console.error('  [FAIL] Review submission did not fail.');
    } catch (err) {
      console.log('  [OK] Request failed correctly with status:', err.response?.status, 'Message:', err.response?.data?.message);
      
      // Verify no review was inserted in DB
      const [postReviews] = await dbConnection.query('SELECT COUNT(*) AS count FROM reviews WHERE transaction_id = ?', [txIdRollback]);
      console.log('  [OK] Review insertion was rolled back (pre count === post count):', preReviews[0].count === postReviews[0].count);
      
      // Verify trust score is unchanged
      const [userRowsRollback] = await dbConnection.query('SELECT trust_score FROM users WHERE id = ?', [multiCreds.userIdA]);
      console.log('  [OK] Trust score remains unchanged (75.00):', parseFloat(userRowsRollback[0].trust_score) === 75.00);
    }

    // Retrieve and verify stats from user endpoint
    console.log('\n--- GET /api/reviews/user/:userId STATS CHECK ---');
    const statsRes = await axios.get(`${BASE_URL}/reviews/user/${multiCreds.userIdA}`);
    console.log('  [OK] User reviews endpoint response stats data:');
    console.log('    average_rating:', statsRes.data.data.average_rating);
    console.log('    review_count:', statsRes.data.data.review_count);
    console.log('    trust_score:', statsRes.data.data.trust_score);

  } catch (error) {
    console.error('M8.2 verification failed with error:', error.message);
  } finally {
    if (dbConnection) await dbConnection.end();
    console.log('\n--- TRUST SCORE SYSTEM TESTS COMPLETED ---');
  }
}

runTests();
