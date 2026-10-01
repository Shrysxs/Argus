async function run() {
  const url = 'https://argus-web-beta.vercel.app';
  const res = await fetch(`${url}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test_${Date.now()}@example.com`, password: 'Password123!' })
  });
  const cookie = res.headers.get('set-cookie');
  
  await fetch(`${url}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ asset: 'TON' })
  });
  
  const historyRes = await fetch(`${url}/api/history?page=1&limit=10`, {
    headers: { 'Cookie': cookie }
  });
  console.log('History status:', historyRes.status);
  const data = await historyRes.json();
  console.log('History count:', data.results.length);
  if (data.results.length > 0) {
    console.log('Latest asset:', data.results[0].asset);
  }
}
run().catch(console.error);
