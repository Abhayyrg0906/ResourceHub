const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const mysql = require(path.join(__dirname, '../server/node_modules/mysql2/promise'));
const axios = require(path.join(__dirname, '../client/node_modules/axios'));

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runM16QrHistoryTests() {
  let dbConnection;
  try {
    dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('====================================================');
    console.log('--- RESOURCEHUB M16: QR HANDOVER EXPERIENCE & HISTORY ---');
    console.log('====================================================');

    // Clean test data for predictable runs
    console.log('\n1. Initializing clean test state...');
    await dbConnection.query("DELETE FROM qr_verifications");
    await dbConnection.query("DELETE FROM exchange_requests");
    await dbConnection.query("DELETE FROM resources");
    await dbConnection.query("DELETE FROM users WHERE email IN ('qr_owner@university.edu', 'qr_requester@university.edu', 'qr_thirdparty@university.edu')");

    // Register test users
    console.log('2. Registering and authenticating test students...');
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Owner Alice',
      email: 'qr_owner@university.edu',
      password: 'Password123',
      department: 'CS',
      year_of_study: 4
    });
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Requester Bob',
      email: 'qr_requester@university.edu',
      password: 'Password123',
      department: 'EE',
      year_of_study: 3
    });
    await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Third Party Charlie',
      email: 'qr_thirdparty@university.edu',
      password: 'Password123',
      department: 'ME',
      year_of_study: 2
    });

    const loginOwner = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'qr_owner@university.edu',
      password: 'Password123'
    });
    const tokenOwner = loginOwner.data.data.token;

    const loginRequester = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'qr_requester@university.edu',
      password: 'Password123'
    });
    const tokenRequester = loginRequester.data.data.token;

    const loginThirdParty = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'qr_thirdparty@university.edu',
      password: 'Password123'
    });
    const tokenThirdParty = loginThirdParty.data.data.token;

    const catRes = await axios.get(`${BASE_URL}/categories`);
    const categoryId = catRes.data.data[0].id;

    // Create resource & accepted transaction
    console.log('3. Setting up resource & accepted transaction...');
    const resourceRes = await axios.post(`${BASE_URL}/resources`, {
      title: 'Digital Signal Processing Textbook',
      description: 'Hardcover, clean condition',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'LIKE_NEW',
      meetup_location: 'Central Library Floor 2'
    }, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    const resourceId = resourceRes.data.data.id;

    const requestRes = await axios.post(`${BASE_URL}/exchange-requests`, {
      resource_id: resourceId
    }, {
      headers: { Authorization: `Bearer ${tokenRequester}` }
    });
    const transactionId = requestRes.data.data.id;

    await axios.put(`${BASE_URL}/exchange-requests/${transactionId}/accept`, {}, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    console.log('   Transaction accepted successfully (ID:', transactionId, ')');

    // 4. Test Unauthenticated Access to History Endpoint
    console.log('\n4. Testing unauthenticated access to /qr/history...');
    try {
      await axios.get(`${BASE_URL}/exchange-requests/qr/history`);
      throw new Error('Should have failed with 401');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('   ✓ Passed: Unauthenticated request rejected with 401.');
      } else {
        throw err;
      }
    }

    // 5. Generate QR by Owner
    console.log('\n5. Generating Handover QR code by Owner...');
    const genRes = await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {}, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    if (!genRes.data.success || !genRes.data.data.verification_token) {
      throw new Error('Failed to generate QR or missing token in initial generation');
    }
    const secretToken = genRes.data.data.verification_token;
    console.log('   ✓ Passed: QR generated successfully. Secret token length:', secretToken.length);

    // 6. Test GET /api/exchange-requests/qr/history (Owner)
    console.log('\n6. Owner fetching global QR handover history...');
    const ownerHistoryRes = await axios.get(`${BASE_URL}/exchange-requests/qr/history`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    if (!ownerHistoryRes.data.success || !Array.isArray(ownerHistoryRes.data.data)) {
      throw new Error('Expected array in history response');
    }
    const ownerHistory = ownerHistoryRes.data.data;
    if (ownerHistory.length !== 1) {
      throw new Error(`Expected 1 history item, got ${ownerHistory.length}`);
    }
    const historyItem = ownerHistory[0];
    if (historyItem.verification_token !== undefined) {
      throw new Error('SECURITY VIOLATION: verification_token was exposed in /qr/history!');
    }
    if (historyItem.status !== 'GENERATED') {
      throw new Error(`Expected status GENERATED, got ${historyItem.status}`);
    }
    if (historyItem.resource_title !== 'Digital Signal Processing Textbook') {
      throw new Error(`Unexpected resource title: ${historyItem.resource_title}`);
    }
    console.log('   ✓ Passed: History returned record without verification_token.');

    // 7. Test Requester visibility in /qr/history
    console.log('\n7. Requester fetching global QR handover history...');
    const reqHistoryRes = await axios.get(`${BASE_URL}/exchange-requests/qr/history`, {
      headers: { Authorization: `Bearer ${tokenRequester}` }
    });
    const reqHistory = reqHistoryRes.data.data;
    if (reqHistory.length !== 1) {
      throw new Error(`Expected 1 history item for requester, got ${reqHistory.length}`);
    }
    if (reqHistory[0].verification_token !== undefined) {
      throw new Error('SECURITY VIOLATION: verification_token was exposed to requester in /qr/history!');
    }
    console.log('   ✓ Passed: Requester sees audit record without token.');

    // 8. Test Third-party isolation
    console.log('\n8. Third-party student attempting to view others history...');
    const thirdPartyHistoryRes = await axios.get(`${BASE_URL}/exchange-requests/qr/history`, {
      headers: { Authorization: `Bearer ${tokenThirdParty}` }
    });
    if (thirdPartyHistoryRes.data.data.length !== 0) {
      throw new Error(`Isolation failed: third party saw ${thirdPartyHistoryRes.data.data.length} records!`);
    }
    console.log('   ✓ Passed: Third-party user sees 0 history records.');

    // 9. Test GET /:id/qr/history for specific transaction
    console.log('\n9. Testing GET /:id/qr/history authorization...');
    try {
      await axios.get(`${BASE_URL}/exchange-requests/${transactionId}/qr/history`, {
        headers: { Authorization: `Bearer ${tokenThirdParty}` }
      });
      throw new Error('Third party should not be authorized to view transaction QR history');
    } catch (err) {
      if (err.response?.status === 403) {
        console.log('   ✓ Passed: Third-party rejected with 403 Forbidden for transaction QR history.');
      } else {
        throw err;
      }
    }

    const txHistoryRes = await axios.get(`${BASE_URL}/exchange-requests/${transactionId}/qr/history`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    if (!txHistoryRes.data.success || txHistoryRes.data.data.verification_token !== undefined) {
      throw new Error('Transaction QR history exposed token or failed!');
    }
    console.log('   ✓ Passed: Transaction-specific QR history fetched successfully without token.');

    // 10. Perform Verification by Requester
    console.log('\n10. Requester verifying handover using valid token...');
    const verifyRes = await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
      verification_token: secretToken
    }, {
      headers: { Authorization: `Bearer ${tokenRequester}` }
    });
    if (!verifyRes.data.success) {
      throw new Error('Verification failed unexpectedly');
    }
    console.log('   ✓ Passed: Handover verified successfully.');

    // 11. Verify History Status Updated to VERIFIED
    console.log('\n11. Verifying history status updated to VERIFIED with verified_at timestamp...');
    const updatedHistoryRes = await axios.get(`${BASE_URL}/exchange-requests/${transactionId}/qr/history`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    const verifiedRecord = updatedHistoryRes.data.data;
    if (verifiedRecord.status !== 'VERIFIED') {
      throw new Error(`Expected status VERIFIED, got ${verifiedRecord.status}`);
    }
    if (!verifiedRecord.verified_at) {
      throw new Error('Expected verified_at timestamp to be set');
    }
    if (verifiedRecord.verification_token !== undefined) {
      throw new Error('SECURITY VIOLATION: verification_token was exposed after verification!');
    }
    console.log('   ✓ Passed: Audit trail recorded verified_at:', verifiedRecord.verified_at);

    // 12. Verify Token Secrecy on Status endpoint once verified
    console.log('\n12. Testing GET /:id/qr status endpoint token secrecy post-verification...');
    const statusPostVerify = await axios.get(`${BASE_URL}/exchange-requests/${transactionId}/qr`, {
      headers: { Authorization: `Bearer ${tokenOwner}` }
    });
    if (statusPostVerify.data.data.verification_token !== undefined) {
      throw new Error('SECURITY VIOLATION: verification_token was exposed in GET /:id/qr after verification!');
    }
    console.log('   ✓ Passed: verification_token strictly hidden once status is VERIFIED.');

    // 13. Test Replay Protection
    console.log('\n13. Testing Replay Protection (re-verify already used token)...');
    try {
      await axios.post(`${BASE_URL}/exchange-requests/${transactionId}/qr/verify`, {
        verification_token: secretToken
      }, {
        headers: { Authorization: `Bearer ${tokenRequester}` }
      });
      throw new Error('Should have failed replay verification');
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already')) {
        console.log('   ✓ Passed: Replay verification rejected with 400 Bad Request.');
      } else {
        throw err;
      }
    }

    console.log('\n====================================================');
    console.log('🎉 ALL M16 ENHANCED QR HANDOVER TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    if (dbConnection) await dbConnection.end();
  }
}

runM16QrHistoryTests();
