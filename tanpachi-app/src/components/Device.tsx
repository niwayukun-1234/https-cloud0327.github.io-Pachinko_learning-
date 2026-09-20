import type { ReactNode } from "react";

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <span className="notch" />
      <span className="status-icons" aria-hidden>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.5" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.5" />
          <rect x="10" y="3" width="3" height="9" rx="0.5" />
          <rect x="15" y="0" width="3" height="12" rx="0.5" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 3.2c2.1 0 4 .8 5.5 2.2l1.4-1.5A9.9 9.9 0 0 0 8 1C5.3 1 2.8 2.1 1.1 3.9l1.4 1.5A7.6 7.6 0 0 1 8 3.2zm0 3.3c1.2 0 2.3.5 3.1 1.3l1.4-1.5A6.3 6.3 0 0 0 8 4.5c-1.7 0-3.3.7-4.5 1.8l1.4 1.5A4.4 4.4 0 0 1 8 6.5zm0 3.3c.4 0 .8.2 1.1.5L8 11.5l-1.1-1.2c.3-.3.7-.5 1.1-.5z" />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor">
          <rect x="0.5" y="0.5" width="22" height="11" rx="3" />
          <rect x="2" y="2" width="19" height="8" rx="2" fill="currentColor" stroke="none" />
          <path d="M24 4v4" strokeWidth="1.5" />
        </svg>
      </span>
    </div>
  );
}

export function Device({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  return (
    <div className="device-wrap">
      <div className="device">
        <StatusBar />
        <div className="screen">{children}</div>
        {overlay}
      </div>
    </div>
  );
}
