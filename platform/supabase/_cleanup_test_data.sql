-- Cleanse.ng — one-time test-data cleanup.
-- Wipes all bookings/payments/customers and all test cleaners EXCEPT Grace
-- (cleaner1@cleanse.ng), and resets Grace to a clean state. Keeps admin_users.
-- Safe to run once before going live. Deletes children before parents.

delete from job_assignments;
delete from payments;
delete from notifications;
delete from cleaner_share_cards;
delete from booking_events;
delete from booking_items;
delete from job_offers;
delete from bookings;
delete from customer_addresses;
delete from customers;
delete from webhook_events;
delete from quotes;

-- Remove every cleaner except the Grace test account.
delete from cleaners where coalesce(email, '') <> 'cleaner1@cleanse.ng';

-- Reset Grace to a clean, deployment-ready test cleaner.
update cleaners
set completed_jobs = 0,
    rating = null,
    completion_rate = null,
    cancellation_rate = null,
    acceptance_rate = null,
    availability = 'UNAVAILABLE',
    account_status = 'ACTIVE',
    verified = true,
    deployment_ready = true
where email = 'cleaner1@cleanse.ng';
