async function run() {
  const url = 'https://argus-web-beta.vercel.app';
  const res = await fetch(`${url}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `test_${Date.now()}@example.com`, password: 'Password123!' })
  });
  const cookie = res.headers.get('set-cookie');
  
  let me = await fetch(`${url}/api/auth/me`, { headers: { 'Cookie': cookie }});
  console.log('Before credits:', (await me.json()).user.creditsUsd);

  await fetch(`${url}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ asset: 'AVAX' })
  });

  me = await fetch(`${url}/api/auth/me`, { headers: { 'Cookie': cookie }});
  console.log('After credits:', (await me.json()).user.creditsUsd);
}
run().catch(console.error);
