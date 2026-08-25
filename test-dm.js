const http = require('http');

async function run() {
  const res1 = await fetch('http://localhost:3000/api/auth/dev-fill?id=agbaje');
  const cookie = res1.headers.get('set-cookie');
  
  const res2 = await fetch('http://localhost:3000/api/messages/dms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      'Origin': 'http://localhost:3000',
      'Host': 'localhost:3000'
    },
    body: JSON.stringify({ toId: 'okikiola', text: 'Hello' })
  });
  const body = await res2.text();
  console.log('Status:', res2.status);
  console.log('Body:', body);
}

run();
