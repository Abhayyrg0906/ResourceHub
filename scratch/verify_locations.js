/**
 * RESOURCEHUB — M21: LOCATION AND MEETUP MAP INTEGRATION TEST SUITE
 * 
 * Tests:
 * 1. Campus Locations Directory Endpoints (GET /api/locations/campus, category filters, search)
 * 2. Resource Creation with Valid Meetup Location (Presets & Custom)
 * 3. Rejection of Missing/Empty Meetup Locations (400 Bad Request)
 * 4. Meetup Location Updates & Persistence
 * 5. Authorization Enforcement on Meetup Location Updates (403 Forbidden for Non-Owners)
 * 6. Exchange Request & Transaction Details Integration (resource_meetup_location field)
 * 7. Privacy & Security Inspection
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
  console.log('  RESOURCEHUB — M21: LOCATION & MEETUP MAP INTEGRATION TESTS   ');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const password = 'Password123!';

  try {
    // ----------------------------------------------------
    // STEP 1: Campus Locations Directory Endpoints
    // ----------------------------------------------------
    console.log('--- Step 1: Campus Exchange Locations Directory API ---');

    // 1a. GET /api/locations/campus
    const campusRes = await request('GET', '/locations/campus');
    assert(campusRes.status === 200, 'GET /api/locations/campus responds with 200 OK');
    assert(campusRes.data.success === true, 'Response indicates success');
    assert(Array.isArray(campusRes.data.data), 'Returns array of verified campus locations');
    assert(campusRes.data.data.length >= 6, 'Contains at least 6 verified campus exchange hubs');

    const sampleLoc = campusRes.data.data[0];
    assert(typeof sampleLoc.id === 'string', 'Location has string id');
    assert(typeof sampleLoc.name === 'string', 'Location has name');
    assert(typeof sampleLoc.category === 'string', 'Location has category');
    assert(typeof sampleLoc.building === 'string', 'Location has building');
    assert(typeof sampleLoc.floor === 'string', 'Location has floor');
    assert(typeof sampleLoc.coordinates === 'object', 'Location has coordinates object');
    assert(typeof sampleLoc.coordinates.x === 'number' && typeof sampleLoc.coordinates.y === 'number', 'Coordinates include valid x and y map positions');
    assert(sampleLoc.safety_level === 'HIGH' || sampleLoc.safety_level === 'STANDARD', 'Location has valid safety_level rating');
    assert(Array.isArray(sampleLoc.safety_features), 'Location includes safety_features array');
    assert(typeof sampleLoc.recommended_hours === 'string', 'Location includes recommended_hours');

    // 1b. Category filtering
    const libraryCatRes = await request('GET', '/locations/campus?category=Library');
    assert(libraryCatRes.status === 200, 'GET /api/locations/campus with category filter succeeds');
    const allAreLibraries = libraryCatRes.data.data.every(loc => loc.category === 'Library');
    assert(allAreLibraries, 'All returned locations match filtered Library category');

    // 1c. Search endpoint
    const searchRes = await request('GET', '/locations/search?q=Union');
    assert(searchRes.status === 200, 'GET /api/locations/search?q=Union responds with 200 OK');
    assert(searchRes.data.data.length > 0, 'Found matching Student Union location');
    assert(searchRes.data.data.some(l => l.name.includes('Student Union')), 'Matched Student Union hub');

    // ----------------------------------------------------
    // STEP 2: User Setup & Resource Creation with Locations
    // ----------------------------------------------------
    console.log('\n--- Step 2: User Setup & Resource Creation with Locations ---');

    // User A (Owner)
    const ownerEmail = `loc_owner_${timestamp}@univ.edu`;
    const regOwner = await request('POST', '/auth/register', {
      name: 'Oliver Owner',
      email: ownerEmail,
      password: password,
      department: 'Civil Engineering',
      year_of_study: 3
    });
    assert(regOwner.status === 201, 'Owner registered');

    const logOwner = await request('POST', '/auth/login', { email: ownerEmail, password: password });
    assert(logOwner.status === 200, 'Owner logged in');
    const ownerToken = logOwner.data.data.token;
    const ownerId = logOwner.data.data.user.id;

    // User B (Buyer/Requester)
    const requesterEmail = `loc_requester_${timestamp}@univ.edu`;
    const regReq = await request('POST', '/auth/register', {
      name: 'Rachel Requester',
      email: requesterEmail,
      password: password,
      department: 'Architecture',
      year_of_study: 2
    });
    assert(regReq.status === 201, 'Requester registered');

    const logReq = await request('POST', '/auth/login', { email: requesterEmail, password: password });
    assert(logReq.status === 200, 'Requester logged in');
    const reqToken = logReq.data.data.token;
    const reqId = logReq.data.data.user.id;

    // Fetch Category
    const catRes = await request('GET', '/categories');
    const categoryId = catRes.data.data[0].id;

    // 2a. Create Resource with Preset Campus Location
    const presetLocation = 'Central Library Lobby';
    const createRes1 = await request('POST', '/resources', {
      title: `Engineering Mechanics Notes ${timestamp}`,
      description: 'Handwritten mechanics notes covering statics and dynamics.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 25.00,
      item_condition: 'LIKE_NEW',
      meetup_location: presetLocation
    }, ownerToken);

    assert(createRes1.status === 201, 'Created resource listing with preset campus meetup location');
    const resource1Id = createRes1.data.data.id;

    // Verify location in resource details
    const getRes1 = await request('GET', `/resources/${resource1Id}`);
    assert(getRes1.status === 200, 'Fetched resource details');
    assert(getRes1.data.data.meetup_location === presetLocation, `Resource details reflect exact meetup location: ${presetLocation}`);

    // 2b. Create Resource with Custom Location
    const customLocation = 'North Quad Student Lounge Area';
    const createRes2 = await request('POST', '/resources', {
      title: `Drafting Compass & Tools ${timestamp}`,
      description: 'Precision compass set for drafting classes.',
      category_id: categoryId,
      exchange_type: 'BORROW',
      item_condition: 'GOOD',
      meetup_location: customLocation
    }, ownerToken);

    assert(createRes2.status === 201, 'Created resource listing with custom campus meetup location');
    const resource2Id = createRes2.data.data.id;

    const getRes2 = await request('GET', `/resources/${resource2Id}`);
    assert(getRes2.data.data.meetup_location === customLocation, `Resource details reflect custom meetup location: ${customLocation}`);

    // ----------------------------------------------------
    // STEP 3: Empty / Missing Location Validation
    // ----------------------------------------------------
    console.log('\n--- Step 3: Empty & Invalid Location Validation ---');

    // Missing meetup_location field
    const invalidMissing = await request('POST', '/resources', {
      title: `Invalid Listing Missing Location ${timestamp}`,
      description: 'Should fail due to missing location.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'FAIR'
    }, ownerToken);
    assert(invalidMissing.status === 400, 'Rejected creation with missing meetup_location (400 Bad Request)');

    // Blank / Whitespace meetup_location
    const invalidBlank = await request('POST', '/resources', {
      title: `Invalid Listing Blank Location ${timestamp}`,
      description: 'Should fail due to whitespace location.',
      category_id: categoryId,
      exchange_type: 'DONATE',
      item_condition: 'FAIR',
      meetup_location: '   '
    }, ownerToken);
    assert(invalidBlank.status === 400, 'Rejected creation with whitespace meetup_location (400 Bad Request)');

    // ----------------------------------------------------
    // STEP 4: Meetup Location Updates & Persistence
    // ----------------------------------------------------
    console.log('\n--- Step 4: Meetup Location Updates & Persistence ---');

    const updatedLocation = 'Student Union Hub (1st Floor)';
    const updateRes = await request('PUT', `/resources/${resource1Id}`, {
      title: `Engineering Mechanics Notes ${timestamp}`,
      description: 'Updated description for mechanics notes.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 25.00,
      item_condition: 'LIKE_NEW',
      meetup_location: updatedLocation,
      status: 'AVAILABLE'
    }, ownerToken);

    assert(updateRes.status === 200, 'Owner updated resource meetup location (200 OK)');
    assert(updateRes.data.success === true, 'Update response indicates success');

    // Confirm persistence via GET
    const getUpdated = await request('GET', `/resources/${resource1Id}`);
    assert(getUpdated.data.data.meetup_location === updatedLocation, 'Re-fetched resource persists updated meetup location');

    // ----------------------------------------------------
    // STEP 5: Authorization Enforcement on Location Updates
    // ----------------------------------------------------
    console.log('\n--- Step 5: Authorization Enforcement on Location Updates ---');

    // Requester (non-owner) attempts to modify owner's resource location
    const unauthUpdate = await request('PUT', `/resources/${resource1Id}`, {
      title: `Hacked Title ${timestamp}`,
      description: 'Unauthorized update.',
      category_id: categoryId,
      exchange_type: 'SELL',
      price: 1.00,
      item_condition: 'POOR',
      meetup_location: 'Unauthorized Remote Spot',
      status: 'AVAILABLE'
    }, reqToken);

    assert(unauthUpdate.status === 403, 'Non-owner blocked from modifying resource location with 403 Forbidden');

    // ----------------------------------------------------
    // STEP 6: Exchange Request & Transaction Integration
    // ----------------------------------------------------
    console.log('\n--- Step 6: Exchange Request & Transaction Location Integration ---');

    // Requester creates an exchange request for Resource 1
    const createReqRes = await request('POST', '/exchange-requests', {
      resource_id: resource1Id,
      proposed_exchange_type: 'SELL',
      message: 'Hello, looking forward to meeting at the Student Union Hub!'
    }, reqToken);
    assert(createReqRes.status === 201, 'Exchange request created');
    const transactionId = createReqRes.data.data.id;

    // 6a. Requester fetches outgoing requests
    const outgoingRes = await request('GET', '/exchange-requests?role=requester', null, reqToken);
    assert(outgoingRes.status === 200, 'Requester fetched outgoing requests');
    const foundOutTx = outgoingRes.data.data.find(tx => tx.id === transactionId);
    assert(foundOutTx !== undefined, 'Found transaction in requester outgoing requests');
    assert(foundOutTx.resource_meetup_location === updatedLocation, `Requester query includes resource_meetup_location: "${updatedLocation}"`);

    // 6b. Owner fetches incoming requests
    const incomingRes = await request('GET', '/exchange-requests?role=owner', null, ownerToken);
    assert(incomingRes.status === 200, 'Owner fetched incoming requests');
    const foundInTx = incomingRes.data.data.find(tx => tx.id === transactionId);
    assert(foundInTx !== undefined, 'Found transaction in owner incoming requests');
    assert(foundInTx.resource_meetup_location === updatedLocation, `Owner query includes resource_meetup_location: "${updatedLocation}"`);

    // 6c. Specific request lookup (GET /api/exchange-requests/:id)
    const specificTxRes = await request('GET', `/exchange-requests/${transactionId}`, null, reqToken);
    assert(specificTxRes.status === 200, 'Fetched specific exchange request details');
    assert(specificTxRes.data.data.resource_meetup_location === updatedLocation, 'Transaction details contain resource_meetup_location');

    // ----------------------------------------------------
    // STEP 7: Security & Privacy Inspection
    // ----------------------------------------------------
    console.log('\n--- Step 7: Security & Privacy Inspection ---');

    const inspectedItems = [
      getUpdated.data.data,
      getRes2.data.data,
      foundOutTx,
      foundInTx
    ];

    let leakedSensitive = false;
    for (const item of inspectedItems) {
      if (item.password_hash !== undefined || item.password !== undefined) leakedSensitive = true;
    }
    assert(!leakedSensitive, 'No sensitive password hashes or authentication secrets leaked');

    console.log('\n================================================================');
    console.log(`  M21 LOCATION TEST SUMMARY: ${passedTests} PASSED, 0 FAILED`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n[FATAL ERROR IN TEST SUITE]:', error.message);
    process.exit(1);
  }
}

runTests();
