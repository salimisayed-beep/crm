export default function StatusBadge({ status }) {
  if (!status) return <span className="badge badge-closed">—</span>;

  const s = status.trim().toLowerCase();

  let cls = 'badge-closed';
  let icon = 'fas fa-circle-xmark';
  let label = status.trim();

  if (s.includes('sale') || s === 'sale converted') {
    cls = 'badge-sale';
    icon = 'fas fa-circle-check';
    label = 'Sale Converted';
  } else if (
    s.includes('pickup') ||
    s.includes('pick up') ||
    s.includes('pickup arrange') ||
    s.includes('pickup scheduled') ||
    s.includes('pickup done')
  ) {
    cls = 'badge-pickup';
    icon = 'fas fa-box';
    label = 'Pickup';
  } else if (
    s.includes('awaiting') ||
    s.includes('awaitig') ||
    s.includes('awaiting for') ||
    s.includes('awaiting response')
  ) {
    cls = 'badge-awaiting';
    icon = 'fas fa-clock';
    label = 'Awaiting';
  } else if (
    s.includes('pitch in-progress') ||
    s.includes('pitch in progress') ||
    s === 'pitch i progress'
  ) {
    cls = 'badge-progress';
    icon = 'fas fa-bolt';
    label = 'Pitch In-Progress';
  } else if (
    s.includes('in progress') ||
    s.includes('in process') ||
    s.includes('still in process') ||
    s.includes('in fedex ip') ||
    s === 'tracking status' ||
    s.includes('tracking')
  ) {
    cls = 'badge-progress';
    icon = 'fas fa-spinner';
    label = 'In Progress';
  } else if (
    s.includes('closed') ||
    s.includes('close') ||
    s.includes('no response') ||
    s.includes('cloes')
  ) {
    cls = 'badge-closed';
    icon = 'fas fa-circle-xmark';
    label = 'Closed';
  }

  return (
    <span className={`badge ${cls}`}>
      <i className={icon} style={{ fontSize: 9 }} />
      {label}
    </span>
  );
}
