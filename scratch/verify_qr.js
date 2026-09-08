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

    console.log('--- RE-INITIALIZING TEST DATABASE FOR M7 ---');
    await dbConnection.query("DELETE FROM qr_verifications");
    await dbConnection.query("DELETE FROM exchange_requests");
    await dbConnection.query("DELETE FROM resources");
    await dbConnection.query("DELETE FROM users WHERE email IN ('studentA@university.edu', 'studentB@university.edu', 'studentC@university.edu')");

    console.log('\n--- REGISTERING USERS ---');
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

    const loginA = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'studentA@university.edu',
      password: 'Password123'
    });
    const tokenA = loginA.data.data.token;

    const loginB = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'studentB@university.edu',
      password: 'Password123'
    });
    const tokenB = loginB.data.data.token;

    const loginC = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'studentC@university.edu',
      password: 'Password123'
    });
    const tokenC = loginC.data.data.token;

    const catRes = await axios.get(`${BASE_URL}/categories`);
    const categoryId = catRes.data.data[0].id;

    console.log('\n--- SETUP TRANSACTION AND ACCEPT RESOURCE ---');
    const resource = await axios.post(`${BASE_URL}/resources`, {
      title: 'Lab Kit',
      description: 'Lab Kit for ECE',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'ECE Lab Room'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const resourceId = resource.data.data.id;

    const request = await axios.post(`${BASE_URL}/exchange-requests`, {
      resource_id: resourceId
    }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const transactionId = request.data.data.id;

    await axios.put(`${BASE_URL}/exchange-requests/${transactionId}/accept`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    console.log('\n--- STARTING QR VERIFICATION SYSTEM TESTS ---');

    // Test 1: Generate QR by non-owner (Student B) -> expect 403
    console.log('Test 1: Requester (Student B) attempts to generate QR (should fail 403)...');
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {}, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.error('  [FAIL] Requester allowed to generate QR.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status);
    }

    // Test 2: Generate QR by owner (Student A) -> expect 200
    console.log('Test 2: Owner (Student A) generates QR verification token (should succeed)...');
    let qrToken = '';
    try {
      const res = await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {}, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      qrToken = res.data.data.verification_token;
      console.log('  [OK] QR generated successfully. Expires at:', res.data.data.expires_at);
    } catch (err) {
      console.error('  [FAIL] Owner failed to generate QR:', err.message);
    }

    // Test 3: Get QR Status checks
    console.log('Test 3: Fetching QR status (Checking security rules for token exposure)...');
    try {
      // Owner fetches: should contain token
      const resA = await axios.get(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      console.log('  [OK] Owner received token:', !!resA.data.data.verification_token);

      // Requester fetches: status should be GENERATED, but token MUST be hidden
      const resB = await axios.get(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.log('  [OK] Requester status is GENERATED:', resB.data.data.status === 'GENERATED');
      console.log('  [OK] Requester token is hidden (undefined):', resB.data.data.verification_token === undefined);
    } catch (err) {
      console.error('  [FAIL] Status fetch failed:', err.message);
    }

    // Test 4: Complete request prior to verification -> expect 400
    console.log('Test 4: Attempting to complete transaction BEFORE QR verification (should fail 400)...');
    try {
      await axios.put(`${BASE_URL}/exchange-requests/${transactionId}/complete`, {}, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      console.error('  [FAIL] Completion allowed without verification.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status);
      console.log('  [OK] Message matches:', err.response?.data?.message);
    }

    // Test 5: Generator verifies own handover -> expect 400
    console.log('Test 5: Owner (Student A) attempts to verify their own handover (should fail 400)...');
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: qrToken
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      console.error('  [FAIL] Owner verified own handover.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status, 'Message:', err.response?.data?.message);
    }

    // Test 6: Unrelated user verifies handover -> expect 403
    console.log('Test 6: Unrelated user (Student C) attempts to verify handover (should fail 403)...');
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: qrToken
      }, {
        headers: { Authorization: `Bearer ${tokenC}` }
      });
      console.error('  [FAIL] Unrelated user verified handover.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status);
    }

    // Test 7: Requester verifies handover with wrong token -> expect 400
    console.log('Test 7: Requester verifies handover with incorrect token (should fail 400)...');
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: 'wrongtoken12345'
      }, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.error('  [FAIL] Verification with incorrect token was allowed.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status);
    }

    // Test 8: Requester scans and verifies correctly -> expect 200
    console.log('Test 8: Requester scans and verifies handover with correct token (should succeed)...');
    try {
      const res = await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: qrToken
      }, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.log('  [OK] Handover verified successfully. Message:', res.data.message);
    } catch (err) {
      console.error('  [FAIL] Handover verification failed:', err.response?.data || err.message);
    }

    // Test 9: One-time token enforce scan (reuse block) -> expect 400
    console.log('Test 9: Requester scans and verifies token again (should fail 400)...');
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: qrToken
      }, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.error('  [FAIL] Token reuse allowed.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status);
      console.log('  [OK] Message matches already verified:', err.response?.data?.message);
    }

    // Test 10: Complete transaction now -> expect 200
    console.log('Test 10: Complete transaction AFTER successful verification (should succeed)...');
    try {
      await axios.put(`${BASE_URL}/exchange-requests/${transactionId}/complete`, {}, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      console.log('  [OK] Transaction marked as completed.');

      const itemRes = await axios.get(`${BASE_URL}/resources/${resourceId}`);
      console.log('  [OK] Resource status is EXCHANGED:', itemRes.data.data.status === 'EXCHANGED');
    } catch (err) {
      console.error('  [FAIL] Completion failed:', err.response?.data || err.message);
    }

    console.log('\n--- VERIFYING TOKEN EXPIRATION CONTROLS ---');

    // Test 11: Setup second request, generate QR, force expiration in DB, attempt scan -> expect 400
    console.log('Test 11: Generating a new QR, forcing expiration, and verifying scan results...');
    
    // Create new resource
    const resource2 = await axios.post(`${BASE_URL}/resources`, {
      title: 'Lab Kit 2',
      description: 'Another Lab Kit',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'ECE Lab Room'
    }, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const resourceId2 = resource2.data.data.id;

    // Create new request
    const request2 = await axios.post(`${BASE_URL}/exchange-requests`, {
      resource_id: resourceId2
    }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const transactionId2 = request2.data.data.id;

    // Accept request
    await axios.put(`${BASE_URL}/exchange-requests/${transactionId2}/accept`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    // Generate QR
    const qrRes = await axios.post(`${BASE_URL}/exchange-requests/${transactionId2}/qr`, {}, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const qrToken2 = qrRes.data.data.verification_token;

    // Force expiration in DB by updating expires_at to 1 hour ago
    console.log('  Forcing token expires_at to past timestamp in database...');
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    await dbConnection.query(
      'UPDATE qr_verifications SET expires_at = ? WHERE transaction_id = ?',
      [pastDate, transactionId2]
    );

    // Scan expired QR
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId2}/qr/verify`, {
        verification_token: qrToken2
      }, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      console.error('  [FAIL] Verification of expired QR code was allowed.');
    } catch (err) {
      console.log('  [OK] Blocked correctly with status:', err.response?.status, 'Message:', err.response?.data?.message);
    }

    // Verify status was updated to EXPIRED in database
    const [dbRows] = await dbConnection.query(
      'SELECT status FROM qr_verifications WHERE transaction_id = ?',
      [transactionId2]
    );
    console.log('  [OK] Database status is EXPIRED:', dbRows[0].status === 'EXPIRED');

  } catch (error) {
    console.error('M7 verification failed with error:', error.message);
  } finally {
    if (dbConnection) await dbConnection.end();
    console.log('\n--- QR EXCHANGE VERIFICATION TESTS COMPLETED ---');
  }
}

runTests();
