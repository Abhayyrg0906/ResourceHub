/**
 * Milestone M12: Advanced Search & Filtering Test Suite
 * Tests:
 *  1. Title search (case-insensitive partial matching)
 *  2. Description search (case-insensitive partial matching)
 *  3. Category filter
 *  4. Exchange type filter (SELL, BORROW, DONATE, SWAP)
 *  5. Condition filter (NEW, LIKE_NEW, GOOD, FAIR, POOR)
 *  6. Price range filtering (min_price, max_price, range)
 *  7. Location filtering (partial matching)
 *  8. Sorting (latest, oldest, price_low, price_high, trust_score, relevance)
 *  9. Combined multi-criteria search & filtering
 *  10. Pagination metadata and limit/page navigation
 *  11. Empty results handling
 *  12. SQL injection safety across all query parameters
 *  13. Private/Archived resource protection (status visibility)
 *  14. Existing resource management API regression (CRUD integrity)
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

async function runSearchFilterTests() {
  console.log('================================================================');
  console.log('  MILESTONE M12: ADVANCED SEARCH & FILTERING TEST SUITE         ');
  console.log('================================================================\n');

  const ts = Date.now();
  const ownerEmail = `m12_tester_${ts}@university.edu`;
  const defaultPassword = 'Password123';
  let token, userId;
  let catTextbooksId, catElectronicsId, catLabId;
  let testResourceIds = [];

  try {
    // ----------------------------------------------------------------
    // SETUP: Register User & Categories
    // ----------------------------------------------------------------
    console.log('1. Setting up test user & categories...');
    const regRes = await request('POST', '/auth/register', {
      name: 'M12 Search Tester',
      email: ownerEmail,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 3
    });
    assert(regRes.status === 201, 'Test user registered successfully');
    userId = regRes.data.data.user.id;

    // Promote status to ACTIVE and set high trust score
    await db.query("UPDATE users SET status = 'ACTIVE', trust_score = 98.50 WHERE id = ?", [userId]);

    const logRes = await request('POST', '/auth/login', { email: ownerEmail, password: defaultPassword });
    assert(logRes.status === 200 && logRes.data.data.token, 'Test user logged in');
    token = logRes.data.data.token;

    // Fetch categories
    const catRes = await request('GET', '/categories');
    assert(catRes.status === 200 && catRes.data.data.length >= 3, 'Retrieved active categories');
    
    // Pick categories
    const catList = catRes.data.data;
    catTextbooksId = catList.find(c => c.name.toLowerCase().includes('book'))?.id || catList[0].id;
    catElectronicsId = catList.find(c => c.name.toLowerCase().includes('electronic'))?.id || catList[1].id;
    catLabId = catList.find(c => c.name.toLowerCase().includes('lab') || c.name.toLowerCase().includes('stationery'))?.id || catList[2].id;

    // Clean up any previous test resources to ensure exact counts
    await db.query("DELETE FROM resources WHERE title LIKE 'M12 %'");

    // Create Sample Dataset for M12 Testing
    console.log('\n2. Seeding M12 test resources...');

    // Resource 1: SELL Calculus book
    const r1 = await request('POST', '/resources', {
      title: `M12 Advanced Calculus 8th Edition ${ts}`,
      description: 'Hardcover textbook covering multivariable calculus and differential equations',
      category_id: catTextbooksId,
      exchange_type: 'SELL',
      price: 450,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Central Campus Library 2nd Floor'
    }, token);
    assert(r1.status === 201, 'Created Resource 1: Advanced Calculus (SELL, 450, LIKE_NEW)');
    const id1 = r1.data.data.id;
    testResourceIds.push(id1);

    // Resource 2: SELL Digital Multimeter
    const r2 = await request('POST', '/resources', {
      title: `M12 Digital Multimeter Fluke Test Kit ${ts}`,
      description: 'Precision electronics measurement tool for circuit laboratory projects',
      category_id: catElectronicsId,
      exchange_type: 'SELL',
      price: 1200,
      item_condition: 'NEW',
      meetup_location: 'ECE Department Lab Room 302'
    }, token);
    assert(r2.status === 201, 'Created Resource 2: Digital Multimeter (SELL, 1200, NEW)');
    const id2 = r2.data.data.id;
    testResourceIds.push(id2);

    // Resource 3: DONATE Calculus Pocket Notes
    const r3 = await request('POST', '/resources', {
      title: `M12 Calculus Quick Reference Pocket Guide ${ts}`,
      description: 'Comprehensive handwritten summaries for exam preparation',
      category_id: catTextbooksId,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'Engineering Student Cafe'
    }, token);
    assert(r3.status === 201, 'Created Resource 3: Calculus Pocket Guide (DONATE, GOOD)');
    const id3 = r3.data.data.id;
    testResourceIds.push(id3);

    // Resource 4: BORROW Lab Safety Coat & Goggles
    const r4 = await request('POST', '/resources', {
      title: `M12 Laboratory Safety Goggles & Coat ${ts}`,
      description: 'Essential protective gear for organic chemistry lab sessions',
      category_id: catLabId,
      exchange_type: 'BORROW',
      item_condition: 'FAIR',
      meetup_location: 'Chemistry Annex Building'
    }, token);
    assert(r4.status === 201, 'Created Resource 4: Lab Safety Gear (BORROW, FAIR)');
    const id4 = r4.data.data.id;
    testResourceIds.push(id4);

    // Resource 5: SWAP Graphing Calculator
    const r5 = await request('POST', '/resources', {
      title: `M12 TI-84 Plus Graphing Calculator ${ts}`,
      description: 'Graphing calculator with charging cable. Looking to swap for mechanical keyboard',
      category_id: catElectronicsId,
      exchange_type: 'SWAP',
      item_condition: 'GOOD',
      meetup_location: 'Student Union Lounge'
    }, token);
    assert(r5.status === 201, 'Created Resource 5: Graphing Calculator (SWAP, GOOD)');
    const id5 = r5.data.data.id;
    testResourceIds.push(id5);

    // Resource 6: ARCHIVED resource (Must be excluded from public results)
    const r6 = await request('POST', '/resources', {
      title: `M12 Secret Archived Hidden Resource ${ts}`,
      description: 'This resource was archived and should never appear in public search results',
      category_id: catTextbooksId,
      exchange_type: 'DONATE',
      item_condition: 'POOR',
      meetup_location: 'Behind Dorms'
    }, token);
    const id6 = r6.data.data.id;
    testResourceIds.push(id6);
    // Soft delete / archive it
    await db.query("UPDATE resources SET status = 'ARCHIVED' WHERE id = ?", [id6]);

    // ----------------------------------------------------------------
    // TEST 1: Basic Title Search
    // ----------------------------------------------------------------
    console.log('\n--- TEST 1: BASIC TITLE SEARCH ---');
    const searchTitleRes = await request('GET', `/resources?search=Multimeter`);
    assert(searchTitleRes.status === 200, 'Title search responded with 200');
    assert(searchTitleRes.data.data.some(r => r.id === id2), 'Title search successfully found matching resource');
    assert(!searchTitleRes.data.data.some(r => r.id === id1), 'Title search correctly excluded non-matching resource');

    // ----------------------------------------------------------------
    // TEST 2: Description Search (Case-Insensitive Partial Match)
    // ----------------------------------------------------------------
    console.log('\n--- TEST 2: DESCRIPTION SEARCH (CASE-INSENSITIVE) ---');
    const searchDescRes = await request('GET', `/resources?search=circuit`);
    assert(searchDescRes.data.data.some(r => r.id === id2), 'Description search matched keyword "circuit" in description');

    const searchUpperRes = await request('GET', `/resources?search=CIRCUIT`);
    assert(searchUpperRes.data.data.some(r => r.id === id2), 'Case-insensitive search (UPPERCASE) matched keyword');

    // ----------------------------------------------------------------
    // TEST 3: Category Filtering
    // ----------------------------------------------------------------
    console.log('\n--- TEST 3: CATEGORY FILTERING ---');
    const catFilterRes = await request('GET', `/resources?category_id=${catElectronicsId}&search=${ts}`);
    assert(catFilterRes.status === 200, 'Category filter returned 200');
    assert(catFilterRes.data.data.every(r => r.category_id === catElectronicsId), 'All returned resources match requested category_id');
    assert(catFilterRes.data.data.some(r => r.id === id2) && catFilterRes.data.data.some(r => r.id === id5), 'Returned expected electronics resources');

    // ----------------------------------------------------------------
    // TEST 4: Exchange Type Filtering (SELL, BORROW, DONATE, SWAP)
    // ----------------------------------------------------------------
    console.log('\n--- TEST 4: EXCHANGE TYPE FILTERING ---');
    const sellRes = await request('GET', `/resources?exchange_type=SELL&search=${ts}`);
    assert(sellRes.data.data.every(r => r.exchange_type === 'SELL'), 'exchange_type=SELL filter strictly matched');
    assert(sellRes.data.data.some(r => r.id === id1) && sellRes.data.data.some(r => r.id === id2), 'Found both SELL items');

    const donateRes = await request('GET', `/resources?exchange_type=DONATE&search=${ts}`);
    assert(donateRes.data.data.every(r => r.exchange_type === 'DONATE'), 'exchange_type=DONATE filter strictly matched');
    assert(donateRes.data.data.some(r => r.id === id3), 'Found DONATE item');

    const borrowRes = await request('GET', `/resources?exchange_type=BORROW&search=${ts}`);
    assert(borrowRes.data.data.every(r => r.exchange_type === 'BORROW'), 'exchange_type=BORROW filter strictly matched');
    assert(borrowRes.data.data.some(r => r.id === id4), 'Found BORROW item');

    const swapRes = await request('GET', `/resources?exchange_type=SWAP&search=${ts}`);
    assert(swapRes.data.data.every(r => r.exchange_type === 'SWAP'), 'exchange_type=SWAP filter strictly matched');
    assert(swapRes.data.data.some(r => r.id === id5), 'Found SWAP item');

    // ----------------------------------------------------------------
    // TEST 5: Item Condition Filtering
    // ----------------------------------------------------------------
    console.log('\n--- TEST 5: CONDITION FILTERING ---');
    const newCondRes = await request('GET', `/resources?item_condition=NEW&search=${ts}`);
    assert(newCondRes.data.data.every(r => r.item_condition === 'NEW'), 'item_condition=NEW filter strictly matched');
    assert(newCondRes.data.data.some(r => r.id === id2), 'Found NEW item');

    // Condition alias test
    const likeNewRes = await request('GET', `/resources?condition=LIKE_NEW&search=${ts}`);
    assert(likeNewRes.data.data.every(r => r.item_condition === 'LIKE_NEW'), 'condition=LIKE_NEW alias filter strictly matched');
    assert(likeNewRes.data.data.some(r => r.id === id1), 'Found LIKE_NEW item');

    // ----------------------------------------------------------------
    // TEST 6: Price Range Filtering (min_price, max_price)
    // ----------------------------------------------------------------
    console.log('\n--- TEST 6: PRICE RANGE FILTERING ---');
    // Min price 500: should include id2 (1200), exclude id1 (450)
    const minPriceRes = await request('GET', `/resources?min_price=500&search=${ts}`);
    assert(minPriceRes.data.data.some(r => r.id === id2), 'min_price=500 included item with price 1200');
    assert(!minPriceRes.data.data.some(r => r.id === id1), 'min_price=500 excluded item with price 450');

    // Max price 500: should include id1 (450), exclude id2 (1200)
    const maxPriceRes = await request('GET', `/resources?max_price=500&search=${ts}`);
    assert(maxPriceRes.data.data.some(r => r.id === id1), 'max_price=500 included item with price 450');
    assert(!maxPriceRes.data.data.some(r => r.id === id2), 'max_price=500 excluded item with price 1200');

    // Price range 400 - 600: should only include id1 (450)
    const rangeRes = await request('GET', `/resources?min_price=400&max_price=600&search=${ts}`);
    assert(rangeRes.data.data.length === 1 && rangeRes.data.data[0].id === id1, 'Price range 400-600 matched exactly item with price 450');

    // ----------------------------------------------------------------
    // TEST 7: Meetup Location Filtering (Partial Match)
    // ----------------------------------------------------------------
    console.log('\n--- TEST 7: LOCATION FILTERING ---');
    const locRes1 = await request('GET', `/resources?location=Library&search=${ts}`);
    assert(locRes1.data.data.some(r => r.id === id1), 'location=Library matched Central Campus Library');

    const locRes2 = await request('GET', `/resources?meetup_location=Annex&search=${ts}`);
    assert(locRes2.data.data.some(r => r.id === id4), 'meetup_location=Annex matched Chemistry Annex Building');

    // ----------------------------------------------------------------
    // TEST 8: Sorting Options
    // ----------------------------------------------------------------
    console.log('\n--- TEST 8: SORTING OPTIONS ---');
    
    // Sort oldest vs latest
    const oldestRes = await request('GET', `/resources?search=${ts}&sort=oldest`);
    const latestRes = await request('GET', `/resources?search=${ts}&sort=latest`);
    assert(oldestRes.data.data[0].id === id1, 'sort=oldest returned oldest created resource first');
    assert(latestRes.data.data[0].id === id5, 'sort=latest returned newest created resource first');

    // Sort price_low vs price_high
    const priceLowRes = await request('GET', `/resources?exchange_type=SELL&search=${ts}&sort=price_low`);
    assert(priceLowRes.data.data[0].price === 450 && priceLowRes.data.data[1].price === 1200, 'sort=price_low sorted prices ascending (450 then 1200)');

    const priceHighRes = await request('GET', `/resources?exchange_type=SELL&search=${ts}&sort=price_high`);
    assert(priceHighRes.data.data[0].price === 1200 && priceHighRes.data.data[1].price === 450, 'sort=price_high sorted prices descending (1200 then 450)');

    // Sort trust_score: owner trust score returned in item metadata
    const trustRes = await request('GET', `/resources?search=${ts}&sort=trust_score`);
    assert(trustRes.data.data[0].owner.trust_score >= 90.0, 'sort=trust_score returned resource with high owner trust score');

    // Sort relevance: items with search term in title rank before description
    const relRes = await request('GET', `/resources?search=Calculus&sort=relevant`);
    const firstRel = relRes.data.data[0];
    assert(firstRel.title.toLowerCase().includes('calculus'), 'sort=relevant prioritized resource with keyword in title');

    // ----------------------------------------------------------------
    // TEST 9: Combined Multi-Criteria Filtering
    // ----------------------------------------------------------------
    console.log('\n--- TEST 9: COMBINED MULTI-CRITERIA FILTERING ---');
    const combinedRes = await request(
      'GET', 
      `/resources?search=Calculus&exchange_type=SELL&max_price=500&item_condition=LIKE_NEW&category_id=${catTextbooksId}`
    );
    assert(combinedRes.status === 200, 'Combined filter request succeeded (200)');
    assert(combinedRes.data.data.length === 1 && combinedRes.data.data[0].id === id1, 'Combined query matched exactly 1 targeted resource');

    // ----------------------------------------------------------------
    // TEST 10: Pagination Metadata & Navigation
    // ----------------------------------------------------------------
    console.log('\n--- TEST 10: PAGINATION & METADATA ---');
    const page1Res = await request('GET', `/resources?search=${ts}&limit=2&page=1`);
    assert(page1Res.data.pagination.page === 1, 'Pagination current page is 1');
    assert(page1Res.data.pagination.limit === 2, 'Pagination limit is 2');
    assert(page1Res.data.pagination.total === 5, 'Pagination total reflects exactly 5 active resources');
    assert(page1Res.data.pagination.totalPages === 3, 'Pagination totalPages computed as 3');
    assert(page1Res.data.data.length === 2, 'Page 1 returned exactly 2 items');

    const page2Res = await request('GET', `/resources?search=${ts}&limit=2&page=2`);
    assert(page2Res.data.pagination.page === 2, 'Page 2 current page is 2');
    assert(page2Res.data.data.length === 2, 'Page 2 returned 2 items');
    // Ensure distinct items across pages
    const page1Ids = page1Res.data.data.map(r => r.id);
    const page2Ids = page2Res.data.data.map(r => r.id);
    assert(!page1Ids.some(id => page2Ids.includes(id)), 'Page 1 and Page 2 contain mutually exclusive items');

    // ----------------------------------------------------------------
    // TEST 11: Empty Results Handling
    // ----------------------------------------------------------------
    console.log('\n--- TEST 11: EMPTY RESULTS HANDLING ---');
    const emptyRes = await request('GET', `/resources?search=NonExistentTermXYZ_9999999`);
    assert(emptyRes.status === 200, 'Empty search returned HTTP 200');
    assert(Array.isArray(emptyRes.data.data) && emptyRes.data.data.length === 0, 'data is empty array');
    assert(emptyRes.data.pagination.total === 0, 'pagination.total is 0');

    // ----------------------------------------------------------------
    // TEST 12: SQL Injection Attack Prevention
    // ----------------------------------------------------------------
    console.log('\n--- TEST 12: SQL INJECTION PREVENTION ---');
    
    // Malicious search string
    const sqliSearch = await request('GET', `/resources?search=' OR '1'='1`);
    assert(sqliSearch.status === 200, 'Malicious search input safely handled without error');

    // Malicious sort param
    const sqliSort = await request('GET', `/resources?sort=id; DROP TABLE users;`);
    assert(sqliSort.status === 200, 'Malicious sort parameter safely caught by whitelist');

    // Malicious price param
    const sqliPrice = await request('GET', `/resources?min_price=10; DROP TABLE resources;`);
    assert(sqliPrice.status === 200, 'Malicious min_price parameter parsed safely without SQL injection');

    // Malicious location param
    const sqliLoc = await request('GET', `/resources?location=' UNION SELECT 1,2,3--`);
    assert(sqliLoc.status === 200, 'Malicious location parameter parameterized safely');

    // ----------------------------------------------------------------
    // TEST 13: Private / Archived Data Protection
    // ----------------------------------------------------------------
    console.log('\n--- TEST 13: PRIVATE / ARCHIVED DATA PROTECTION ---');
    
    // Public browse must NEVER show ARCHIVED items
    const publicBrowse = await request('GET', `/resources?search=${ts}`);
    assert(!publicBrowse.data.data.some(r => r.id === id6), 'Public browse strictly excludes ARCHIVED resource');

    // Direct query attempt for status=ARCHIVED
    const badStatusQuery = await request('GET', `/resources?status=ARCHIVED&search=${ts}`);
    assert(!badStatusQuery.data.data.some(r => r.id === id6), 'Direct status=ARCHIVED query rejected/fallback to AVAILABLE');

    // ----------------------------------------------------------------
    // TEST 14: Existing Resource CRUD API Regression
    // ----------------------------------------------------------------
    console.log('\n--- TEST 14: RESOURCE MANAGEMENT CRUD REGRESSION ---');
    
    // GET /api/resources/:id
    const singleRes = await request('GET', `/resources/${id1}`);
    assert(singleRes.status === 200 && singleRes.data.data.title.includes('Calculus'), 'GET /api/resources/:id retrieves details');
    assert(singleRes.data.data.owner.trust_score !== undefined, 'Resource details include verified owner trust score');

    // PUT /api/resources/:id (Update by owner)
    const updateRes = await request('PUT', `/resources/${id1}`, {
      title: `M12 Advanced Calculus 8th Edition (Revised) ${ts}`,
      description: 'Updated description for regression testing',
      category_id: catTextbooksId,
      exchange_type: 'SELL',
      price: 400,
      item_condition: 'LIKE_NEW',
      meetup_location: 'Central Campus Library 1st Floor',
      status: 'AVAILABLE'
    }, token);
    assert(updateRes.status === 200, 'PUT /api/resources/:id succeeds for owner');

    // DELETE /api/resources/:id (Soft delete / Archive)
    const archiveRes = await request('DELETE', `/resources/${id1}`, null, token);
    assert(archiveRes.status === 200, 'DELETE /api/resources/:id archives resource');

    const verifyArchived = await request('GET', `/resources/${id1}`);
    assert(verifyArchived.data.data.status === 'ARCHIVED', 'Resource status verified as ARCHIVED');

    // ----------------------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`  M12 ADVANCED SEARCH & FILTERING: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('\nM12 VERIFICATION SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runSearchFilterTests();
