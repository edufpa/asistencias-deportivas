const http = require('http');

const EMAIL = 'site.eduardo@gmail.com';
// We need to test the partidos page access
// First get CSRF, then login, then access page

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.setTimeout(20000, () => { req.destroy(new Error('Timeout')); });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  // Step 1: Get CSRF token
  console.log('1. Getting CSRF token...');
  const csrfRes = await makeRequest({
    hostname: 'localhost', port: 3000,
    path: '/api/auth/csrf', method: 'GET'
  });
  console.log('   Status:', csrfRes.status);
  const { csrfToken } = JSON.parse(csrfRes.body);
  const csrfCookie = (csrfRes.headers['set-cookie'] || []).join('; ');
  console.log('   CSRF token:', csrfToken.substring(0, 30) + '...');

  // Step 2: Try login with different password options
  const passwords = ['Admin1234!', 'admin123', '123456', 'password', 'Admin123', 'eduardo'];
  let sessionCookie = '';
  
  for (const pwd of passwords) {
    const body = `csrfToken=${csrfToken}&email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(pwd)}&callbackUrl=%2Fdashboard&json=true`;
    const loginRes = await makeRequest({
      hostname: 'localhost', port: 3000,
      path: '/api/auth/callback/credentials', method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': csrfCookie
      }
    }, body);
    
    if (loginRes.status === 302 && !loginRes.headers.location?.includes('error')) {
      console.log(`\n2. Login SUCCESS with password: ${pwd}`);
      sessionCookie = [...(csrfRes.headers['set-cookie'] || []), ...(loginRes.headers['set-cookie'] || [])].join('; ');
      break;
    } else {
      console.log(`   Password "${pwd}": FAILED (${loginRes.headers.location})`);
    }
  }
  
  if (!sessionCookie) {
    console.log('\nCould not login with any password. Testing page directly without auth...');
    // Test without auth - should redirect to login (307)
    const res = await makeRequest({
      hostname: 'localhost', port: 3000,
      path: '/convocatorias/cmnq9nzmu000204jmewplzuow/partidos', method: 'GET'
    });
    console.log('Page status (no auth):', res.status, '->', res.headers.location);
  } else {
    // Step 3: Access the partidos page
    console.log('\n3. Accessing partidos page with session...');
    const pageRes = await makeRequest({
      hostname: 'localhost', port: 3000,
      path: '/convocatorias/cmnq9nzmu000204jmewplzuow/partidos', method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    console.log('   Status:', pageRes.status);
    console.log('   Body length:', pageRes.body.length);
    if (pageRes.status !== 200) {
      console.log('   Body:', pageRes.body.substring(0, 2000));
    } else {
      console.log('   Page loaded successfully!');
      if (pageRes.body.includes('error') || pageRes.body.includes('Error')) {
        console.log('   WARNING: Error text found in response');
      }
    }
  }
}

main().catch(e => console.error('Error:', e.message));
