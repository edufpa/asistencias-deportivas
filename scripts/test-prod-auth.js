const https = require('https');

const BASE = 'asistencias-deportivas.vercel.app';

function req(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE, port: 443,
      path, method,
      headers: { ...headers, 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    };
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    r.setTimeout(20000, () => r.destroy(new Error('timeout')));
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  // Step 1: Get CSRF token
  console.log('1. Getting CSRF token...');
  const csrfRes = await req('/api/auth/csrf');
  const { csrfToken } = JSON.parse(csrfRes.body);
  const csrfCookies = (csrfRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  console.log('   CSRF:', csrfToken.substring(0, 30) + '...');

  // Step 2: Login
  console.log('2. Logging in...');
  const loginBody = `csrfToken=${csrfToken}&email=site.eduardo%40gmail.com&password=TestPass1234%21&callbackUrl=%2Fdashboard&json=true`;
  const loginRes = await req('/api/auth/callback/credentials', 'POST', {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': csrfCookies
  }, loginBody);
  
  console.log('   Login status:', loginRes.status);
  console.log('   Location:', loginRes.headers.location);
  
  if (loginRes.headers.location?.includes('error')) {
    console.log('   LOGIN FAILED!');
    return;
  }
  
  const sessionCookies = [
    ...csrfCookies.split('; '),
    ...(loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0])
  ].join('; ');
  
  console.log('   Session cookies length:', sessionCookies.length);
  
  // Step 3: Test pages
  const pages = [
    '/dashboard',
    '/convocatorias',
    '/convocatorias/cmnq9nzmu000204jmewplzuow',
    '/convocatorias/cmnq9nzmu000204jmewplzuow/partidos',
  ];
  
  console.log('\n3. Testing protected pages...');
  for (const page of pages) {
    try {
      const res = await req(page, 'GET', { Cookie: sessionCookies });
      console.log(`   ${page}: ${res.status} (body: ${res.body.length}b) ${res.headers.location || ''}`);
      if (res.status === 500 || res.body.includes('Internal Server Error')) {
        console.log(`     !!ERROR!! Body: ${res.body.substring(0, 500)}`);
      }
    } catch (e) {
      console.log(`   ${page}: CONNECTION ERROR - ${e.message}`);
    }
  }
}

main().catch(e => console.error('Fatal:', e.message));
