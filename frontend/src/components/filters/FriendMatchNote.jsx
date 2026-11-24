import { Info } from 'lucide-react';

/** One quiet line above the problem when the friend filter had to be loosened, a friend couldn't be read, or "catch-up" can't tell what you solved.
    Renders nothing in the normal case. `meta` is the `meta` object from /pick. */
export const FriendMatchNote = ({ meta }) => {
  const f = meta && meta.friend;
  if (!f) return null;
  const lines = [];
  if (f.message) lines.push(f.message);
  if (f.needsHandle) lines.push('I don’t know which problems you solved (no handle connected), so this shows everything your friends solved.');
  if (f.failed && f.failed.length) lines.push(`Couldn’t read: ${f.failed.join(', ')}.`);
  if (!lines.length) return null;
  return (
    <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '9px 12px', marginBottom: 12, borderRadius: 9, background: 'var(--bg-el)', border: '1px solid var(--b1)', fontSize: 12, lineHeight: 1.5, color: 'var(--t2)' }}>
      <Info size={14} strokeWidth={1.5} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
      <span>{lines.join(' ')}</span>
    </div>
  );
};
