import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchLists, fetchList, createList, updateList, deleteList } from '../api/client';
import type { ListSummary, ListItem } from '../types';

const CATEGORY_SUGGESTIONS = ['Music', 'Movies', 'Animals', 'Sports', 'Food', 'Geography'];

interface EditorRow {
  value: string;
  hint: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeBlankRows(count: number): EditorRow[] {
  return Array.from({ length: count }, () => ({ value: '', hint: '' }));
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared header
// ──────────────────────────────────────────────────────────────────────────────

function AdminHeader() {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/" style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20,
          letterSpacing: 4, color: 'var(--lime)', textTransform: 'uppercase', textDecoration: 'none',
        }}>
          Deep Cut
        </Link>
        <span style={{ flex: 1 }} />
        <Link to="/" style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
          letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)',
          textDecoration: 'none', padding: '5px 12px', border: '1px solid var(--border-2)',
          borderRadius: 4,
        }}>Setup</Link>
        <span style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
          letterSpacing: 2, textTransform: 'uppercase', color: 'var(--lime)',
          padding: '5px 12px', border: '1px solid var(--lime)', borderRadius: 4,
        }}>Admin</span>
      </div>
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// List view
// ──────────────────────────────────────────────────────────────────────────────

interface ListViewProps {
  lists: ListSummary[];
  onNew: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string) => void;
  deletingSlug: string | null;
}

function ListView({ lists, onNew, onEdit, onDelete, deletingSlug }: ListViewProps) {
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const isMobile = useWindowWidth() < 640;

  function handleConfirmDelete() {
    if (confirmSlug) {
      onDelete(confirmSlug);
      setConfirmSlug(null);
    }
  }

  const smBtnStyle: React.CSSProperties = {
    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
    letterSpacing: 1, textTransform: 'uppercase',
    padding: '6px 12px', borderRadius: 3, cursor: 'pointer',
    background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
  };

  const smDangerBtnStyle: React.CSSProperties = {
    ...smBtnStyle,
    background: 'var(--red-dim)', border: '1px solid rgba(255,64,64,0.3)', color: 'var(--red)',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminHeader />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '28px 16px' : '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
          <div>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 6 }}>
              Admin
            </p>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: isMobile ? 26 : 32, letterSpacing: 1, color: 'var(--text)', margin: 0 }}>
              Lists
            </h2>
          </div>
          <button
            onClick={onNew}
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
              letterSpacing: 2, textTransform: 'uppercase',
              background: 'var(--lime)', color: '#000',
              border: 'none', borderRadius: 4, padding: '10px 18px', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            + New List
          </button>
        </div>

        {lists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, marginBottom: 8 }}>No lists yet.</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Click "New List" to create your first one.</p>
          </div>
        ) : isMobile ? (
          // ── Mobile: card list ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lists.map((list) => (
              <div key={list.slug} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '14px 16px',
              }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
                    {list.title}
                  </span>
                  {list.category && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-3)' }}>{list.category}</span>
                  )}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', marginBottom: 12 }}>
                  {list.slug}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onEdit(list.slug)} style={{ ...smBtnStyle, flex: 1 }}>Edit</button>
                  <button
                    onClick={() => setConfirmSlug(list.slug)}
                    disabled={deletingSlug === list.slug}
                    style={{ ...smDangerBtnStyle, flex: 1, opacity: deletingSlug === list.slug ? 0.5 : 1 }}
                  >
                    {deletingSlug === list.slug ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ── Desktop: table ──
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>Title</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>Slug</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>Category</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)', width: 80 }}>Items</th>
                  <th style={{ padding: '12px 16px', width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {lists.map((list) => (
                  <tr key={list.slug} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 15 }}>{list.title}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{list.slug}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: 13 }}>{list.category}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
                      {'itemCount' in list ? String((list as ListSummary & { itemCount?: number }).itemCount ?? '—') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => onEdit(list.slug)} style={smBtnStyle}>Edit</button>
                        <button
                          onClick={() => setConfirmSlug(list.slug)}
                          disabled={deletingSlug === list.slug}
                          style={{ ...smDangerBtnStyle, opacity: deletingSlug === list.slug ? 0.5 : 1 }}
                        >
                          {deletingSlug === list.slug ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      {confirmSlug && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, width: '100%', maxWidth: 380, padding: 24,
          }}>
            <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 10 }}>
              Delete list?
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>
              This will permanently delete{' '}
              <span style={{ color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{confirmSlug}</span>.
              {' '}This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmSlug(null)}
                style={{
                  flex: 1, padding: '11px 0',
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: '11px 0',
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  background: 'var(--red)', border: 'none', color: '#fff',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// List editor
// ──────────────────────────────────────────────────────────────────────────────

interface ListEditorProps {
  editingSlug: string | null;
  onSaved: () => void;
  onCancel: () => void;
}

function parseCSV(text: string): EditorRow[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [first, ...rest] = line.split(',');
      const isRankCol = /^\d+$/.test(first.trim());
      if (isRankCol && rest.length > 0) {
        const [value, ...hintParts] = rest;
        return { value: value.trim(), hint: hintParts.join(',').trim() };
      }
      return { value: first.trim(), hint: rest.join(',').trim() };
    });
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border-2)',
  borderRadius: 4, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
  fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700,
  fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)',
  marginBottom: 6,
};

