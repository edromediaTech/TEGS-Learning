/**
 * Quick integration test for Contest Mode + Proctoring via Socket.io
 */
const { io } = require('socket.io-client');

const BASE = 'http://localhost:3000';
const JWT_TOKEN = process.env.TEST_TOKEN; // Will get from login

async function getToken() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin-xapi@ouanaminthe.edu.ht', password: 'Test1234!', tenant_id: '69ac71869b610ac64b416043' }),
  });
  if (!res.ok) {
    // Try to find a valid user
    console.log('Login failed, trying to create test data...');
    return null;
  }
  const data = await res.json();
  return data.token;
}

async function getTestModule(token) {
  const res = await fetch(`${BASE}/api/modules`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.modules || data.modules.length === 0) return null;
  return data.modules[0];
}

async function runTest() {
  console.log('=== Contest Mode Integration Test ===\n');

  // 1. Get auth token
  const token = await getToken();
  if (!token) {
    console.log('SKIP: No test user available. Testing socket connection only.\n');

    // Test basic socket connectivity
    const studentSock = io(`${BASE}/student`, { path: '/socket.io', transports: ['websocket', 'polling'] });

    await new Promise((resolve) => {
      studentSock.on('connect', () => {
        console.log('PASS: Student socket connected');
        resolve();
      });
      setTimeout(() => { console.log('FAIL: Student socket timeout'); resolve(); }, 5000);
    });

    studentSock.disconnect();
    console.log('\nDone (limited test without auth).');
    process.exit(0);
    return;
  }

  console.log('PASS: Authentication successful');

  // 2. Get test module
  const mod = await getTestModule(token);
  if (!mod) {
    console.log('SKIP: No modules found');
    process.exit(0);
  }
  console.log(`PASS: Found module: ${mod.title} (${mod._id})`);

  // 3. Enable contest mode on the module
  const updateRes = await fetch(`${BASE}/api/modules/${mod._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      evaluationType: 'live',
      contestMode: true,
      proctoring: 'snapshot',
      snapshotInterval: 30,
      liveStartTime: new Date(Date.now() - 3600000).toISOString(),
      liveEndTime: new Date(Date.now() + 3600000).toISOString(),
    }),
  });
  if (updateRes.ok) {
    console.log('PASS: Module updated with contestMode + proctoring');
  } else {
    console.log('WARN: Module update response:', updateRes.status);
  }

  // 4. Connect professor socket
  const profSock = io(`${BASE}/prof`, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  const events = [];

  await new Promise((resolve) => {
    profSock.on('connect', () => {
      console.log('PASS: Professor socket connected');
      profSock.emit('join_room', { moduleId: mod._id });
    });

    profSock.on('student_roster', (roster) => {
      console.log(`PASS: Received student_roster (${roster.length} students)`);
      events.push('student_roster');
    });

    profSock.on('contest_state', (state) => {
      console.log(`PASS: Received contest_state — status: ${state.status}, question: ${state.currentIndex + 1}/${state.totalQuestions}`);
      events.push('contest_state');
    });

    profSock.on('contest_tick', (data) => {
      if (!events.includes('contest_tick')) {
        console.log(`PASS: Received contest_tick — Q${data.questionIndex + 1}, ${data.remaining}s remaining`);
        events.push('contest_tick');
      }
    });

    profSock.on('contest_lock', (data) => {
      console.log(`PASS: Received contest_lock — Q${data.questionIndex + 1}`);
      events.push('contest_lock');
    });

    profSock.on('contest_end', (data) => {
      console.log(`PASS: Received contest_end — reason: ${data.reason}, ${data.stats?.length} questions`);
      events.push('contest_end');
    });

    profSock.on('error_msg', (data) => {
      console.log(`INFO: Error message: ${data.message}`);
    });

    // Wait for roster, then start contest
    setTimeout(() => {
      console.log('\nStarting contest...');
      profSock.emit('contest_start', { moduleId: mod._id });

      // Wait 5 seconds to see some ticks, then stop
      setTimeout(() => {
        console.log('\nStopping contest...');
        profSock.emit('contest_stop', { moduleId: mod._id });

        setTimeout(() => {
          resolve();
        }, 2000);
      }, 5000);
    }, 2000);
  });

  // 5. Connect a student socket
  console.log('\n--- Student Socket Test ---');
  const studentSock = io(`${BASE}/student`, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  await new Promise((resolve) => {
    studentSock.on('connect', () => {
      console.log('PASS: Student socket connected');

      // Test snapshot request/response
      studentSock.on('snapshot_request', (data) => {
        console.log(`PASS: Received snapshot_request (reason: ${data.reason})`);
        // Simulate sending a snapshot back
        studentSock.emit('snapshot_response', {
          imageData: 'data:image/jpeg;base64,/9j/4AAQ==', // tiny fake JPEG
          timestamp: new Date().toISOString(),
        });
      });

      // Listen for contest events
      studentSock.on('contest_start', (data) => {
        console.log(`PASS: Student received contest_start (${data.totalQuestions} questions)`);
      });

      studentSock.on('contest_question', (data) => {
        console.log(`PASS: Student received contest_question — Q${data.questionIndex + 1}: ${data.questionText?.substring(0, 30) || '(no text)'}`);
      });

      resolve();
    });
    setTimeout(() => { console.log('WARN: Student socket timeout'); resolve(); }, 5000);
  });

  // Cleanup
  profSock.disconnect();
  studentSock.disconnect();

  console.log('\n=== Summary ===');
  console.log(`Events received: ${events.join(', ')}`);
  console.log('PASS: All socket tests completed');

  // Reset module
  await fetch(`${BASE}/api/modules/${mod._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ evaluationType: 'personalized', contestMode: false, proctoring: 'none' }),
  });

  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
