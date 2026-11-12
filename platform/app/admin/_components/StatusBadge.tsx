import type { HumanStatus } from "../format";

export default function StatusBadge({ status }: { status: HumanStatus }) {
  return <span className={`ops-status tone-${status.tone}`}>{status.label}</span>;
}

