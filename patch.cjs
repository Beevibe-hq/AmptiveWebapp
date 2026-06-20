const fs = require('fs');
const path = './src/pages/Homepage.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Add hasEarlyBird to EventType
content = content.replace(
  '  media: MediaSource;\n}',
  '  media: MediaSource;\n  hasEarlyBird?: boolean;\n}'
);

// 2. Add hasEarlyBird calculation and include it in transformedEvents mapping
const targetStr = `          return {
            id: event.event_id,
            title: event.title,
            location: event.venue?.name || event.location?.venue || event.location?.city || 'Online',
            country: event.venue?.city || event.location?.city || 'Nigeria',
            ticket_status: isSoldOut ? 'Sold Out' : 'On Sale',
            price: finalPrice,
            date: event.scheduled_for ? new Date(event.scheduled_for).toISOString() : '',
            media: {
              type: 'image' as const,
              src: event.thumbnail_url,
              alt: event.title
            }
          };`;

const replacementStr = `          let hasEarlyBird = false;
          if (tickets.length > 0) {
            hasEarlyBird = tickets.some((t: any) => {
              if (!t.has_early_bird && !t.early_bird_discount_percentage) return false;
              const earlyBirdMax = t.early_bird_max_count ?? t.early_bird_units ?? t.early_bird_quantity ?? t.earlyBirdUnits;
              const earlyBirdSold = t.early_bird_sold ?? 0;
              if (earlyBirdMax !== undefined && earlyBirdMax !== null && earlyBirdSold >= earlyBirdMax) {
                return false;
              }
              const isSoldOut = (t.is_active === false) ||
                (t.quantity_remaining !== undefined && t.quantity_remaining !== null && t.quantity_remaining <= 0) ||
                (t.quantity !== undefined && t.quantity !== null && t.quantity <= 0) ||
                (t.quantity_total !== undefined && t.quantity_total !== null && t.quantity_sold !== undefined && t.quantity_sold !== null && t.quantity_sold >= t.quantity_total) ||
                (t.quantity_total !== undefined && t.quantity_total !== null && t.quantity_total <= 0);
              if (isSoldOut) return false;
              
              return true;
            });
          }

          return {
            id: event.event_id,
            title: event.title,
            location: event.venue?.name || event.location?.venue || event.location?.city || 'Online',
            country: event.venue?.city || event.location?.city || 'Nigeria',
            ticket_status: isSoldOut ? 'Sold Out' : 'On Sale',
            price: finalPrice,
            date: event.scheduled_for ? new Date(event.scheduled_for).toISOString() : '',
            media: {
              type: 'image' as const,
              src: event.thumbnail_url,
              alt: event.title
            },
            hasEarlyBird
          };`;

content = content.replace(targetStr, replacementStr);

// 3. Add hasEarlyBird to <EventCard> calls in Homepage.tsx
// There are multiple EventCard calls in Homepage.tsx, we replace media={event.media} with media={event.media} hasEarlyBird={event.hasEarlyBird}
content = content.replace(/media=\{event\.media\}/g, 'media={event.media}\n                          hasEarlyBird={event.hasEarlyBird}');

fs.writeFileSync(path, content);
console.log('Successfully patched Homepage.tsx');
