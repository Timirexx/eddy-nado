export function EddyMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" stroke="var(--accent)" strokeWidth="1.4" />
      <path d="M16 6 A10 10 0 0 1 26 16" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 11 A5 5 0 0 1 21 16" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="var(--accent)" />
    </svg>
  );
}

export function EddyAvatar() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="var(--accent)" strokeWidth="1.2" />
      <path d="M8 3.5A4.5 4.5 0 0 1 12.5 8" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h12v7H5l-3 3V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function HistoryIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function WatchingIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path d="M3 8c1.5-3 4-4.5 5-4.5S12.5 5 13 8c-1.5 3-4 4.5-5 4.5S3.5 11 3 8z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2v2.2M8 11.8V14M2 8h2.2M11.8 8H14M4 4l1.5 1.5M10.5 10.5L12 12M12 4l-1.5 1.5M5.5 10.5L4 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function NewChatIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function GroundingIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5 14 4.5V8c0 4-3 6.5-6 6.5S2 12 2 8V4.5L8 1.5z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function DocsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M4 2h6l3 3v9H4V2z" stroke="currentColor" strokeWidth="1.1" />
      <path d="M6.5 7h4M6.5 9.5h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function WalletIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 5.3h9.7a1.8 1.8 0 0 1 1.8 1.8v3.6a1.8 1.8 0 0 1-1.8 1.8h-8a1.8 1.8 0 0 1-1.8-1.8V4.3a1.3 1.3 0 0 1 1.3-1.3h7.7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="10.8" cy="9" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M4.5 2.5h7v4a3.5 3.5 0 0 1-7 0v-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4.5 3.6H3a1.5 1.5 0 0 0 0 3h1.6M11.5 3.6H13a1.5 1.5 0 0 1 0 3h-1.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 10v2.2M5.8 13.5h4.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 2.2l1.5 3.9 3.9 1.5-3.9 1.5L8 13l-1.5-3.9L2.6 7.6l3.9-1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M3 4.5h10M6.4 4.5V3.2h3.2v1.3M4.4 4.5l.6 8.2h6l.6-8.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.8 7v3.4M9.2 7v3.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="2.4" y="3.4" width="11.2" height="9.2" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.9" cy="6.5" r="1" stroke="currentColor" strokeWidth="1" />
      <path d="M3.2 11 6 8.5l2.2 1.9 1.9-1.5 2.7 2.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function AttachIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <rect x="2.2" y="3.2" width="11.6" height="9.6" rx="1.8" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="6.6" r="1.1" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3 11.2 6.2 8.4l2.3 2 2-1.6 2.5 2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M2 8h11M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
