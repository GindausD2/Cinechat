-- New accounts opt into public discovery and friend requests in settings.
-- Preserve every existing user's stored preferences.
ALTER TABLE "Profile" ALTER COLUMN "publicProfile" SET DEFAULT false;
ALTER TABLE "Profile" ALTER COLUMN "allowFriendRequests" SET DEFAULT false;
