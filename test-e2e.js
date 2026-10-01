const url = 'https://argus-web-beta.vercel.app';
const email = `test_${Date.now()}@example.com`;
const password = 'Password123!';

async function run() {
  console.log('1. Signup...');
  let res = await fetch(`${url}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  console.log('Signup status:', res.status, await res.text());
  const cookie = res.headers.get('set-cookie');

  console.log('2. Login...');
  res = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginCookie = res.headers.get('set-cookie');
  console.log('Login status:', res.status, await res.text());

  console.log('3. Auth /me...');
  res = await fetch(`${url}/api/auth/me`, {
    headers: { 'Cookie': loginCookie }
  });
  console.log('/me status:', res.status, await res.text());

  console.log('4. Analyze (DOGE)...');
  res = await fetch(`${url}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': loginCookie },
    body: JSON.stringify({ asset: 'DOGE' })
  });
  console.log('/analyze status:', res.status);
  const analyzeText = await res.text();
  try {
    const data = JSON.parse(analyzeText);
    console.log('Analyze agent 1:', JSON.stringify(data.results[0]).substring(0, 300));
    console.log('Analyze agent 2:', JSON.stringify(data.results[1]).substring(0, 300));
  } catch (e) {
    console.log('Analyze raw output:', analyzeText.substring(0, 500));
  }
}
run().catch(console.error);
