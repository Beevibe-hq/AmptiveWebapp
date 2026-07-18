const readline = require('readline');

const API_BASE = 'https://amptive-staging.getamptive.com/api/v1';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('==============================================');
  console.log('        Testing updateProfile Name           ');
  console.log('==============================================\n');

  let token = '';

  const authChoice = await question('Do you want to authenticate using:\n1. Email & Password\n2. Existing Auth Token\nChoose (1 or 2): ');

  if (authChoice.trim() === '2') {
    token = await question('\nPaste your Auth Token: ');
    token = token.trim();
  } else {
    const email = await question('\nEnter your email: ');
    const password = await question('Enter your password: ');
    
    console.log('\nLogging in...');
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });
      
      const loginJson = await loginRes.json();
      if (!loginRes.ok) {
        console.error('Login failed:', loginJson.message || JSON.stringify(loginJson));
        rl.close();
        return;
      }
      token = (loginJson.data || loginJson).access_token;
      console.log('Logged in successfully!');
    } catch (e) {
      console.error('Login request failed:', e.message);
      rl.close();
      return;
    }
  }

  if (!token) {
    rl.close();
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const name = await question('\nEnter the new name you want to set: ');

  console.log('\nUpdating user profile name on backend...');
  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        name: name.trim()
      })
    });

    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Request failed:', e.message);
  }

  rl.close();
}

main();
