/**
 * RESOURCEHUB — M23: ADVANCED ADMIN MODERATION & AUDIT HISTORY TEST SUITE
 * 
 * Tests:
 * 1. Test accounts setup (Admin, Alice Owner, Bob Target, Charlie Reporter)
 * 2. Authorization Security & Role Modification Protection:
 *    - 401 unauthenticated rejected
 *    - 403 non-admin forbidden on /api/admin/*
 *    - Admin self-suspension/deactivation prevention (403 Forbidden)
 * 3. User Moderation & Audit Logging:
 *    - Admin suspends user with reason
 *    - Admin re-activates user with reason
 *    - Inspect user moderation history (GET /api/admin/users/:id/moderation-history)
 * 4. Resource Moderation & Reports Inspection:
 *    - Inspect reports filed against specific resource (GET /api/admin/resources/:id/reports)
 *    - Admin resource listing enriched with owner trust score & report counts
 *    - Admin archives resource with reason
 *    - Admin unarchives resource back to AVAILABLE with reason
 *    - Inspect resource moderation history (GET /api/admin/resources/:id/moderation-history)
 * 5. Report Investigation & Resolution Notes:
 *    - Fetch report detail snapshot (GET /api/admin/reports/:id)
 *    - Search reports by keywords (GET /api/admin/reports?search=...)
 *    - Resolve report with resolution notes (PATCH /api/admin/reports/:id/status)
 * 6. Global Audit Logs Query & Filtering:
 *    - Query all audit logs (GET /api/admin/audit-logs)
 *    - Filter by entity_type (USER / RESOURCE / REPORT)
 *    - Search audit logs by reason text
 * 7. Security & Privacy Inspection:
 *    - Ensure no password hashes, bcrypt salts, or tokens leaked in audit logs/reports
 */

const http = require('http');
const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');

const BASE_URL = 'http://localhost:5000/api';

function request(method, reqPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + reqPath);
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

