const path = require('path');
require(path.join(__dirname, '../server/node_modules/dotenv')).config({ path: path.join(__dirname, '../server/.env') });
const db = require('../server/config/database');

const API_URL = 'http://127.0.0.1:5000/api';

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

async function runTests() {
  console.log('====================================================');
  console.log('  MILESTONE M10: ADMIN & MODERATION TEST SUITE      ');
  console.log('====================================================\n');

  let adminToken, studentToken;
  let adminUser, studentUser;
  let testResourceId;
  let testReportId;

  try {
    // 0. Setup test users
    console.log('1. Setting up admin and student test users...');
    const adminEmail = `m10_admin_${Date.now()}@university.edu`;
    const studentEmail = `m10_student_${Date.now()}@university.edu`;
    const defaultPassword = 'Password123';

    // Register Student
    await request('POST', '/auth/register', {
      name: 'M10 Student',
      email: studentEmail,
      password: defaultPassword,
      department: 'Computer Science',
      year_of_study: 2
    });

    // Register Admin candidate
    const regAdmin = await request('POST', '/auth/register', {
      name: 'M10 Administrator',
      email: adminEmail,
      password: defaultPassword,
      department: 'Administration',
      year_of_study: 4
    });

    // Promote Admin candidate to ADMIN role in database
    await db.query("UPDATE users SET role = 'ADMIN', status = 'ACTIVE' WHERE email = ?", [adminEmail]);

    // Login Admin
    const logAdmin = await request('POST', '/auth/login', {
      email: adminEmail,
      password: defaultPassword
    });
    adminToken = logAdmin.data.data.token;
    adminUser = logAdmin.data.data.user;

    // Login Student
    const logStudent = await request('POST', '/auth/login', {
      email: studentEmail,
      password: defaultPassword
    });
    studentToken = logStudent.data.data.token;
    studentUser = logStudent.data.data.user;

    // ----------------------------------------------------
    // TEST A & B: Authentication verification
    // ----------------------------------------------------
    console.log('2. Testing [A & B]: Authentication & Role Verification...');
    if (!adminToken || adminUser.role !== 'ADMIN') {
      throw new Error(`TEST A FAILED: Admin login failed or role is not ADMIN. Role: ${adminUser?.role}`);
    }
    console.log(`   [PASS] Admin authenticated successfully (ID: ${adminUser.id}, Role: ${adminUser.role}).`);

    if (!studentToken || studentUser.role !== 'STUDENT') {
      throw new Error(`TEST B FAILED: Student login failed or role is not STUDENT. Role: ${studentUser?.role}`);
    }
    console.log(`   [PASS] Student authenticated successfully (ID: ${studentUser.id}, Role: ${studentUser.role}).`);

    // ----------------------------------------------------
    // TEST C: Unauthenticated access blocked (401)
    // ----------------------------------------------------
    console.log('\n3. Testing [C]: Unauthenticated access to /api/admin/stats...');
    const unauthRes = await request('GET', '/admin/stats');
    if (unauthRes.status !== 401) {
      throw new Error(`TEST C FAILED: Expected 401 for unauthenticated request, got ${unauthRes.status}`);
    }
    console.log('   [PASS] Unauthenticated request blocked with 401.');

    // ----------------------------------------------------
    // TEST D: Student access blocked with 403
    // ----------------------------------------------------
    console.log('\n4. Testing [D]: Student access to /api/admin/stats...');
    const studentRes = await request('GET', '/admin/stats', null, studentToken);
    if (studentRes.status !== 403) {
      throw new Error(`TEST D FAILED: Expected 403 for student request, got ${studentRes.status}`);
    }
    console.log('   [PASS] Student access blocked with 403 Forbidden.');

    // ----------------------------------------------------
    // TEST E: Admin dashboard statistics
    // ----------------------------------------------------
    console.log('\n5. Testing [E]: Admin retrieves platform statistics (GET /api/admin/stats)...');
    const statsRes = await request('GET', '/admin/stats', null, adminToken);
    if (!statsRes.ok || !statsRes.data.success) {
      throw new Error(`TEST E FAILED: Failed to fetch stats: ${JSON.stringify(statsRes.data)}`);
    }
    const stats = statsRes.data.data;
    const requiredStats = [
      'total_users', 'active_users', 'total_resources', 
      'available_resources', 'total_exchange_requests', 
      'completed_exchanges', 'pending_reports'
    ];
    for (const field of requiredStats) {
      if (typeof stats[field] !== 'number') {
        throw new Error(`TEST E FAILED: Missing or non-numeric statistic field: ${field}`);
      }
    }
    console.log('   [PASS] Platform statistics retrieved successfully:');
    console.log(`          Users: ${stats.total_users} (Active: ${stats.active_users})`);
    console.log(`          Resources: ${stats.total_resources} (Available: ${stats.available_resources})`);
    console.log(`          Exchanges: ${stats.total_exchange_requests} (Completed: ${stats.completed_exchanges})`);
    console.log(`          Pending Reports: ${stats.pending_reports}`);

    // ----------------------------------------------------
    // TEST F & G: User management & password hash exposure check
    // ----------------------------------------------------
    console.log('\n6. Testing [F & G]: Admin user management list and password privacy...');
    const usersRes = await request('GET', '/admin/users', null, adminToken);
    if (!usersRes.ok || !usersRes.data.success || !Array.isArray(usersRes.data.data)) {
      throw new Error(`TEST F FAILED: Failed to fetch user list: ${JSON.stringify(usersRes.data)}`);
    }
    const usersList = usersRes.data.data;
    const hasPasswordHash = usersList.some(u => u.password_hash !== undefined || u.password !== undefined);
    if (hasPasswordHash) {
      throw new Error('TEST G FAILED: Sensitive password hashes exposed in admin user list!');
    }
    console.log(`   [PASS] Users list retrieved (${usersList.length} users). Password hashes are NOT exposed.`);

    // ----------------------------------------------------
    // TEST H: Admin updates a user's status
    // ----------------------------------------------------
    console.log('\n7. Testing [H]: Admin updates user status (PATCH /api/admin/users/:id/status)...');
    const updateStatusRes = await request('PATCH', `/admin/users/${studentUser.id}/status`, {
      status: 'SUSPENDED'
    }, adminToken);
    if (!updateStatusRes.ok || !updateStatusRes.data.success) {
      throw new Error(`TEST H FAILED: Failed to update user status: ${JSON.stringify(updateStatusRes.data)}`);
    }

    // Verify status updated in DB
    const [checkUser] = await db.query('SELECT status FROM users WHERE id = ?', [studentUser.id]);
    if (checkUser[0].status !== 'SUSPENDED') {
      throw new Error(`TEST H FAILED: DB status expected SUSPENDED, found ${checkUser[0].status}`);
    }

    // Check user received notification
    const [notifRows] = await db.query(
      "SELECT * FROM notifications WHERE recipient_id = ? AND notification_type = 'ACCOUNT_STATUS_CHANGED'",
      [studentUser.id]
    );
    if (notifRows.length === 0) {
      throw new Error('TEST H FAILED: Notification was not dispatched to suspended user');
    }
    console.log('   [PASS] User status updated to SUSPENDED and user received notification.');

    // Re-activate student for subsequent tests
    await request('PATCH', `/admin/users/${studentUser.id}/status`, { status: 'ACTIVE' }, adminToken);

    // ----------------------------------------------------
    // TEST I: Admin cannot deactivate themselves
    // ----------------------------------------------------
    console.log('\n8. Testing [I]: Admin self-deactivation prevention...');
    const selfDeactivateRes = await request('PATCH', `/admin/users/${adminUser.id}/status`, {
      status: 'SUSPENDED'
    }, adminToken);
    if (selfDeactivateRes.status !== 403) {
      throw new Error(`TEST I FAILED: Expected 403 for admin self-deactivation, got ${selfDeactivateRes.status}`);
    }
    console.log('   [PASS] Admin self-deactivation blocked with 403 Forbidden.');

    // ----------------------------------------------------
    // TEST J & K: Resource moderation
    // ----------------------------------------------------
    console.log('\n9. Testing [J & K]: Admin resource listing & moderation (ARCHIVE)...');
    // Create resource to moderate
    const [categories] = await db.query('SELECT id FROM categories LIMIT 1');
    const createRes = await request('POST', '/resources', {
      title: 'M10 Moderation Test Book',
      description: 'Book for moderation testing.',
      category_id: categories[0].id,
      exchange_type: 'DONATE',
      item_condition: 'GOOD',
      meetup_location: 'Student Union'
    }, studentToken);
    testResourceId = createRes.data.data.id;

    // Admin lists resources
    const resListRes = await request('GET', '/admin/resources', null, adminToken);
    if (!resListRes.ok || !resListRes.data.success) {
      throw new Error('TEST J FAILED: Failed to fetch admin resources');
    }
    console.log(`   [PASS] Admin retrieved resources list (${resListRes.data.data.length} listings).`);

    // Admin archives resource
    const archiveRes = await request('PATCH', `/admin/resources/${testResourceId}/status`, {
      status: 'ARCHIVED'
    }, adminToken);
    if (!archiveRes.ok || !archiveRes.data.success) {
      throw new Error(`TEST K FAILED: Failed to archive resource: ${JSON.stringify(archiveRes.data)}`);
    }

    const [resDb] = await db.query('SELECT status FROM resources WHERE id = ?', [testResourceId]);
    if (resDb[0].status !== 'ARCHIVED') {
      throw new Error(`TEST K FAILED: DB resource status is not ARCHIVED, got ${resDb[0].status}`);
    }

    // Verify owner received RESOURCE_ARCHIVED notification
    const [resNotifs] = await db.query(
      "SELECT * FROM notifications WHERE recipient_id = ? AND notification_type = 'RESOURCE_ARCHIVED'",
      [studentUser.id]
    );
    if (resNotifs.length === 0) {
      throw new Error('TEST K FAILED: Owner did not receive RESOURCE_ARCHIVED notification');
    }
    console.log('   [PASS] Resource successfully archived and owner received notification.');

    // ----------------------------------------------------
    // TEST L & M: Report management
    // ----------------------------------------------------
    console.log('\n10. Testing [L & M]: Admin report listing & status updates...');
    // Create a report in DB
    const [repInsert] = await db.query(
      `INSERT INTO reports (reporter_id, reported_entity_type, reported_entity_id, reason, description, status)
       VALUES (?, 'RESOURCE', ?, 'Copyright Infringement', 'Unauthorized course material', 'PENDING')`,
      [studentUser.id, testResourceId]
    );
    testReportId = repInsert.insertId;

    // Admin lists reports
    const repListRes = await request('GET', '/admin/reports', null, adminToken);
    if (!repListRes.ok || !repListRes.data.success) {
      throw new Error('TEST L FAILED: Failed to fetch admin reports');
    }
    const foundReport = repListRes.data.data.find(r => r.id === testReportId);
    if (!foundReport) {
      throw new Error(`TEST L FAILED: Report #${testReportId} not found in admin reports list`);
    }
    console.log(`   [PASS] Admin retrieved reports list (${repListRes.data.data.length} reports).`);

    // Admin updates report status to RESOLVED
    const updateRepRes = await request('PATCH', `/admin/reports/${testReportId}/status`, {
      status: 'RESOLVED',
      admin_resolution: 'Listing investigated and confirmed removed.'
    }, adminToken);
    if (!updateRepRes.ok || !updateRepRes.data.success) {
      throw new Error(`TEST M FAILED: Failed to resolve report: ${JSON.stringify(updateRepRes.data)}`);
    }

    const [repDb] = await db.query('SELECT status, admin_resolution FROM reports WHERE id = ?', [testReportId]);
    if (repDb[0].status !== 'RESOLVED') {
      throw new Error(`TEST M FAILED: Report status in DB is not RESOLVED, got ${repDb[0].status}`);
    }

    // Verify reporter received notification
    const [repNotifs] = await db.query(
      "SELECT * FROM notifications WHERE recipient_id = ? AND notification_type = 'REPORT_RESOLVED'",
      [studentUser.id]
    );
    if (repNotifs.length === 0) {
      throw new Error('TEST M FAILED: Reporter did not receive REPORT_RESOLVED notification');
    }
    console.log('   [PASS] Report resolved with resolution notes and reporter received notification.');

    // ----------------------------------------------------
    // TEST N, O, P: Student blocked from all admin endpoints
    // ----------------------------------------------------
    console.log('\n11. Testing [N, O, P]: Student blocked from all admin endpoints...');
    const studentUsers = await request('GET', '/admin/users', null, studentToken);
    if (studentUsers.status !== 403) throw new Error(`TEST N FAILED: Student accessed /admin/users (status ${studentUsers.status})`);
    console.log('   [PASS] Student blocked from GET /api/admin/users (403)');

    const studentResources = await request('GET', '/admin/resources', null, studentToken);
    if (studentResources.status !== 403) throw new Error(`TEST O FAILED: Student accessed /admin/resources (status ${studentResources.status})`);
    console.log('   [PASS] Student blocked from GET /api/admin/resources (403)');

    const studentReports = await request('GET', '/admin/reports', null, studentToken);
    if (studentReports.status !== 403) throw new Error(`TEST P FAILED: Student accessed /admin/reports (status ${studentReports.status})`);
    console.log('   [PASS] Student blocked from GET /api/admin/reports (403)');

    console.log('\n====================================================');
    console.log('  ALL M10 TESTS (A THROUGH P) PASSED SUCCESSFULLY!  ');
    console.log('====================================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ M10 TEST FAILED:', error);
    if (error.cause) console.error('CAUSE:', error.cause);
    process.exit(1);
  }
}

runTests();
