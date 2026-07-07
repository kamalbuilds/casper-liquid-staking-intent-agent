import { motesToCspr, truncateMiddle } from "@/lib/cspr";
import type { StakingRoute } from "@/lib/types";

export function RoutePreview({ route }: { route: StakingRoute }) {
  return (
    <div className="route-preview">
      <div className="route-preview-head">
        <span className="route-action">{route.action}</span>
        <span className="route-target mono" title={route.target}>
          {route.targetLabel}
        </span>
      </div>

      <div className="route-amount mono">{motesToCspr(route.amount)} CSPR</div>

      <p className="route-reason">{route.reason}</p>

      <div className="route-yield">
        <span className="illustrative-tag">Illustrative, not live-fetched</span>
        <span className="mono">{route.estimatedYield}</span>
      </div>

      {route.riskNotes.length > 0 ? (
        <ul className="route-notes">
          {route.riskNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {route.warnings.length > 0 ? (
        <div className="route-warnings">
          {route.warnings.map((warning) => (
            <p key={warning} className="route-warning">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <div className="route-target-full">
        <span className="field-hint">Target address</span>
        <span className="mono">{truncateMiddle(route.target, 10, 8)}</span>
      </div>
    </div>
  );
}
