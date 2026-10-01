const fs = require('fs');
async function run() {
  const url = 'https://argus-web-beta.vercel.app';
  // Signup
  const res = await fetch(`${url}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test_${Date.now()}@test.com`, password: 'Password123!' })
  });
  const cookie = res.headers.get('set-cookie');
  
  // Analyze
  const analyzeRes = await fetch(`${url}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ asset: 'LINK' })
  });
  const data = await analyzeRes.json();
  console.log(JSON.stringify(data.agentVotes, null, 2));
}
run().catch(console.error);
