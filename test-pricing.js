async function run() {
  const url = 'https://argus-web-beta.vercel.app';
  const res = await fetch(`${url}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test_${Date.now()}@example.com`, password: 'Password123!' })
  });
  const cookie = res.headers.get('set-cookie');
  
  const analyzeRes = await fetch(`${url}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ asset: 'AVAX' })
  });
  const analyzeData = await analyzeRes.json();
  
  const pricingRes = await fetch(`${url}/api/pricing/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ asset: 'AVAX', consensus: analyzeData })
  });
  
  console.log('Pricing status:', pricingRes.status);
  console.log(await pricingRes.json());
}
run().catch(console.error);
