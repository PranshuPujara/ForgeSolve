import { useState, useMemo } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTags } from '../../hooks/useTags';

export const TagSelector = ({ platform, selectedTags, onChange }) => {
  const { tags, loading } = useTags(platform);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => tags.filter(t => t.toLowerCase().includes(search.toLowerCase())), [tags, search]);
  const LIMIT = 20;
  const visible = expanded ? filtered : filtered.slice(0, LIMIT);
  const toggle  = t => onChange(selectedTags.includes(t) ? selectedTags.filter(x=>x!==t) : [...selectedTags, t]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ position:'relative' }}>
        <input className="pp-input" type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search tags…" style={{ paddingLeft:32 }} />
        <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', display:'flex', alignItems:'center' }}>
          {loading ? <Loader2 size={14} strokeWidth={2} color="var(--t3)" className="anim-spin" /> : <Search size={14} strokeWidth={1.8} color="var(--t3)" />}
        </span>
      </div>

      {selectedTags.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, paddingBottom:8, borderBottom:'1px solid var(--b0)' }}>
          {selectedTags.map(t => (
            <button key={t} type="button" onClick={()=>toggle(t)} className="pp-tag on">
              {t} <X size={10} strokeWidth={2.5} style={{ opacity:.6 }} />
            </button>
          ))}
          <button type="button" onClick={()=>onChange([])}
            style={{ fontSize:11, fontFamily:'var(--mono)', background:'none', border:'none', color:'var(--t3)', cursor:'pointer', padding:'3px 6px', borderRadius:4 }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}
          >clear all</button>
        </div>
      )}

      {filtered.length === 0 && !loading
        ? <p style={{ fontSize:12, color:'var(--t3)', fontFamily:'var(--mono)' }}>No match for "{search}"</p>
        : <div style={{ display:'flex', flexWrap:'wrap', gap:5, maxHeight: expanded ? 210 : 130, overflowY:'auto', paddingRight:2 }}>
            {visible.map(t => (
              <button key={t} type="button" onClick={()=>toggle(t)} className={`pp-tag${selectedTags.includes(t)?' on':''}`}>{t}</button>
            ))}
          </div>
      }

      {filtered.length > LIMIT && (
        <button type="button" onClick={()=>setExpanded(v=>!v)}
          style={{ fontSize:11, fontFamily:'var(--mono)', background:'none', border:'none', color:'var(--t3)', cursor:'pointer', textAlign:'left', padding:0, display:'flex', alignItems:'center', gap:4 }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--primary)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}
        >{expanded ? <><ChevronUp size={12} strokeWidth={2} /> Show less</> : <><ChevronDown size={12} strokeWidth={2} /> +{filtered.length - LIMIT} more</>}</button>
      )}
      <p style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>OR logic — any match qualifies</p>
    </div>
  );
};
