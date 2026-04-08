const https = require('https');
const http = require('http');

// Test production URLs with and without auth
const BASE = 'asistencias-deportivas.vercel.app';

function reqHttps(path, cookies = '') {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE, port: 443,
      path, method: 'GET',
      headers: cookies ? { Cookie: cookies } : {},
      timeout: 15000
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Testing production URLs...\n');
  
  const pages = [
    '/login',
    '/dashboard',
    '/players',
    '/convocatorias',
    '/convocatorias/cmnq9nzmu000204jmewplzuow',
    '/convocatorias/cmnq9nzmu000204jmewplzuow/partidos',
    '/reportes',
  ];
  
  for (const page of pages) {
    try {
      const res = await reqHttps(page);
      const status = res.status;
      const location = res.headers.location || '';
      const bodyLen = res.body.length;
      console.log(`${page}: ${status} ${location} (body: ${bodyLen}b)`);
    } catch (e) {
      console.log(`${page}: ERROR - ${e.message}`);
    }
  }
}

main().catch(console.error);
