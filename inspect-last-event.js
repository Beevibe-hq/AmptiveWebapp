const API_BASE = 'https://amptive-staging.getamptive.com/api/v1';

async function run() {
  console.log('Fetching most recent events from staging...');
  try {
    const eventsRes = await fetch(`${API_BASE}/events/?page_size=10`);
    const eventsJson = await eventsRes.json();
    const events = eventsJson.data?.events || eventsJson.events || [];
    
    for (const event of events) {
      const eventId = event.event_id || event.id;
      const ticketsRes = await fetch(`${API_BASE}/tickets/events/${eventId}/list`);
      const ticketsJson = await ticketsRes.json();
      const tickets = ticketsJson.data?.tickets || ticketsJson.tickets || [];
      
      console.log(`\nEvent: "${event.title}" (${eventId}) - Status: ${event.status}`);
      tickets.forEach(t => {
        console.log(`  - Ticket: "${t.label}" (${t.id})`);
        console.log(`    is_active: ${t.is_active} (type: ${typeof t.is_active})`);
        console.log(`    quantity: ${t.quantity} (type: ${typeof t.quantity})`);
        console.log(`    quantity_total: ${t.quantity_total} (type: ${typeof t.quantity_total})`);
        console.log(`    quantity_sold: ${t.quantity_sold} (type: ${typeof t.quantity_sold})`);
        console.log(`    quantity_remaining: ${t.quantity_remaining} (type: ${typeof t.quantity_remaining})`);
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
