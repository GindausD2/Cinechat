export function secondsAgo(seconds: number) { return new Date(Date.now() - seconds * 1000); }
