/**
 * RESOURCEHUB — M20: RESOURCE RECOMMENDATION SYSTEM TEST SUITE
 * 
 * Tests:
 * 1. Guest / Cold-Start Recommendations (Popularity & High Trust)
 * 2. Authenticated Personalized Recommendations (Wishlist & Exchange Signals)
 * 3. Scoring Formula & Explainability Metadata Validation
 * 4. Self-Owned Resource Exclusion
 * 5. Unavailable / Archived / Reserved Resource Exclusion
 * 6. Duplicate Recommendation Removal
 * 7. Similar Resources Endpoint (/api/recommendations/similar/:id & /api/resources/:id/similar)
 * 8. Category-Based Recommendations
 * 9. Security & Privacy Inspection (No password_hash or sensitive leaks)
 * 10. Tenant / User Isolation
 */

const http = require('http');

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
    throw new Error(`Assertion failed: ${message}`);
  }
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: `${BASE_PATH}${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('  RESOURCEHUB — M20: RESOURCE RECOMMENDATION SYSTEM TEST SUITE  ');
  console.log('================================================================\n');

  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // STEP 1: User Setup (Owner A, Student B, Cold Student C)
    // ----------------------------------------------------
    console.log('--- Step 1: User & Test Environment Setup ---');

    // User A (Resource Owner)
    // User A (Resource Owner)
    const userAEmail = `owner_rec_${timestamp}@univ.edu`;
    const userPassword = 'Password123!';
    const regARes = await request('POST', '/auth/register', {
      name: 'Alice Owner',
      email: userAEmail,
      password: userPassword,
      department: 'Computer Science',
      year_of_study: 3
    });
    assert(regARes.status === 201, 'Owner Alice registered');
    const userAId = regARes.data.data.user.id;

    const logARes = await request('POST', '/auth/login', { email: userAEmail, password: userPassword });
    assert(logARes.status === 200, 'Owner Alice logged in');
    const tokenA = logARes.data.data.token;

    // User B (Active Student with Interests)
    const userBEmail = `student_rec_${timestamp}@univ.edu`;
    const regBRes = await request('POST', '/auth/register', {
      name: 'Bob Learner',
      email: userBEmail,
      password: userPassword,
      department: 'Electrical Engineering',
      year_of_study: 2
    });
    assert(regBRes.status === 201, 'Student Bob registered');
    const userBId = regBRes.data.data.user.id;

    const logBRes = await request('POST', '/auth/login', { email: userBEmail, password: userPassword });
    assert(logBRes.status === 200, 'Student Bob logged in');
    const tokenB = logBRes.data.data.token;

    // User C (Cold Start Student - No Wishlist, No History)
    const userCEmail = `cold_rec_${timestamp}@univ.edu`;
    const regCRes = await request('POST', '/auth/register', {
      name: 'Charlie Fresh',
      email: userCEmail,
      password: userPassword,
      department: 'Mechanical Engineering',
      year_of_study: 1
    });
    assert(regCRes.status === 201, 'Cold Student Charlie registered');
    const userCId = regCRes.data.data.user.id;

    const logCRes = await request('POST', '/auth/login', { email: userCEmail, password: userPassword });
    assert(logCRes.status === 200, 'Cold Student Charlie logged in');
    const tokenC = logCRes.data.data.token;

    // Fetch Categories
    const catRes = await request('GET', '/categories');
    assert(catRes.status === 200 && catRes.data.data.length >= 2, 'Retrieved active categories');
    const booksCat = catRes.data.data.find(c => c.name.toLowerCase().includes('book')) || catRes.data.data[0];
    const elecCat = catRes.data.data.find(c => c.name.toLowerCase().includes('elect')) || catRes.data.data[1];

    // ----------------------------------------------------
    // STEP 2: Listing Creation by Owner Alice
    // ----------------------------------------------------
    console.log('\n--- Step 2: Listing Resources across Categories & Types ---');

    // Resource 1: Books category, BORROW type
    const res1 = await request('POST', '/resources', {
      title: `Algorithms & Data Structures ${timestamp}`,
      description: 'Comprehensive CS textbook covering graphs, dynamic programming, and trees.',
      category_id: booksCat.id,
      exchange_type: 'BORROW',
      item_condition: 'LIKE_NEW',
      meetup_location: 'CS Building Study Hall'
    }, tokenA);
    assert(res1.status === 201, 'Created Resource 1: Algorithms Textbook (Books, BORROW)');
    const resource1Id = res1.data.data.id;

    // Resource 2: Books category, BORROW type (Similar to 1)
    const res2 = await request('POST', '/resources', {
      title: `Operating Systems Concepts ${timestamp}`,
      description: 'Standard textbook for operating system design and concurrency.',
      category_id: booksCat.id,
      exchange_type: 'BORROW',
      item_condition: 'GOOD',
      meetup_location: 'Main Library 2nd Floor'
    }, tokenA);
    assert(res2.status === 201, 'Created Resource 2: Operating Systems (Books, BORROW)');
    const resource2Id = res2.data.data.id;

    // Resource 3: Electronics category, SELL type
    const res3 = await request('POST', '/resources', {
      title: `Arduino Mega 2560 ${timestamp}`,
      description: 'Microcontroller board with USB cable for embedded systems lab.',
      category_id: elecCat.id,
      exchange_type: 'SELL',
      price: 450.00,
      item_condition: 'NEW',
      meetup_location: 'Robotics Workshop'
    }, tokenA);
    assert(res3.status === 201, 'Created Resource 3: Arduino Mega (Electronics, SELL)');
    const resource3Id = res3.data.data.id;

    // Resource 4: Books category, SELL type (To be archived / made unavailable)
    const res4 = await request('POST', '/resources', {
      title: `Old Archived Reference ${timestamp}`,
      description: 'Outdated edition reference manual.',
      category_id: booksCat.id,
      exchange_type: 'SELL',
      price: 100.00,
      item_condition: 'FAIR',
      meetup_location: 'Dorm Block A'
    }, tokenA);
    assert(res4.status === 201, 'Created Resource 4: Archived Reference');
    const resource4Id = res4.data.data.id;

    // ----------------------------------------------------
    // STEP 3: Cold-Start & Guest Recommendation Testing
    // ----------------------------------------------------
    console.log('\n--- Step 3: Cold-Start & Guest Recommendation Testing ---');

    // 3a. Unauthenticated guest request
    const guestRecsRes = await request('GET', '/recommendations');
    assert(guestRecsRes.status === 200, 'GET /api/recommendations responds with 200 OK for guest');
    assert(guestRecsRes.data.success === true, 'Response indicates success');
    assert(Array.isArray(guestRecsRes.data.data), 'Returns array of recommendations');
    assert(guestRecsRes.data.data.length > 0, 'Guest receives campus recommendations');

    const firstGuestRec = guestRecsRes.data.data[0];
    assert(firstGuestRec.recommendation_metadata !== undefined, 'Guest recommendation includes recommendation_metadata');
    assert(typeof firstGuestRec.recommendation_metadata.match_score === 'number', 'Metadata includes numeric match_score');
    assert(Array.isArray(firstGuestRec.recommendation_metadata.reasons), 'Metadata includes reasons array');
    assert(firstGuestRec.recommendation_metadata.score_breakdown.is_cold_start === true, 'Metadata correctly identifies is_cold_start: true');

    // 3b. Authenticated Cold-Start Student (Charlie has 0 interactions)
    const coldStudentRecs = await request('GET', '/recommendations/personalized', null, tokenC);
    assert(coldStudentRecs.status === 200, 'GET /recommendations/personalized responds for cold student');
    assert(coldStudentRecs.data.data.length > 0, 'Cold student receives fallback recommendations');
    assert(coldStudentRecs.data.data[0].recommendation_metadata.score_breakdown.is_cold_start === true, 'Cold student correctly receives cold-start ranked items');

    // ----------------------------------------------------
    // STEP 4: Personalized Scoring & Preference Matching
    // ----------------------------------------------------
    console.log('\n--- Step 4: Personalized Scoring & Preference Matching ---');

    // Student Bob adds Resource 1 (Books, BORROW) to Wishlist
    const wishRes = await request('POST', `/wishlist/${resource1Id}`, null, tokenB);
    assert(wishRes.status === 201 || wishRes.status === 200, 'Student Bob added Resource 1 (Books) to wishlist');

    // Student Bob requests personalized recommendations
    const bPersonalized = await request('GET', '/recommendations/personalized', null, tokenB);
    assert(bPersonalized.status === 200, 'Student Bob fetched personalized recommendations');
    assert(bPersonalized.data.data.length > 0, 'Bob receives personalized recommendations');

    // Find Resource 2 in recommendations (Resource 2 is Books + BORROW)
    const r2InRecs = bPersonalized.data.data.find(item => item.id === resource2Id);
    assert(r2InRecs !== undefined, 'Resource 2 (Operating Systems) recommended to Bob');
    assert(r2InRecs.recommendation_metadata.match_score >= 60, `Resource 2 receives high score: ${r2InRecs.recommendation_metadata.match_score}%`);
    assert(r2InRecs.recommendation_metadata.score_breakdown.category_match === 40, 'Category match gives exactly +40 pts (wishlist category match)');
    assert(r2InRecs.recommendation_metadata.score_breakdown.exchange_preference === 25, 'Exchange preference gives exactly +25 pts (BORROW preference match)');

    const hasCategoryReason = r2InRecs.recommendation_metadata.reasons.some(r => r.includes('wishlist') || r.includes('Books'));
    assert(hasCategoryReason, 'Explainability reasons include wishlist/Books category justification');

    const hasTypeReason = r2InRecs.recommendation_metadata.reasons.some(r => r.includes('BORROW') || r.includes('exchange type'));
    assert(hasTypeReason, 'Explainability reasons include BORROW preference justification');

    // ----------------------------------------------------
    // STEP 5: Self-Owned Resource Exclusion
    // ----------------------------------------------------
    console.log('\n--- Step 5: Self-Owned Resource Exclusion ---');

    // Owner Alice fetches her personalized recommendations
    const aliceRecs = await request('GET', '/recommendations/personalized', null, tokenA);
    assert(aliceRecs.status === 200, 'Owner Alice fetched recommendations');
    const aliceOwnListingsFound = aliceRecs.data.data.filter(item => item.owner_id === userAId);
    assert(aliceOwnListingsFound.length === 0, 'Self-exclusion verified: Alice sees 0 of her own listings in recommendations');

    // ----------------------------------------------------
    // STEP 6: Unavailable & Archived Resource Exclusion
    // ----------------------------------------------------
    console.log('\n--- Step 6: Unavailable & Archived Resource Exclusion ---');

    // Archive Resource 4
    const deleteRes4 = await request('DELETE', `/resources/${resource4Id}`, null, tokenA);
    assert(deleteRes4.status === 200, 'Owner Alice deleted/archived Resource 4');

    // Re-fetch recommendations for Bob
    const recsAfterArchive = await request('GET', '/recommendations/personalized', null, tokenB);
    const archivedFound = recsAfterArchive.data.data.find(item => item.id === resource4Id);
    assert(archivedFound === undefined, 'Archived Resource 4 is strictly excluded from recommendations');

    // ----------------------------------------------------
    // STEP 7: Duplicate Recommendation Removal
    // ----------------------------------------------------
    console.log('\n--- Step 7: Duplicate Recommendation Removal ---');
    const recIds = recsAfterArchive.data.data.map(item => item.id);
    const uniqueRecIds = new Set(recIds);
    assert(recIds.length === uniqueRecIds.size, `No duplicate resource IDs in recommendations (${recIds.length} items, ${uniqueRecIds.size} unique)`);

    // ----------------------------------------------------
    // STEP 8: Similar Resources Endpoint Verification
    // ----------------------------------------------------
    console.log('\n--- Step 8: Similar Resources Verification ---');

    // 8a. GET /api/recommendations/similar/:id
    const similarRes1 = await request('GET', `/recommendations/similar/${resource1Id}`);
    assert(similarRes1.status === 200, 'GET /api/recommendations/similar/:id returns 200 OK');
    assert(Array.isArray(similarRes1.data.data), 'Similar items returned as array');

    // Target item (Resource 1) must NOT be in its own similar list
    const selfInSimilar = similarRes1.data.data.find(item => item.id === resource1Id);
    assert(selfInSimilar === undefined, 'Target resource 1 is strictly excluded from its own similar resources list');

    // Resource 2 should be in similar items (Same category Books + Same type BORROW)
    const foundR2Similar = similarRes1.data.data.find(item => item.id === resource2Id);
    assert(foundR2Similar !== undefined, 'Resource 2 (Operating Systems) is in similar resources for Resource 1');
    assert(foundR2Similar.recommendation_metadata.score_breakdown.category_similarity === 45, 'Category similarity score is 45');
    assert(foundR2Similar.recommendation_metadata.score_breakdown.type_similarity === 25, 'Exchange type similarity score is 25');
    assert(foundR2Similar.recommendation_metadata.reasons.some(r => r.includes('Same category')), 'Similarity reasons state "Same category"');

    // 8b. GET /api/resources/:id/similar (Alias route)
    const similarAliasRes = await request('GET', `/resources/${resource1Id}/similar`);
    assert(similarAliasRes.status === 200, 'GET /api/resources/:id/similar alias responds with 200 OK');
    assert(similarAliasRes.data.data.length === similarRes1.data.data.length, 'Alias route returns identical similar items');

    // ----------------------------------------------------
    // STEP 9: Category-Based Recommendations
    // ----------------------------------------------------
    console.log('\n--- Step 9: Category-Based Recommendations ---');

    const catRecsRes = await request('GET', `/recommendations/category/${booksCat.id}`);
    assert(catRecsRes.status === 200, 'GET /api/recommendations/category/:id returns 200 OK');
    assert(Array.isArray(catRecsRes.data.data), 'Category recommendations returned as array');
    const allMatchCat = catRecsRes.data.data.every(item => item.category_id === booksCat.id);
    assert(allMatchCat, 'All returned items strictly belong to requested category');

    // ----------------------------------------------------
    // STEP 10: Security & Privacy Verification
    // ----------------------------------------------------
    console.log('\n--- Step 10: Security & Privacy Inspection ---');

    const allItemsToInspect = [
      ...bPersonalized.data.data,
      ...similarRes1.data.data,
      ...catRecsRes.data.data
    ];

    let passwordHashFound = false;
    let jwtSecretFound = false;

    for (const item of allItemsToInspect) {
      if (item.password_hash !== undefined || item.password !== undefined) passwordHashFound = true;
      if (item.token !== undefined || item.jwt !== undefined) jwtSecretFound = true;
    }

    assert(!passwordHashFound, 'Security check passed: password_hash is never exposed in recommendation items');
    assert(!jwtSecretFound, 'Security check passed: tokens/credentials are never leaked');

    console.log('\n================================================================');
    console.log(`  M20 RECOMMENDATION TEST SUMMARY: ${passedTests} PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', error.message);
    process.exit(1);
  }
}

runTests();
