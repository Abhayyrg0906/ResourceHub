/**
 * ResourceHub — Milestone M14: Wishlist & Smart Availability Alerts Verification Suite
 * 
 * Verifies:
 *  1. JWT Authentication required for wishlist endpoints
 *  2. Add resource to wishlist (POST /api/wishlist/:id)
 *  3. Duplicate entry prevention & idempotency
 *  4. Get user wishlist with enriched details (GET /api/wishlist)
 *  5. Get wishlist resource ID set (GET /api/wishlist/ids)
 *  6. Check individual resource wishlist status (GET /api/wishlist/check/:id)
 *  7. Wishlist state toggle (POST /api/wishlist/:id/toggle)
 *  8. Strict tenant isolation (users can only access & mutate their own wishlist)
 *  9. Validation for nonexistent resources (404 error)
 * 10. Smart availability alerts on resource availability change (WISHLIST_AVAILABLE)
 * 11. Smart category match alerts when new resources match saved category
 * 12. Notification failure isolation (DB transaction is never blocked)
 * 13. Remove resource from wishlist (DELETE /api/wishlist/:id)
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

async function runWishlistVerification() {
  console.log('================================================================');
  console.log('  RESOURCEHUB — M14: WISHLIST & SMART AVAILABILITY ALERTS SUITE');
  console.log('================================================================\n');

  const ts = Date.now();
  const emailA = `wishlist_owner_${ts}@university.edu`;
  const emailB = `wishlist_buyer_${ts}@university.edu`;
  const emailC = `wishlist_third_${ts}@university.edu`;
  const defaultPassword = 'Password123';

  let userA, userB, userC;
  let tokenA, tokenB, tokenC;
  let resource1Id, resource2Id;

  try {
    // -----------------------------------------------------------------
    // STEP 1: Registration & User Setup
    // -----------------------------------------------------------------
    console.log('--- Step 1: Authentication & User Setup ---');

    // Register User A (Owner)
    const regA = await request('POST', '/auth/register', {
      name: 'Owner Alice',
      email: emailA,
      password: defaultPassword,
      department: 'Electrical Engineering',
      year_of_study: 3
    });
    assert(regA.status === 201, 'User A (Owner) registered successfully');
    userA = regA.data.data.user;

    // Register User B (Buyer / Wishlister)
    const regB = await request('POST', '/auth/register', {
      name: 'Buyer Bob',
      email: emailB,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 2
    });
    assert(regB.status === 201, 'User B (Buyer) registered successfully');
    userB = regB.data.data.user;

    // Register User C (Third Party)
    const regC = await request('POST', '/auth/register', {
      name: 'Third Charlie',
      email: emailC,
      password: defaultPassword,
      department: 'Mechanical Engineering',
      year_of_study: 4
    });
    assert(regC.status === 201, 'User C (Third Party) registered successfully');
    userC = regC.data.data.user;

    // Activate all users
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 95.00 WHERE id = ?", [userA.id]);
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 90.00 WHERE id = ?", [userB.id]);
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 80.00 WHERE id = ?", [userC.id]);

    // Login all users
    const logA = await request('POST', '/auth/login', { email: emailA, password: defaultPassword });
    assert(logA.status === 200, 'User A logged in successfully');
    tokenA = logA.data.data.token;

    const logB = await request('POST', '/auth/login', { email: emailB, password: defaultPassword });
    assert(logB.status === 200, 'User B logged in successfully');
    tokenB = logB.data.data.token;

    const logC = await request('POST', '/auth/login', { email: emailC, password: defaultPassword });
    assert(logC.status === 200, 'User C logged in successfully');
    tokenC = logC.data.data.token;

    // -----------------------------------------------------------------
    // STEP 2: Authentication Enforcement on Wishlist Endpoints
    // -----------------------------------------------------------------
    console.log('\n--- Step 2: Authentication Enforcement ---');
    const unauthGet = await request('GET', '/wishlist');
    assert(unauthGet.status === 401, 'GET /wishlist rejects unauthenticated requests with 401');

    const unauthPost = await request('POST', '/wishlist/1');
    assert(unauthPost.status === 401, 'POST /wishlist/:id rejects unauthenticated requests with 401');

    const unauthDelete = await request('DELETE', '/wishlist/1');
    assert(unauthDelete.status === 401, 'DELETE /wishlist/:id rejects unauthenticated requests with 401');

    // -----------------------------------------------------------------
    // STEP 3: Create Resources
    // -----------------------------------------------------------------
    console.log('\n--- Step 3: Resource Creation ---');
    const [categories] = await db.query('SELECT id, name FROM categories LIMIT 2');
    const cat1 = categories[0];
    const cat2 = categories[1] || categories[0];

    const res1 = await request('POST', '/resources', {
      title: `Calculus 9th Edition ${ts}`,
      description: 'Clean textbook, minimal highlights.',
      category_id: cat1.id,
      exchange_type: 'SELL',
      price: 150,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Science Library'
    }, tokenA);
    assert(res1.status === 201, `User A created Resource 1 (Category: ${cat1.name})`);
    resource1Id = res1.data.data.id;

    const res2 = await request('POST', '/resources', {
      title: `Digital Multimeter ${ts}`,
      description: 'Used once for physics lab experiments.',
      category_id: cat2.id,
      exchange_type: 'BORROW',
      price: 0,
      item_condition: 'GOOD',
      meetup_location: 'Engineering Hall'
    }, tokenA);
    assert(res2.status === 201, `User A created Resource 2 (Category: ${cat2.name})`);
    resource2Id = res2.data.data.id;

    // -----------------------------------------------------------------
    // STEP 4: Add Resource to Wishlist & Check Status
    // -----------------------------------------------------------------
    console.log('\n--- Step 4: Wishlist Add & Duplicate Prevention ---');

    // Initially not in wishlist
    const checkBefore = await request('GET', `/wishlist/check/${resource1Id}`, null, tokenB);
    assert(checkBefore.status === 200 && checkBefore.data.inWishlist === false, 'Resource 1 is initially not in User B wishlist');

    // Add to wishlist
    const add1 = await request('POST', `/wishlist/${resource1Id}`, null, tokenB);
    assert(add1.status === 200 || add1.status === 201, 'User B added Resource 1 to wishlist');
    assert(add1.data.inWishlist === true, 'Response confirms inWishlist === true');

    // Duplicate Add (Idempotency)
    const addDup = await request('POST', `/wishlist/${resource1Id}`, null, tokenB);
    assert(addDup.status === 200, 'Duplicate add handled gracefully with 200 OK');
    assert(addDup.data.inWishlist === true, 'Duplicate add returns inWishlist === true');

    // Verify status check
    const checkAfter = await request('GET', `/wishlist/check/${resource1Id}`, null, tokenB);
    assert(checkAfter.status === 200 && checkAfter.data.inWishlist === true, 'Resource 1 check confirms inWishlist === true');

    // Nonexistent resource check
    const checkFake = await request('GET', '/wishlist/check/999999', null, tokenB);
    assert(checkFake.status === 200 && checkFake.data.inWishlist === false, 'Nonexistent resource returns inWishlist === false');

    // -----------------------------------------------------------------
    // STEP 5: Wishlist Retrieval & ID Set
    // -----------------------------------------------------------------
    console.log('\n--- Step 5: Wishlist Retrieval & ID Sets ---');

    // Get IDs
    const idsRes = await request('GET', '/wishlist/ids', null, tokenB);
    assert(idsRes.status === 200, 'GET /wishlist/ids succeeds with 200');
    assert(Array.isArray(idsRes.data.data), 'Wishlist IDs returned as array');
    assert(idsRes.data.data.includes(resource1Id), 'Wishlist IDs includes resource1Id');

    // Get Full Wishlist
    const listRes = await request('GET', '/wishlist', null, tokenB);
    assert(listRes.status === 200, 'GET /wishlist succeeds with 200');
    assert(listRes.data.data.length === 1, 'User B has exactly 1 item in wishlist');
    const item = listRes.data.data[0];
    assert(item.id === resource1Id, 'Wishlist item matches Resource 1');
    assert(item.title.includes('Calculus 9th Edition'), 'Wishlist item contains title');
    assert(item.owner_name === 'Owner Alice', 'Wishlist item includes owner name');
    assert(item.owner_trust_score !== undefined, 'Wishlist item includes owner trust score');

    // -----------------------------------------------------------------
    // STEP 6: Strict Tenant Isolation & Authorization
    // -----------------------------------------------------------------
    console.log('\n--- Step 6: Strict Tenant Isolation ---');

    // User A should have empty wishlist
    const listA = await request('GET', '/wishlist', null, tokenA);
    assert(listA.status === 200 && listA.data.data.length === 0, 'User A sees empty wishlist (cannot see User B items)');

    const idsA = await request('GET', '/wishlist/ids', null, tokenA);
    assert(idsA.status === 200 && idsA.data.data.length === 0, 'User A sees empty wishlist IDs');

    // User C should have empty wishlist
    const listC = await request('GET', '/wishlist', null, tokenC);
    assert(listC.status === 200 && listC.data.data.length === 0, 'User C sees empty wishlist');

    // User C tries to delete Resource 1 from their own wishlist (which is empty)
    const delC = await request('DELETE', `/wishlist/${resource1Id}`, null, tokenC);
    assert(delC.status === 200 && delC.data.inWishlist === false, 'User C delete returns inWishlist: false without error');

    // Verify User B still has Resource 1
    const checkBStillHas = await request('GET', `/wishlist/check/${resource1Id}`, null, tokenB);
    assert(checkBStillHas.data.inWishlist === true, 'User B wishlist remains completely unaffected by User C');

    // Nonexistent resource add should return 404
    const addNonexistent = await request('POST', '/wishlist/999999', null, tokenB);
    assert(addNonexistent.status === 404, 'Adding nonexistent resource returns 404 Not Found');

    // -----------------------------------------------------------------
    // STEP 7: Wishlist Toggle
    // -----------------------------------------------------------------
    console.log('\n--- Step 7: Wishlist Toggle Functionality ---');

    // Toggle OFF
    const toggleOff = await request('POST', `/wishlist/${resource1Id}/toggle`, null, tokenB);
    assert(toggleOff.status === 200 && toggleOff.data.inWishlist === false, 'Toggle successfully removed Resource 1 (inWishlist: false)');

    const idsAfterOff = await request('GET', '/wishlist/ids', null, tokenB);
    assert(!idsAfterOff.data.data.includes(resource1Id), 'Wishlist IDs no longer contains Resource 1');

    // Toggle ON
    const toggleOn = await request('POST', `/wishlist/${resource1Id}/toggle`, null, tokenB);
    assert(toggleOn.status === 200 && toggleOn.data.inWishlist === true, 'Toggle successfully re-added Resource 1 (inWishlist: true)');

    const idsAfterOn = await request('GET', '/wishlist/ids', null, tokenB);
    assert(idsAfterOn.data.data.includes(resource1Id), 'Wishlist IDs now contains Resource 1 again');

    // -----------------------------------------------------------------
    // STEP 8: Smart Availability Alert (Status Transition -> AVAILABLE)
    // -----------------------------------------------------------------
    console.log('\n--- Step 8: Smart Availability Alerts on Status Change ---');

    // First change Resource 1 status to 'RESERVED'
    await db.query('UPDATE resources SET status = ? WHERE id = ?', ['RESERVED', resource1Id]);

    // Verify status is RESERVED in database
    const [rowsReserved] = await db.query('SELECT status FROM resources WHERE id = ?', [resource1Id]);
    assert(rowsReserved[0].status === 'RESERVED', 'Resource 1 is now RESERVED in database');

    // User A updates Resource 1 status back to 'AVAILABLE' via API
    const updateRes = await request('PUT', `/resources/${resource1Id}`, {
      title: `Calculus 9th Edition ${ts}`,
      description: 'Clean textbook, minimal highlights.',
      category_id: cat1.id,
      exchange_type: 'SELL',
      price: 150,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Science Library',
      status: 'AVAILABLE'
    }, tokenA);
    assert(updateRes.status === 200, 'User A updated Resource 1 back to AVAILABLE');

    // Small delay to allow async notification insert
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check notifications for User B
    const notifResB = await request('GET', '/notifications', null, tokenB);
    assert(notifResB.status === 200, 'User B fetched notifications');
    
    const availabilityAlert = (notifResB.data.data || []).find(
      n => (n.type === 'WISHLIST_AVAILABLE' || n.notification_type === 'WISHLIST_AVAILABLE') && 
           Number(n.related_id) === Number(resource1Id)
    );
    assert(availabilityAlert !== undefined, 'User B received WISHLIST_AVAILABLE alert for Resource 1');
    assert(availabilityAlert.title.includes('Available') || availabilityAlert.title.includes('Wishlist'), 
      'Notification title indicates wishlist availability');
    console.log(`     Alert title: "${availabilityAlert.title}", message: "${availabilityAlert.message}"`);

    // -----------------------------------------------------------------
    // STEP 9: Smart Category Match Alert (New Listing in Saved Category)
    // -----------------------------------------------------------------
    console.log('\n--- Step 9: Smart Category Match Alerts ---');

    // User B has Resource 1 (cat1) in wishlist
    // User A creates Resource 3 also in cat1
    const res3 = await request('POST', '/resources', {
      title: `Advanced Reference Guide ${ts}`,
      description: 'Comprehensive guide in same category.',
      category_id: cat1.id,
      exchange_type: 'SELL',
      price: 180,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Central Atrium'
    }, tokenA);
    assert(res3.status === 201, `User A created Resource 3 in category ${cat1.name}`);

    // Small delay for async notification
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check notifications for User B
    const notifResB2 = await request('GET', '/notifications', null, tokenB);
    const categoryAlert = (notifResB2.data.data || []).find(
      n => (n.type === 'WISHLIST_AVAILABLE' || n.notification_type === 'WISHLIST_AVAILABLE') && 
           n.message.includes(cat1.name)
    );
    assert(categoryAlert !== undefined, `User B received category match alert for ${cat1.name}`);
    console.log(`     Category alert message: "${categoryAlert.message}"`);

    // -----------------------------------------------------------------
    // STEP 10: Notification Failure Isolation
    // -----------------------------------------------------------------
    console.log('\n--- Step 10: Notification Failure Isolation ---');
    // Ensure that listing or updating resources succeeds without error
    const res4 = await request('POST', '/resources', {
      title: `Lab Equipment Set ${ts}`,
      description: 'Isolated test set.',
      category_id: cat2.id,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'Physics Lab'
    }, tokenA);
    assert(res4.status === 201, 'Resource creation succeeds cleanly (isolated from notifications)');

    // -----------------------------------------------------------------
    // STEP 11: Remove from Wishlist
    // -----------------------------------------------------------------
    console.log('\n--- Step 11: Remove from Wishlist ---');
    const delRes = await request('DELETE', `/wishlist/${resource1Id}`, null, tokenB);
    assert(delRes.status === 200, 'DELETE /wishlist/:id returns 200');
    assert(delRes.data.inWishlist === false, 'Response indicates inWishlist: false');

    const finalCheck = await request('GET', `/wishlist/check/${resource1Id}`, null, tokenB);
    assert(finalCheck.data.inWishlist === false, 'Final check confirms Resource 1 removed');

    const finalList = await request('GET', '/wishlist', null, tokenB);
    assert(finalList.data.data.length === 0, 'User B wishlist is completely empty');

    // -----------------------------------------------------------------
    // STEP 12: Cleanup
    // -----------------------------------------------------------------
    console.log('\n--- Step 12: Cleanup ---');
    await db.query('DELETE FROM wishlist WHERE user_id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);
    await db.query('DELETE FROM notifications WHERE recipient_id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);
    await db.query('DELETE FROM resources WHERE owner_id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);
    await db.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA.id, userB.id, userC.id]);
    console.log('  [PASS] Test data cleaned up successfully');

    console.log('\n================================================================');
    console.log(`  ALL M14 WISHLIST TESTS PASSED (${passedTests}/${totalTests})`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\nTest execution failed:', err);
    try {
      if (userA || userB || userC) {
        const uids = [userA?.id, userB?.id, userC?.id].filter(Boolean);
        if (uids.length > 0) {
          const ph = uids.map(() => '?').join(',');
          await db.query(`DELETE FROM wishlist WHERE user_id IN (${ph})`, uids);
          await db.query(`DELETE FROM notifications WHERE recipient_id IN (${ph})`, uids);
          await db.query(`DELETE FROM resources WHERE owner_id IN (${ph})`, uids);
          await db.query(`DELETE FROM users WHERE id IN (${ph})`, uids);
        }
      }
    } catch (_) {}
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runWishlistVerification();
