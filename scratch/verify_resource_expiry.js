/**
 * RESOURCEHUB — M22: RESOURCE EXPIRY AND AUTO-ARCHIVAL TEST SUITE
 * 
 * Tests:
 * 1. Expiry duration configuration (environment & options override)
 * 2. Inactivity detection and expired candidates preview
 * 3. Active transaction safety: PENDING and ACCEPTED exchange requests protect resources from archival
 * 4. State safety: RESERVED and EXCHANGED resources are never archived
 * 5. Transactional auto-archival execution
 * 6. Automated owner notifications (RESOURCE_ARCHIVED)
 * 7. Owner manual renewal: resets inactivity timer and reactivates ARCHIVED listings
 * 8. Authorization enforcement: 401 unauthenticated, 403 non-owner renewal, 403 non-admin auto-archive
 * 9. Admin visibility and filtering of archived resources
 * 10. Wishlist reactivation notification on renewal
 * 11. Transaction integrity & regression checks
 */

const http = require('http');
const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');
const expiryService = require('../server/services/expiryService');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsedData = null;
        try {
          parsedData = data ? JSON.parse(data) : null;
        } catch (e) {
          parsedData = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passedTests = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  [PASS] ${message}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('  RESOURCEHUB — M22: RESOURCE EXPIRY & AUTO-ARCHIVAL TESTS     ');
  console.log('================================================================\n');

  try {
    const timestamp = Date.now();

    // ----------------------------------------------------
    // STEP 1: Expiry Configuration Verification
    // ----------------------------------------------------
    console.log('--- Step 1: Expiry Configuration Verification ---');
    assert(expiryService.getExpiryDays() === 30, 'Default expiry duration is 30 days');
    assert(expiryService.getExpiryDays(14) === 14, 'Custom override expiry duration supported (14 days)');
    assert(expiryService.getExpiryDays('45') === 45, 'String parameter parsed correctly to 45 days');
    assert(expiryService.getExpiryDays('invalid') === 30, 'Invalid parameter safely falls back to default 30 days');

    // ----------------------------------------------------
    // STEP 2: User Setup & Authentication
    // ----------------------------------------------------
    console.log('\n--- Step 2: User & Admin Setup ---');

    // Admin User
    const adminEmail = `admin_m22_${timestamp}@univ.edu`;
    const adminPassword = 'AdminPassword123!';
    const adminReg = await request('POST', '/auth/register', {
      name: 'M22 Super Admin',
      email: adminEmail,
      password: adminPassword,
      department: 'Administration',
      year_of_study: 4
    });
    assert(adminReg.status === 201, 'Admin user registered');
    const adminId = adminReg.data.data.user.id;

    // Promote to ADMIN in DB
    await db.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE id = ?", [adminId]);
    const adminLogin = await request('POST', '/auth/login', { email: adminEmail, password: adminPassword });
    assert(adminLogin.status === 200, 'Admin logged in successfully');
    const adminToken = adminLogin.data.data.token;

    // Owner Student A
    const ownerEmail = `owner_m22_${timestamp}@univ.edu`;
    const userPassword = 'Password123!';
    const ownerReg = await request('POST', '/auth/register', {
      name: 'Alice Lister',
      email: ownerEmail,
      password: userPassword,
      department: 'Computer Science',
      year_of_study: 3
    });
    assert(ownerReg.status === 201, 'Owner Student A registered');
    const ownerId = ownerReg.data.data.user.id;
    await db.query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [ownerId]);
    const ownerLogin = await request('POST', '/auth/login', { email: ownerEmail, password: userPassword });
    const ownerToken = ownerLogin.data.data.token;

    // Buyer Student B
    const buyerEmail = `buyer_m22_${timestamp}@univ.edu`;
    const buyerReg = await request('POST', '/auth/register', {
      name: 'Bob Buyer',
      email: buyerEmail,
      password: userPassword,
      department: 'Electrical Engineering',
      year_of_study: 2
    });
    assert(buyerReg.status === 201, 'Buyer Student B registered');
    const buyerId = buyerReg.data.data.user.id;
    await db.query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [buyerId]);
    const buyerLogin = await request('POST', '/auth/login', { email: buyerEmail, password: userPassword });
    const buyerToken = buyerLogin.data.data.token;

    // Third-party Student C
    const otherEmail = `other_m22_${timestamp}@univ.edu`;
    const otherReg = await request('POST', '/auth/register', {
      name: 'Charlie Thirdparty',
      email: otherEmail,
      password: userPassword,
      department: 'Civil Engineering',
      year_of_study: 1
    });
    assert(otherReg.status === 201, 'Student C registered');
    const otherId = otherReg.data.data.user.id;
    await db.query("UPDATE users SET status = 'ACTIVE' WHERE id = ?", [otherId]);
    const otherLogin = await request('POST', '/auth/login', { email: otherEmail, password: userPassword });
    const otherToken = otherLogin.data.data.token;

    // Fetch Categories
    const [catRows] = await db.query('SELECT id FROM categories LIMIT 1');
    const categoryId = catRows[0].id;

    // ----------------------------------------------------
    // STEP 3: Create Resource Test Matrix with Various States & Ages
    // ----------------------------------------------------
    console.log('\n--- Step 3: Resource Listing & Age Setup ---');

    // 3a. Resource 1: AVAILABLE, 45 days old (Eligible for archival)
    const res1 = await request('POST', '/resources', {
      title: `Old Inactive Calculus Notes ${timestamp}`,
      description: 'Calculus lecture notes from previous semester.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'Central Library Lobby'
    }, ownerToken);
    assert(res1.status === 201, 'Created Resource 1 (Inactive Candidate)');
    const res1Id = res1.data.data.id;
    await db.query("UPDATE resources SET updated_at = DATE_SUB(NOW(), INTERVAL 45 DAY) WHERE id = ?", [res1Id]);

    // 3b. Resource 2: AVAILABLE, Fresh (0 days old, NOT eligible)
    const res2 = await request('POST', '/resources', {
      title: `Fresh Physics Lab Kit ${timestamp}`,
      description: 'Brand new optics kit.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 35.00,
      item_condition: 'NEW',
      meetup_location: 'Science Complex Atrium'
    }, ownerToken);
    assert(res2.status === 201, 'Created Resource 2 (Fresh Listing)');
    const res2Id = res2.data.data.id;

    // 3c. Resource 3: AVAILABLE, 40 days old BUT has PENDING request (Active transaction protection)
    const res3 = await request('POST', '/resources', {
      title: `Chemistry Model Set ${timestamp}`,
      description: 'Organic chemistry molecular set.',
      category_id: categoryId,
      exchange_type: 'BORROW',
      item_condition: 'LIKE_NEW',
      meetup_location: 'Student Union Hub'
    }, ownerToken);
    assert(res3.status === 201, 'Created Resource 3 (Pending Request Protected)');
    const res3Id = res3.data.data.id;
    await db.query("UPDATE resources SET updated_at = DATE_SUB(NOW(), INTERVAL 40 DAY) WHERE id = ?", [res3Id]);

    // Bob creates exchange request for Resource 3 (Status PENDING)
    const reqRes3 = await request('POST', '/exchange-requests', {
      resource_id: res3Id,
      proposed_exchange_type: 'BORROW',
      borrow_duration_days: 7,
      message: 'Need this for my chemistry lab this week.'
    }, buyerToken);
    assert(reqRes3.status === 201, 'Created PENDING exchange request for Resource 3');

    // 3d. Resource 4: 40 days old BUT in ACCEPTED state transaction
    const res4 = await request('POST', '/resources', {
      title: `Graphing Calculator TI-84 ${timestamp}`,
      description: 'Standard graphing calculator.',
      category_id: categoryId,
      exchange_type: 'BORROW',
      item_condition: 'GOOD',
      meetup_location: 'Engineering Block Concourse'
    }, ownerToken);
    assert(res4.status === 201, 'Created Resource 4 (Accepted Transaction Protected)');
    const res4Id = res4.data.data.id;
    await db.query("UPDATE resources SET updated_at = DATE_SUB(NOW(), INTERVAL 40 DAY) WHERE id = ?", [res4Id]);

    const reqRes4 = await request('POST', '/exchange-requests', {
      resource_id: res4Id,
      proposed_exchange_type: 'BORROW',
      borrow_duration_days: 14,
      message: 'Need for exam next month.'
    }, buyerToken);
    const req4Id = reqRes4.data.data.id;
    const acceptRes = await request('PUT', `/exchange-requests/${req4Id}/accept`, null, ownerToken);
    assert(acceptRes.status === 200, 'Owner accepted request for Resource 4 (RESERVED state)');
    // Resource 4 is now RESERVED

    // 3e. Resource 5: EXCHANGED resource (Should not be re-archived by expiry)
    const res5 = await request('POST', '/resources', {
      title: `Completed Trade Textbook ${timestamp}`,
      description: 'Already traded book.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'POOR',
      meetup_location: 'Library'
    }, ownerToken);
    const res5Id = res5.data.data.id;
    await db.query("UPDATE resources SET status = 'EXCHANGED', updated_at = DATE_SUB(NOW(), INTERVAL 50 DAY) WHERE id = ?", [res5Id]);

    // 3f. Student B wishlists Resource 1 for testing renewal alert
    await request('POST', `/wishlist/${res1Id}`, null, buyerToken);

    // ----------------------------------------------------
    // STEP 4: Expired Resources Candidate Preview
    // ----------------------------------------------------
    console.log('\n--- Step 4: Expired Resources Candidate Preview ---');

    // 4a. Via Admin route GET /api/admin/resources/expired
    const adminPreview = await request('GET', '/admin/resources/expired?expiry_days=30', null, adminToken);
    assert(adminPreview.status === 200, 'Admin can preview expired candidate listings (200 OK)');
    assert(Array.isArray(adminPreview.data.data), 'Candidate data is array');

    const previewCandidateIds = adminPreview.data.data.map(r => r.id);
    assert(previewCandidateIds.includes(res1Id), 'Resource 1 (45 days inactive, AVAILABLE) is in expired candidates');
    assert(!previewCandidateIds.includes(res2Id), 'Resource 2 (fresh) is NOT in expired candidates');
    assert(!previewCandidateIds.includes(res3Id), 'Resource 3 (has PENDING transaction) is strictly protected and EXCLUDED');
    assert(!previewCandidateIds.includes(res4Id), 'Resource 4 (RESERVED/ACCEPTED) is strictly EXCLUDED');
    assert(!previewCandidateIds.includes(res5Id), 'Resource 5 (EXCHANGED) is strictly EXCLUDED');

    // 4b. Via Resource preview route GET /api/resources/expiry/preview
    const resPreview = await request('GET', '/resources/expiry/preview?expiry_days=30', null, adminToken);
    assert(resPreview.status === 200, 'GET /resources/expiry/preview responds with 200 OK');
    assert(resPreview.data.count >= 1, 'Found at least 1 expired candidate');

    // ----------------------------------------------------
    // STEP 5: Execution of Automatic Archival
    // ----------------------------------------------------
    console.log('\n--- Step 5: Automatic Archival Execution ---');

    const archiveExec = await request('POST', '/admin/resources/auto-archive', { expiry_days: 30 }, adminToken);
    assert(archiveExec.status === 200, 'Admin triggered auto-archival scan (200 OK)');
    assert(archiveExec.data.success === true, 'Auto-archival execution succeeded');
    assert(archiveExec.data.data.archived_ids.includes(res1Id), 'Resource 1 was archived by auto-archival process');

    // Verify DB states
    const [checkRes1] = await db.query('SELECT status FROM resources WHERE id = ?', [res1Id]);
    assert(checkRes1[0].status === 'ARCHIVED', 'Resource 1 status in database transitioned to ARCHIVED');

    const [checkRes2] = await db.query('SELECT status FROM resources WHERE id = ?', [res2Id]);
    assert(checkRes2[0].status === 'AVAILABLE', 'Resource 2 status remains AVAILABLE (unaffected)');

    const [checkRes3] = await db.query('SELECT status FROM resources WHERE id = ?', [res3Id]);
    assert(checkRes3[0].status === 'AVAILABLE', 'Resource 3 status remains AVAILABLE (active request preserved)');

    const [checkRes4] = await db.query('SELECT status FROM resources WHERE id = ?', [res4Id]);
    assert(checkRes4[0].status === 'RESERVED', 'Resource 4 status remains RESERVED');

    const [checkRes5] = await db.query('SELECT status FROM resources WHERE id = ?', [res5Id]);
    assert(checkRes5[0].status === 'EXCHANGED', 'Resource 5 status remains EXCHANGED');

    // ----------------------------------------------------
    // STEP 6: Owner Auto-Archival Notification
    // ----------------------------------------------------
    console.log('\n--- Step 6: Automated Owner Notifications ---');

    // Alice fetches notifications
    const aliceNotifs = await request('GET', '/notifications', null, ownerToken);
    assert(aliceNotifs.status === 200, 'Owner Alice retrieved notifications');
    const archiveNotif = aliceNotifs.data.data.find(n => n.notification_type === 'RESOURCE_ARCHIVED' && n.related_entity_id === res1Id);
    assert(archiveNotif !== undefined, 'Owner Alice received RESOURCE_ARCHIVED notification for Resource 1');
    assert(archiveNotif.title.includes('Archived'), `Notification title reflects archival: "${archiveNotif.title}"`);
    assert(archiveNotif.message.includes('inactivity'), `Notification message explains inactivity reason: "${archiveNotif.message}"`);

    // ----------------------------------------------------
    // STEP 7: Manual Renewal by Owner
    // ----------------------------------------------------
    console.log('\n--- Step 7: Manual Renewal by Owner ---');

    // 7a. Alice renews the ARCHIVED Resource 1
    const renewArchived = await request('POST', `/resources/${res1Id}/renew`, null, ownerToken);
    assert(renewArchived.status === 200, 'Owner Alice renewed archived Resource 1 (200 OK)');
    assert(renewArchived.data.success === true, 'Renewal response indicates success');
    assert(renewArchived.data.data.status === 'AVAILABLE', 'Resource 1 reactivated from ARCHIVED to AVAILABLE');

    const [res1AfterRenew] = await db.query('SELECT status, DATEDIFF(NOW(), updated_at) AS diff_days FROM resources WHERE id = ?', [res1Id]);
    assert(res1AfterRenew[0].status === 'AVAILABLE', 'Database row status is AVAILABLE');
    assert(res1AfterRenew[0].diff_days === 0, 'Database updated_at timestamp was refreshed to current time (0 days diff)');

    // 7b. Alice renews an already ACTIVE Resource 2 (resets inactivity timer)
    await db.query("UPDATE resources SET updated_at = DATE_SUB(NOW(), INTERVAL 20 DAY) WHERE id = ?", [res2Id]);
    const renewActive = await request('POST', `/resources/${res2Id}/renew`, null, ownerToken);
    assert(renewActive.status === 200, 'Owner Alice renewed active Resource 2 (200 OK)');
    assert(renewActive.data.data.status === 'AVAILABLE', 'Resource 2 remains AVAILABLE');

    const [res2AfterRenew] = await db.query('SELECT DATEDIFF(NOW(), updated_at) AS diff_days FROM resources WHERE id = ?', [res2Id]);
    assert(res2AfterRenew[0].diff_days === 0, 'Resource 2 timestamp reset to current date');

    // ----------------------------------------------------
    // STEP 8: Authorization & Negative Security Checks
    // ----------------------------------------------------
    console.log('\n--- Step 8: Authorization & Security Checks ---');

    // 8a. Unauthenticated renewal
    const unauthRenew = await request('POST', `/resources/${res1Id}/renew`);
    assert(unauthRenew.status === 401, 'Unauthenticated renewal rejected with 401 Unauthorized');

    // 8b. Non-owner (Bob) attempts to renew Alice's resource
    const nonOwnerRenew = await request('POST', `/resources/${res1Id}/renew`, null, buyerToken);
    assert(nonOwnerRenew.status === 403, 'Non-owner blocked from renewing resource with 403 Forbidden');

    // 8c. Non-admin (Bob) attempts to trigger auto-archival
    const studentAutoArchive = await request('POST', '/resources/auto-archive', { expiry_days: 30 }, buyerToken);
    assert(studentAutoArchive.status === 403, 'Student blocked from triggering auto-archival with 403 Forbidden');

    const studentPreview = await request('GET', '/resources/expiry/preview', null, buyerToken);
    assert(studentPreview.status === 403, 'Student blocked from viewing expiry preview with 403 Forbidden');

    // 8d. Attempting to renew an EXCHANGED resource
    const renewExchanged = await request('POST', `/resources/${res5Id}/renew`, null, ownerToken);
    assert(renewExchanged.status === 400, 'Attempt to renew EXCHANGED resource rejected with 400 Bad Request');

    // 8e. Attempting to renew nonexistent resource
    const renewNonexistent = await request('POST', '/resources/9999999/renew', null, ownerToken);
    assert(renewNonexistent.status === 404, 'Attempt to renew nonexistent resource rejected with 404 Not Found');

    // ----------------------------------------------------
    // STEP 9: Admin Visibility of Archived Resources
    // ----------------------------------------------------
    console.log('\n--- Step 9: Admin Visibility of Archived Resources ---');

    // Soft delete / archive a test resource
    const resToArchive = await request('POST', '/resources', {
      title: `Archived Test Sample ${timestamp}`,
      description: 'Listing to test admin visibility.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'FAIR',
      meetup_location: 'Central Plaza'
    }, ownerToken);
    const archiveSampleId = resToArchive.data.data.id;
    await request('DELETE', `/resources/${archiveSampleId}`, null, ownerToken);

    // Admin filters by ARCHIVED
    const adminArchivedList = await request('GET', '/admin/resources?status=ARCHIVED', null, adminToken);
    assert(adminArchivedList.status === 200, 'Admin can query ARCHIVED resources (200 OK)');
    const foundArchived = adminArchivedList.data.data.find(r => r.id === archiveSampleId);
    assert(foundArchived !== undefined, 'Archived listing found in admin resources list');
    assert(foundArchived.status === 'ARCHIVED', 'Listing status confirmed as ARCHIVED in admin view');

    // ----------------------------------------------------
    // STEP 10: Wishlist Alert on Reactivation
    // ----------------------------------------------------
    console.log('\n--- Step 10: Wishlist Alert on Reactivation ---');

    // Bob wishlists archiveSampleId
    await request('POST', `/wishlist/${archiveSampleId}`, null, buyerToken);

    // Alice renews/reactivates archiveSampleId
    await request('POST', `/resources/${archiveSampleId}/renew`, null, ownerToken);

    // Bob checks notifications for wishlist availability alert
    const bobNotifs = await request('GET', '/notifications', null, buyerToken);
    const wishlistAlert = bobNotifs.data.data.find(n => n.notification_type === 'WISHLIST_AVAILABLE' && n.related_entity_id === archiveSampleId);
    assert(wishlistAlert !== undefined, 'Wishlist subscriber received WISHLIST_AVAILABLE notification upon resource reactivation');

    console.log('\n================================================================');
    console.log(`  M22 RESOURCE EXPIRY SUMMARY: ${passedTests} PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', error.message);
    process.exit(1);
  }
}

runTests();
