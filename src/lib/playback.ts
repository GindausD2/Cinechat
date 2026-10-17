export type PlaybackState = { playing: boolean; position: number; playbackUpdatedAt: Date | string; playbackVersion: number };
export function currentPosition(state: PlaybackState, duration: number, now = Date.now()) {
  const elapsed = state.playing ? Math.max(0, (now - new Date(state.playbackUpdatedAt).getTime()) / 1000) : 0;
  return Math.max(0, Math.min(duration, state.position + elapsed));
}
export function playbackSnapshot(state: PlaybackState, duration: number, now = Date.now()) {
  return { playing: state.playing && currentPosition(state, duration, now) < duration, position: currentPosition(state, duration, now), version: state.playbackVersion, serverTime: now, duration };
}
export function driftCorrection(actual: number, expected: number) {
  const drift = expected - actual;
  if (Math.abs(drift) > 1.5) return { seek: expected, rate: 1 };
  return { seek: null, rate: Math.abs(drift) > .25 ? drift > 0 ? 1.03 : .97 : 1 };
}
