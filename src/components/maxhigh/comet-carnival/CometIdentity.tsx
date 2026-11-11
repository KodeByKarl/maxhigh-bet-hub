import { Orbit } from "lucide-react";
import "./comet-carnival.css";

/** Compact title line above the reel chamber (replaces the old empty header area). Pure presentation. */
export function CometIdentity({ name }: { name: string }) {
  return (
    <div className="cc-identity" data-cc-identity>
      <Orbit size={15} aria-hidden="true" />
      <strong>{name}</strong>
      <small>Tumble wins</small>
    </div>
  );
}
