async function run() {
  const loginRes = await fetch('https://amptive-staging.getamptive.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@getamptive.com', password: 'password123' })
  }).then(r => r.json());
  
  const token = loginRes.data?.access_token || loginRes.access_token;
  if (!token) {
    console.log("Failed to login", loginRes);
    return;
  }

  // test 1: name
  const r1 = await fetch('https://amptive-staging.getamptive.com/api/v1/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ name: 'Test User' })
  }).then(r => r.json());
  console.log("PATCH name:", r1);

  // test 2: accept_tips
  const r3 = await fetch('https://amptive-staging.getamptive.com/api/v1/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ accept_tips: true })
  }).then(r => r.json());
  console.log("PATCH accept_tips:", r3);

  // test 4: support_message
  const r4 = await fetch('https://amptive-staging.getamptive.com/api/v1/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ support_message: 'Hi' })
  }).then(r => r.json());
  console.log("PATCH support_message:", r4);
}
run();
