-- Drop the over-restrictive unique constraint that only allows one provider per channel
ALTER TABLE notification_providers DROP CONSTRAINT IF EXISTS notification_providers_channel_key;