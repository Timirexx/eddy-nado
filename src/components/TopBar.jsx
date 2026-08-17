import { GroundingIcon } from './icons.jsx';

export default function TopBar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>
      <span className="grounding-pill">
        <GroundingIcon />
        Grounded in Nado docs + live account data
      </span>
    </header>
  );
}
