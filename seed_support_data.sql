-- Mock data for support activity feed
-- Make sure you have run the migration to add sender_name and sender_email first!

-- Clear existing mock data if needed
-- DELETE FROM support_payments WHERE sender_name IN ('John Doe', 'Michelle Boyce', 'Patrick Ryan', 'Sarah Jenkins');

INSERT INTO support_payments (
  receiver_id,
  amount,
  sender_name,
  sender_email,
  message,
  status,
  created_at
) VALUES 
(
  (SELECT user_id FROM profiles LIMIT 1), -- Assign to the first profile found
  5000.00,
  'Michelle Boyce',
  'michelle.b@gmail.com',
  'I love your content! Keep up the amazing work with the new educator series.',
  'completed',
  NOW() - INTERVAL '30 seconds'
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  10000.00,
  'Patrick Ryan',
  'p.ryan@outlook.com',
  'Best wishes on your journey. Gan dabht ar bith!',
  'completed',
  NOW() - INTERVAL '2 days'
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  2500.00,
  'John Smith',
  'jsmith.mobbin@gmail.com',
  NULL, -- No message
  'completed',
  NOW() - INTERVAL '30 minutes'
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  15000.00,
  'Sarah Jenkins',
  'sarah.j@techcorp.io',
  'Thanks for the help with the integration last week!',
  'completed',
  NOW() - INTERVAL '5 hours'
);
