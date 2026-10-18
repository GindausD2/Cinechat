"use client";
import { useState, type CSSProperties } from "react";
import { THEATER_REACTIONS } from "@/lib/reactions";

export function TheaterReactions({ reactions, connected, onReaction }: {
  reactions: { id: string; emoji: string }[];
  connected: boolean;
  onReaction: (emoji: string) => void;
}) {
  const [hidden, setHidden] = useState(false);
  return <div className="theater-reactions">
    {!hidden && <div className="live-reactions" role="log" aria-live="polite" aria-atomic="false" aria-relevant="additions" aria-label="Live cinema reactions">
      {reactions.slice(-7).map((reaction, index) => <span
        className="floating-reaction" key={reaction.id}
        style={{ "--reaction-lane": index % 7 } as CSSProperties}
      >{reaction.emoji}</span>)}
    </div>}
    <button className="reaction-visibility" type="button" aria-pressed={hidden} onClick={() => setHidden(!hidden)}>{hidden ? "Show reactions" : "Hide reactions"}</button>
    <div className="reaction-bar" role="group" aria-label="Cinema reactions">
      {THEATER_REACTIONS.map(emoji => <button key={emoji} type="button"
        aria-label={`React ${emoji}`} onClick={() => onReaction(emoji)} disabled={!connected}
      >{emoji}</button>)}
    </div>
  </div>;
}
