import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, X, Tag } from 'lucide-react';
import { useTags } from '../../hooks/useTags';

export const TagSelector = ({ platform, selectedTags, onChange }) => {
  const { tags, loading } = useTags(platform);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [cursor, setCursor] = useState(-1);   // -1 = nothing highlighted
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  /* ── Fuzzy scoring ─────────────────────────────────────────────── */
  const scored = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tags.map(t => ({ tag: t, s: 0 }));

    return tags
      .map(t => {
        const lo = t.toLowerCase();
        if (lo === q) return { tag: t, s: 100 };
        if (lo.startsWith(q)) return { tag: t, s: 80 };
        if (lo.split(/[\s\-]+/).some(w => w.startsWith(q))) return { tag: t, s: 70 };
        if (lo.includes(q)) return { tag: t, s: 60 };
        // sequential fuzzy — every char in query appears in order
        let qi = 0;
        for (let i = 0; i < lo.length && qi < q.length; i++) {
          if (lo[i] === q[qi]) qi++;
        }
        if (qi === q.length) return { tag: t, s: 30 + Math.floor(20 * (q.length / lo.length)) };
        return { tag: t, s: 0 };
      })
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s);
  }, [tags, search]);

  const filtered = useMemo(() => scored.map(x => x.tag), [scored]);

  const LIMIT = 20;
  const visible = expanded ? filtered : filtered.slice(0, LIMIT);

  const toggle = useCallback(t =>
    onChange(selectedTags.includes(t) ? selectedTags.filter(x => x !== t) : [...selectedTags, t])
    , [selectedTags, onChange]);

  /* ── Reset cursor whenever filtered list changes ──────────────── */
  useEffect(() => { setCursor(-1); }, [search, platform]);

  /* ── Scroll highlighted item into view ────────────────────────── */
  useEffect(() => {
    if (cursor >= 0 && itemRefs.current[cursor]) {
      itemRefs.current[cursor].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [cursor]);

  /* ── Keyboard handler ─────────────────────────────────────────── */
  const handleKeyDown = useCallback(e => {
    const list = visible;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, list.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, -1));
      return;
    }
    if (e.key === 'Escape') {
      setSearch('');
      setCursor(-1);
      inputRef.current?.blur();
      return;
    }
    // ── THE FIX: Enter selects cursor item, or top fuzzy match ────
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = cursor >= 0 ? list[cursor] : list[0];
      if (target) {
        toggle(target);
        setSearch('');
        setCursor(-1);
        inputRef.current?.focus();
      }
      return;
    }
    // Backspace on empty input removes last selected tag
    if (e.key === 'Backspace' && !search && selectedTags.length > 0) {
      onChange(selectedTags.slice(0, -1));
    }
  }, [visible, cursor, search, toggle, selectedTags, onChange]);

  /* ── Highlight matched substring inside a tag label ──────────── */
  const Highlight = useCallback(({ text }) => {
    const q = search.toLowerCase().trim();
    if (!q) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark style={{
          background: 'var(--primary-bg)', color: 'var(--primary)',
          borderRadius: 3, padding: '0 1px', fontWeight: 800, fontStyle: 'normal',
        }}>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </span>
    );
  }, [search]);

  const hasResults = filtered.length > 0 || loading;
  const topMatch = filtered[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Search input ──────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className="pp-input"
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setExpanded(false); }}
          onKeyDown={handleKeyDown}
          placeholder="Search tags…"
          autoComplete="off"
          spellCheck="false"
          style={{ paddingLeft: 32, paddingRight: search ? 60 : 12 }}
        />

        {/* Left icon */}
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
          {loading
            ? <Loader2 size={14} strokeWidth={2} color="var(--t3)" className="anim-spin" />
            : <Search size={14} strokeWidth={1.8} color={search ? 'var(--primary)' : 'var(--t3)'} style={{ transition: 'color .15s' }} />
          }
        </span>

        {/* Right: live "↵ top-match" hint + clear button */}
        {search && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 5 }}>
            {topMatch && (
              <span style={{
                fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                padding: '2px 6px', borderRadius: 5,
                background: 'var(--primary-bg)', color: 'var(--primary)',
                border: '1px solid var(--primary)', whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                ↵ {topMatch.length > 14 ? topMatch.slice(0, 13) + '…' : topMatch}
              </span>
            )}
            <button type="button" onClick={() => { setSearch(''); setCursor(-1); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', padding: 2 }}>
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        )}
      </div>

      {/* ── Match count + keyboard hint while typing ──────────────── */}
      {search.trim() && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>
          <span>
            {filtered.length > 0
              ? <><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{filtered.length}</span> match{filtered.length !== 1 ? 'es' : ''}</>
              : <span style={{ color: 'var(--orange)' }}>no matches</span>
            }
          </span>
          {filtered.length > 0 && (
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>↵ selects · ↑↓ navigate</span>
          )}
        </div>
      )}

      {/* ── Selected tag pills ────────────────────────────────────── */}
      {selectedTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingBottom: 8, borderBottom: '1px solid var(--b0)' }}>
          {selectedTags.map(t => (
            <button key={t} type="button" onClick={() => toggle(t)} className="pp-tag on"
              style={{ animation: 'tagPop .18s cubic-bezier(.16,1,.3,1) both' }}>
              {t} <X size={10} strokeWidth={2.5} style={{ opacity: .6 }} />
            </button>
          ))}
          <button type="button" onClick={() => onChange([])}
            style={{ fontSize: 11, fontFamily: 'var(--mono)', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', padding: '3px 6px', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
          >clear all</button>
        </div>
      )}

      {/* ── Tag grid ──────────────────────────────────────────────── */}
      {!hasResults && !loading
        ? <p style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag size={12} strokeWidth={1.8} /> No match for "{search}"
        </p>
        : (
          <div
            ref={listRef}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: expanded ? 210 : 130, overflowY: 'auto', paddingRight: 2 }}
          >
            {visible.map((t, i) => {
              const isActive = selectedTags.includes(t);
              const isCursor = i === cursor;
              const isTopHit = i === 0 && !!search.trim();
              return (
                <button
                  key={t}
                  ref={el => itemRefs.current[i] = el}
                  type="button"
                  onClick={() => { toggle(t); setSearch(''); setCursor(-1); }}
                  onMouseEnter={() => setCursor(i)}
                  onMouseLeave={() => setCursor(-1)}
                  className={`pp-tag${isActive ? ' on' : ''}`}
                  style={{
                    outline: isCursor && !isActive ? '2px solid var(--primary)' : 'none',
                    outlineOffset: 1,
                    position: 'relative',
                    transition: 'outline .1s',
                  }}
                >
                  <Highlight text={t} />
                  {/* ↵ badge floating above the top fuzzy match */}
                  {isTopHit && !isActive && (
                    <span style={{
                      position: 'absolute', top: -6, right: -4,
                      fontSize: 8, fontWeight: 900, fontFamily: 'var(--mono)',
                      background: isCursor ? 'var(--primary)' : 'var(--bg-el)',
                      color: isCursor ? '#000' : 'var(--t3)',
                      border: `1px solid ${isCursor ? 'var(--primary)' : 'var(--b2)'}`,
                      borderRadius: 4, padding: '0 3px', lineHeight: '14px',
                      transition: 'all .1s', pointerEvents: 'none',
                    }}>↵</span>
                  )}
                </button>
              );
            })}
          </div>
        )
      }

      {/* ── Show more / less ──────────────────────────────────────── */}
      {filtered.length > LIMIT && (
        <button type="button" onClick={() => setExpanded(v => !v)}
          style={{ fontSize: 11, fontFamily: 'var(--mono)', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
        >
          {expanded
            ? <><ChevronUp size={12} strokeWidth={2} /> Show less</>
            : <><ChevronDown size={12} strokeWidth={2} /> +{filtered.length - LIMIT} more</>
          }
        </button>
      )}

      <p style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
        OR logic — any match qualifies
      </p>

      <style>{`
        @keyframes tagPop {
          from { opacity: 0; transform: scale(.75); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