function ListEditor({ editingSlug, onSaved, onCancel }: ListEditorProps) {
  const isNew = editingSlug === null;
  const isMobile = useWindowWidth() < 640;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<EditorRow[]>(makeBlankRows(10));
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvMode, setCsvMode] = useState<'replace' | 'append'>('replace');

  useEffect(() => {
    if (isNew) return;
    fetchList(editingSlug!)
      .then((list) => {
        setTitle(list.title);
        setSlug(list.slug);
        setCategory(list.category);
        setDescription(list.description);
        const itemRows: EditorRow[] = list.items
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((item) => ({ value: item.value, hint: item.hint ?? '' }));
        const padding = Math.max(0, 10 - itemRows.length);
        setRows([...itemRows, ...makeBlankRows(padding)]);
        setSlugManuallyEdited(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [editingSlug, isNew]);

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value);
      if (!slugManuallyEdited) setSlug(slugify(value));
    },
    [slugManuallyEdited]
  );

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugManuallyEdited(true);
  }

  function handleRowChange(index: number, field: keyof EditorRow, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleAddRow() {
    setRows((prev) => [...prev, { value: '', hint: '' }]);
  }

  function handleDeleteRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImportCSV() {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) return;
    setRows((prev) => csvMode === 'replace' ? parsed : [...prev, ...parsed]);
    setCsvText('');
    setShowCsvModal(false);
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!slug.trim()) { setError('Slug is required.'); return; }
    if (!category.trim()) { setError('Category is required.'); return; }
    if (!description.trim()) { setError('Description is required.'); return; }

    const items: ListItem[] = rows
      .map((row, i) => ({ rank: i + 1, value: row.value.trim(), hint: row.hint.trim() }))
      .filter((item) => item.value !== '');

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      items,
    };

    setSaving(true);
    try {
      if (isNew) {
        await createList(payload);
      } else {
        await updateList(editingSlug!, payload);
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const actionButtons = (
    <div style={{ display: 'flex', gap: 10 }}>
      <button
        onClick={onCancel}
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
          letterSpacing: 2, textTransform: 'uppercase',
          padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
          background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
        }}
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
          letterSpacing: 2, textTransform: 'uppercase',
          padding: '10px 20px', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
          background: 'var(--lime)', border: 'none', color: '#000',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, letterSpacing: 1, color: 'var(--text-2)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminHeader />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '28px 16px' : '40px 24px' }}>
        {/* Editor header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          gap: 16, marginBottom: 32,
        }}>
          <div>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 6 }}>
              {isNew ? 'New List' : 'Editing'}
            </p>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: isMobile ? 26 : 32, letterSpacing: 1, color: 'var(--text)', margin: 0 }}>
              {isNew ? 'Create List' : editingSlug}
            </h2>
          </div>
          {!isMobile && actionButtons}
        </div>

        {error && (
          <div style={{
            marginBottom: 24, padding: '12px 16px',
            background: 'var(--red-dim)', border: '1px solid rgba(255,64,64,0.3)',
            borderRadius: 6, color: 'var(--red)', fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Metadata fields */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 16, marginBottom: 32,
        }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Top 100 Beatles Songs"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="top-100-beatles-songs"
              style={{ ...inputStyle, fontFamily: "'DM Mono', monospace" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <input
              type="text"
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Music"
              style={inputStyle}
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown on the setup screen"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Items table */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>
              Items
            </span>
            <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-3)' }}>
              {rows.filter((r) => r.value.trim()).length} non-empty
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCsvModal(true)}
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
                letterSpacing: 1, textTransform: 'uppercase',
                padding: '7px 12px', borderRadius: 3, cursor: 'pointer',
                background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)',
              }}
            >
              Import CSV
            </button>
            <button
              onClick={handleAddRow}
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
                letterSpacing: 1, textTransform: 'uppercase',
                padding: '7px 12px', borderRadius: 3, cursor: 'pointer',
                background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)',
              }}
            >
              + Row
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: isMobile ? 280 : undefined }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 10px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)', width: 44 }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 8px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>Value</th>
                {!isMobile && <th style={{ textAlign: 'left', padding: '10px 8px', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>Hint</th>}
                <th style={{ padding: '10px 8px', width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 10px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: 12, textAlign: 'center' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => handleRowChange(i, 'value', e.target.value)}
                      placeholder={`Item ${i + 1}`}
                      style={{
                        width: '100%', background: 'transparent', border: '1px solid transparent',
                        borderRadius: 3, padding: '6px 8px', color: 'var(--text)', fontSize: 14,
                        fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  {!isMobile && (
                    <td style={{ padding: '4px 6px' }}>
                      <input
                        type="text"
                        value={row.hint}
                        onChange={(e) => handleRowChange(i, 'hint', e.target.value)}
                        placeholder="Optional hint"
                        style={{
                          width: '100%', background: 'transparent', border: '1px solid transparent',
                          borderRadius: 3, padding: '6px 8px', color: 'var(--text-2)', fontSize: 14,
                          fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </td>
                  )}
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteRow(i)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-3)',
                        cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
                      }}
                      aria-label={`Remove row ${i + 1}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleAddRow}
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
              letterSpacing: 1, textTransform: 'uppercase',
              padding: '7px 12px', borderRadius: 3, cursor: 'pointer',
              background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)',
            }}
          >
            + Add Row
          </button>
        </div>

        {/* CSV import modal */}
        {showCsvModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, width: '100%', maxWidth: 520, padding: isMobile ? 20 : 28,
            }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>
                Import CSV
              </h3>
              <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                One item per line:{' '}
                <code style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text)' }}>value, hint</code>
                {' '}or{' '}
                <code style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text)' }}>rank, value, hint</code>.
              </p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"Blinding Lights, The Weeknd\nShape of You, Ed Sheeran"}
                rows={isMobile ? 6 : 10}
                style={{
                  width: '100%', background: 'var(--bg)', border: '1px solid var(--border-2)',
                  borderRadius: 4, padding: '10px 14px', color: 'var(--text)',
                  fontFamily: "'DM Mono', monospace", fontSize: 13,
                  outline: 'none', resize: 'vertical', marginBottom: 16,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)' }}>Mode</span>
                {(['replace', 'append'] as const).map((m) => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="csvMode"
                      value={m}
                      checked={csvMode === m}
                      onChange={() => setCsvMode(m)}
                      style={{ accentColor: 'var(--lime)' }}
                    />
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 14, color: 'var(--text)', textTransform: 'capitalize' }}>{m}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowCsvModal(false); setCsvText(''); }}
                  style={{
                    flex: 1, padding: '11px 0',
                    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                    letterSpacing: 2, textTransform: 'uppercase',
                    background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
                    borderRadius: 4, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={!csvText.trim()}
                  style={{
                    flex: 1, padding: '11px 0',
                    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                    letterSpacing: 2, textTransform: 'uppercase',
                    background: 'var(--lime)', border: 'none', color: '#000',
                    borderRadius: 4, cursor: csvText.trim() ? 'pointer' : 'not-allowed',
                    opacity: csvText.trim() ? 1 : 0.4,
                  }}
                >
                  Import {csvText.trim() ? `(${parseCSV(csvText).length})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
            Ranks are assigned automatically (1 = first non-empty row).
          </p>
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  padding: '14px', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'var(--lime)', border: 'none', color: '#000',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onCancel}
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  padding: '12px', borderRadius: 4, cursor: 'pointer',
                  background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onCancel}
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  padding: '10px 24px', borderRadius: 4, cursor: 'pointer',
                  background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  padding: '10px 24px', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'var(--lime)', border: 'none', color: '#000',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AdminPage — top-level view switcher
// ──────────────────────────────────────────────────────────────────────────────

type View =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'edit'; slug: string };

export default function AdminPage() {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const loadLists = useCallback(() => {
    setLoadingLists(true);
    setListError(null);
    fetchLists()
      .then(setLists)
      .catch((err) => setListError(err.message))
      .finally(() => setLoadingLists(false));
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  async function handleDelete(slug: string) {
    setDeletingSlug(slug);
    try {
      await deleteList(slug);
      setLists((prev) => prev.filter((l) => l.slug !== slug));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete list');
    } finally {
      setDeletingSlug(null);
    }
  }

  function handleSaved() {
    loadLists();
    setView({ kind: 'list' });
  }

  if (view.kind !== 'list') {
    return (
      <ListEditor
        editingSlug={view.kind === 'edit' ? view.slug : null}
        onSaved={handleSaved}
        onCancel={() => setView({ kind: 'list' })}
      />
    );
  }

  if (loadingLists) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, letterSpacing: 1, color: 'var(--text-2)' }}>Loading...</p>
      </div>
    );
  }

  if (listError) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', background: 'var(--red-dim)', border: '1px solid rgba(255,64,64,0.3)', borderRadius: 8, padding: 40, maxWidth: 400, width: '100%' }}>
          <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--red)', marginBottom: 8 }}>
            Failed to load lists
          </p>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>{listError}</p>
          <button
            onClick={loadLists}
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
              letterSpacing: 2, textTransform: 'uppercase',
              padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
              background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ListView
      lists={lists}
      onNew={() => setView({ kind: 'new' })}
      onEdit={(slug) => setView({ kind: 'edit', slug })}
      onDelete={handleDelete}
      deletingSlug={deletingSlug}
    />
  );
}