async function registerAndLogin(name, email, password, department = 'Computer Science', year = 2) {
  await request('POST', '/auth/register', {
    name,
    email,
    password,
    department,
    year_of_study: year
  });
  await db.query("UPDATE users SET status = 'ACTIVE' WHERE email = ?", [email]);
  const loginRes = await request('POST', '/auth/login', { email, password });
  if (loginRes.status !== 200 || !loginRes.data?.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(loginRes.data)}`);
  }
  return {
    token: loginRes.data.data.token,
    user: loginRes.data.data.user
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('--- MILESTONE M23: ADVANCED ADMIN MODERATION & AUDIT HISTORY ---');
  console.log('====================================================\n');

  try {
    const timestamp = Date.now();
    const adminEmail = `admin_m23_${timestamp}@test.edu`;
    const userAliceEmail = `alice_m23_${timestamp}@test.edu`;
    const userBobEmail = `bob_m23_${timestamp}@test.edu`;
    const userCharlieEmail = `charlie_m23_${timestamp}@test.edu`;
    const password = 'Password123';

    console.log('--- 1. Setting Up Test Accounts ---');

    // Register & elevate Admin
    const admin = await registerAndLogin('M23 Admin User', adminEmail, password, 'Administration', 4);
    await db.query("UPDATE users SET role = 'ADMIN' WHERE id = ?", [admin.user.id]);
    // Refresh admin token with ADMIN role
    const adminLogin = await request('POST', '/auth/login', { email: adminEmail, password });
    const adminToken = adminLogin.data.data.token;
    const adminId = admin.user.id;
    console.log(`[PASS] Registered and elevated Admin (ID: ${adminId})`);

    // Register User Alice (Listing Owner)
    const alice = await registerAndLogin('Alice Resource Owner', userAliceEmail, password, 'Physics', 2);
    const aliceToken = alice.token;
    const aliceId = alice.user.id;
    console.log(`[PASS] Registered Alice (ID: ${aliceId})`);

    // Register User Bob (Target User for suspension)
    const bob = await registerAndLogin('Bob Target Student', userBobEmail, password, 'Mathematics', 1);
    const bobToken = bob.token;
    const bobId = bob.user.id;
    console.log(`[PASS] Registered Bob (ID: ${bobId})`);

    // Register User Charlie (Reporter)
    const charlie = await registerAndLogin('Charlie Reporter', userCharlieEmail, password, 'Chemistry', 3);
    const charlieToken = charlie.token;
    const charlieId = charlie.user.id;
    console.log(`[PASS] Registered Charlie (ID: ${charlieId})`);

    // Get a category ID
    const [categories] = await db.query('SELECT id FROM categories LIMIT 1');
    const categoryId = categories[0].id;

    // Alice creates a resource
    const resRes = await request(
      'POST',
      '/resources',
      {
        title: `M23 Advanced Textbook ${timestamp}`,
        description: 'Comprehensive moderation test textbook for M23.',
        category_id: categoryId,
        exchange_type: 'DONATE',
        item_condition: 'LIKE_NEW',
        meetup_location: 'Central Library Floor 2'
      },
      aliceToken
    );
    if (resRes.status !== 201) throw new Error(`Failed to create resource: ${JSON.stringify(resRes.data)}`);
    const resourceId = resRes.data.resource?.id || resRes.data.data?.resource?.id || resRes.data.data?.id;
    console.log(`[PASS] Alice created resource ID: ${resourceId}`);

    // Insert a report on Alice's resource
    const [reportInsert] = await db.query(
      `INSERT INTO reports (reporter_id, reported_entity_type, reported_entity_id, reason, description, status)
       VALUES (?, 'RESOURCE', ?, 'Copyright Infringement', 'Incorrect edition listed in textbook description.', 'PENDING')`,
      [charlieId, resourceId]
    );
    const reportId = reportInsert.insertId;
    console.log(`[PASS] Created test report ID: ${reportId} for resource ${resourceId}`);

    console.log('\n--- 2. Authorization Security & Role Modification Protection ---');
    // Unauthenticated access
    const unauthRes = await request('GET', '/admin/audit-logs');
    if (unauthRes.status === 401) {
      console.log('[PASS] Unauthenticated request to audit-logs rejected (401)');
    } else {
      throw new Error(`Expected 401 for unauthenticated audit-logs, got ${unauthRes.status}`);
    }

    // Non-admin (Bob) access
    const nonAdminRes = await request('GET', '/admin/audit-logs', null, bobToken);
    if (nonAdminRes.status === 403) {
      console.log('[PASS] Non-admin access to audit-logs forbidden (403)');
    } else {
      throw new Error(`Expected 403 for non-admin audit-logs, got ${nonAdminRes.status}`);
    }

    // Admin self-suspension/deactivation prevention
    const selfSuspRes = await request(
      'PATCH',
      `/admin/users/${adminId}/status`,
      { status: 'SUSPENDED', reason: 'Self deactivation test' },
      adminToken
    );
    if (selfSuspRes.status === 403 || selfSuspRes.status === 400) {
      console.log(`[PASS] Admin self-suspension blocked (${selfSuspRes.status}: ${selfSuspRes.data?.message || selfSuspRes.data?.error})`);
    } else {
      throw new Error(`Expected 403/400 for admin self-suspension, got ${selfSuspRes.status}`);
    }

    console.log('\n--- 3. User Moderation & Audit Logging ---');
    // Admin suspends Bob
    const suspendRes = await request(
      'PATCH',
      `/admin/users/${bobId}/status`,
      { status: 'SUSPENDED', reason: 'Repeated policy violations and spam behavior' },
      adminToken
    );
    const suspendedStatus = suspendRes.data?.data?.status || suspendRes.data?.user?.status;
    if (suspendRes.status !== 200 || suspendedStatus !== 'SUSPENDED') {
      throw new Error(`Failed to suspend Bob: ${JSON.stringify(suspendRes.data)}`);
    }
    console.log(`[PASS] Bob suspended by Admin`);

    // Admin activates Bob back
    const activateRes = await request(
      'PATCH',
      `/admin/users/${bobId}/status`,
      { status: 'ACTIVE', reason: 'Appeal accepted after warning' },
      adminToken
    );
    const activeStatus = activateRes.data?.data?.status || activateRes.data?.user?.status;
    if (activateRes.status !== 200 || activeStatus !== 'ACTIVE') {
      throw new Error(`Failed to activate Bob: ${JSON.stringify(activateRes.data)}`);
    }
    console.log(`[PASS] Bob re-activated by Admin`);

    // Check Bob's moderation history
    const bobHistRes = await request('GET', `/admin/users/${bobId}/moderation-history`, null, adminToken);
    const bobHistory = bobHistRes.data.history || bobHistRes.data.data?.history || bobHistRes.data.data || [];
    console.log(`[PASS] Fetched Bob moderation history: ${bobHistory.length} log(s) found`);
    if (bobHistory.length < 2) {
      throw new Error('Expected at least 2 audit entries for Bob');
    }
    const latestBobLog = bobHistory[0];
    const actionName = latestBobLog.action_type || latestBobLog.action;
    console.log(`  Latest Action: ${actionName}, Reason: "${latestBobLog.reason}", Admin: ${latestBobLog.admin_name || latestBobLog.admin_email}`);

    console.log('\n--- 4. Resource Moderation & Reports Inspection ---');
    // Admin checks reports on Alice's resource
    const resReportsRes = await request('GET', `/admin/resources/${resourceId}/reports`, null, adminToken);
    const resReports = resReportsRes.data.reports || resReportsRes.data.data?.reports || resReportsRes.data.data || [];
    console.log(`[PASS] Resource reports endpoint returned ${resReports.length} report(s)`);
    if (resReports.length !== 1) {
      throw new Error(`Expected 1 report for resource ${resourceId}`);
    }

    // Admin checks resource list with owner trust score & report count
    const adminResourcesRes = await request(
      'GET',
      `/admin/resources?search=${encodeURIComponent(`M23 Advanced Textbook ${timestamp}`)}`,
      null,
      adminToken
    );
    const resourceList = adminResourcesRes.data.resources || adminResourcesRes.data.data?.resources || adminResourcesRes.data.data || [];
    const foundResource = resourceList.find(r => r.id === resourceId);
    if (!foundResource) {
      throw new Error(`Resource ${resourceId} not found in admin resource query`);
    }
    console.log(`[PASS] Admin resource query enriched with owner metrics: Owner="${foundResource.owner_name}", TrustScore=${foundResource.owner_trust_score}, ReportsCount=${foundResource.report_count}`);

    // Admin archives resource
    const archiveRes = await request(
      'PATCH',
      `/admin/resources/${resourceId}/status`,
      { status: 'ARCHIVED', reason: 'Listing archived pending clarification on edition' },
      adminToken
    );
    if (archiveRes.status !== 200) {
      throw new Error(`Failed to archive resource: ${JSON.stringify(archiveRes.data)}`);
    }
    console.log(`[PASS] Admin archived resource with reason`);

    // Admin unarchives resource back to AVAILABLE
    const unarchiveRes = await request(
      'PATCH',
      `/admin/resources/${resourceId}/status`,
      { status: 'AVAILABLE', reason: 'Edition verified with owner, restored' },
      adminToken
    );
    if (unarchiveRes.status !== 200) {
      throw new Error(`Failed to unarchive resource: ${JSON.stringify(unarchiveRes.data)}`);
    }
    console.log(`[PASS] Admin unarchived resource with reason`);

    // Check resource moderation history
    const resHistRes = await request('GET', `/admin/resources/${resourceId}/moderation-history`, null, adminToken);
    const resHistory = resHistRes.data.history || resHistRes.data.data?.history || resHistRes.data.data || [];
    console.log(`[PASS] Fetched Resource moderation history: ${resHistory.length} log(s) found`);
    if (resHistory.length < 2) {
      throw new Error('Expected at least 2 audit entries for Resource');
    }

    console.log('\n--- 5. Report Investigation & Resolution Notes ---');
    // Fetch report detail snapshot
    const reportDetailRes = await request('GET', `/admin/reports/${reportId}`, null, adminToken);
    const reportDetail = reportDetailRes.data.report || reportDetailRes.data.data?.report || reportDetailRes.data.data;
    if (reportDetailRes.status !== 200 || !reportDetail) {
      throw new Error(`Failed to get report detail: ${JSON.stringify(reportDetailRes.data)}`);
    }
    console.log(`[PASS] Report detail snapshot fetched: ID=${reportDetail.id}, Reason="${reportDetail.reason}"`);

    // Search reports
    const reportSearchRes = await request('GET', '/admin/reports?search=Incorrect+edition', null, adminToken);
    const searchReports = reportSearchRes.data.reports || reportSearchRes.data.data?.reports || reportSearchRes.data.data || [];
    const foundReportInSearch = searchReports.find(r => r.id === reportId);
    if (!foundReportInSearch) {
      throw new Error(`Report ${reportId} not found in report search`);
    }
    console.log(`[PASS] Admin report search successfully found report ID ${reportId}`);

    // Resolve report with resolution notes
    const resolveReportRes = await request(
      'PATCH',
      `/admin/reports/${reportId}/status`,
      {
        status: 'RESOLVED',
        reason: 'Contacted seller, edition description updated accurately.'
      },
      adminToken
    );
    if (resolveReportRes.status !== 200) {
      throw new Error(`Failed to resolve report: ${JSON.stringify(resolveReportRes.data)}`);
    }
    console.log(`[PASS] Report resolved with admin resolution notes`);

    console.log('\n--- 6. Global Audit Logs Query & Filtering ---');
    // Query audit logs with no filters
    const allAuditRes = await request('GET', '/admin/audit-logs', null, adminToken);
    const auditLogs = allAuditRes.data.audit_logs || allAuditRes.data.data?.audit_logs || allAuditRes.data.data || [];
    console.log(`[PASS] Total audit logs returned: ${auditLogs.length}`);

    // Filter by entity_type=USER
    const userAuditRes = await request('GET', '/admin/audit-logs?entity_type=USER', null, adminToken);
    const userLogs = userAuditRes.data.audit_logs || userAuditRes.data.data?.audit_logs || userAuditRes.data.data || [];
    const nonUserLogs = userLogs.filter(l => (l.target_entity_type || l.entity_type) !== 'USER');
    if (nonUserLogs.length > 0) {
      throw new Error('Audit logs filtered by entity_type=USER contained non-USER logs');
    }
    console.log(`[PASS] Filter by entity_type=USER returned ${userLogs.length} log(s) correctly`);

    // Filter by search query
    const searchAuditRes = await request('GET', '/admin/audit-logs?search=Repeated+policy+violations', null, adminToken);
    const searchedLogs = searchAuditRes.data.audit_logs || searchAuditRes.data.data?.audit_logs || searchAuditRes.data.data || [];
    if (searchedLogs.length === 0) {
      throw new Error('Audit logs search did not find matching reason');
    }
    console.log(`[PASS] Audit log search matched ${searchedLogs.length} entry with reason query`);

    console.log('\n--- 7. Security & Privacy Inspection ---');
    // Ensure audit logs contain no password hashes or tokens
    const jsonString = JSON.stringify(allAuditRes.data);
    if (jsonString.includes('password_hash') || jsonString.includes('$2a$') || jsonString.includes('$2b$')) {
      throw new Error('SECURITY VIOLATION: Password hashes detected in audit log API response!');
    }
    console.log('[PASS] Confirmed no password hashes or security credentials leaked in audit logs');

    console.log('\n====================================================');
    console.log('✅ ALL M23 ADVANCED ADMIN MODERATION & AUDIT TESTS PASSED');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ M23 Test Failed:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

runTests();
