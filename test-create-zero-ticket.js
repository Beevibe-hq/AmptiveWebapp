const API_BASE = 'https://amptive-staging.getamptive.com/api/v1';

async function run() {
  console.log('Logging in to staging...');
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jachilonu195@gmail.com',
        password: 'TempPassword123!'
      })
    });
    
    const loginJson = await loginRes.json();
    const token = loginJson.data?.access_token || loginJson.access_token;
    
    if (!token) {
      console.error('Failed to log in:', JSON.stringify(loginJson, null, 2));
      return;
    }
    
    console.log('Login success! Creating event...');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 1. Create a draft event
    const eventRes = await fetch(`${API_BASE}/events/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: `Zero Ticket Test Event ${Date.now()}`,
        show_type: 'paid',
        price: 1000
      })
    });
    const eventJson = await eventRes.json();
    const event = eventJson.data || eventJson;
    const eventId = event.event_id || event.id;
    
    if (!eventId) {
      console.error('Failed to create event. Response:', JSON.stringify(eventJson, null, 2));
      return;
    }
    
    console.log(`Event created: ${eventId}. Creating ticket with 0 quantity...`);
    
    // 2. Create a ticket with 0 quantity
    const ticketRes = await fetch(`${API_BASE}/tickets/events/${eventId}/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        label: 'Zero Stock Ticket',
        price: 1000,
        currency: 'NGN',
        quantity_total: 0,
        is_physical: false
      })
    });
    const ticketJson = await ticketRes.json();
    console.log('Ticket creation response:', JSON.stringify(ticketJson, null, 2));
    
    // 3. Fetch tickets list
    console.log('Fetching tickets list for event...');
    const listRes = await fetch(`${API_BASE}/tickets/events/${eventId}/list`);
    const listJson = await listRes.json();
    const tickets = listJson.data?.tickets || listJson.tickets || [];
    
    console.log('Returned tickets list:');
    console.log(JSON.stringify(tickets, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
