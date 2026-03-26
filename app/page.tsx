'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ListSummary, GameState } from '@/types';

const CATEGORY_ICONS: Record<string, string> = {
  Music: '♪', Movies: '▶', Animals: '◈', Sports: '◉',
  Food: '◆', Geography: '◎', Default: '◇',
};

const TEAM_COLORS = ['#FF5555', '#5599FF', '#44DD77', '#FFCC33', '#AA77FF', '#FF77CC'];

function useWindowWidth() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setWidth(window.innerWidth);
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function SetupPage() {
  const router = useRouter();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<ListSummary | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [teams, setTeams] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState('');
  const [guessesPerTeam, setGuessesPerTeam] = useState(5);
  const teamInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/lists')
      .then((r) => r.json())
      .then(setLists)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function addTeam() {
    const name = teamInput.trim();
    if (!name || teams.includes(name)) { setTeamInput(''); return; }
    setTeams((prev) => [...prev, name]);
    setTeamInput('');
    teamInputRef.current?.focus();
  }

  function startGame() {
    if (!selectedList || teams.length < 2) return;
    const state: GameState = { slug: selectedList.slug, teamNames: teams, guessesPerTeam };
    sessionStorage.setItem('gameState', JSON.stringify(state));
    router.push('/game');
  }

  const categories = ['All', ...Array.from(new Set(lists.map((l) => l.category))).sort()];
  const visibleLists = activeCategory === 'All' ? lists : lists.filter((l) => l.category === activeCategory);
  const canStart = !!selectedList && teams.length >= 2;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 18 : 22, letterSpacing: 4, color: 'var(--lime)', textTransform: 'uppercase' }}>
            Deep Cut
          </span>
          <span style={{ flex: 1 }} />
          <Link href="/admin" style={{
            fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 12,
            letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-2)',
            textDecoration: 'none', padding: '5px 12px', border: '1px solid var(--border-2)',
            borderRadius: 4,
          }}>Admin</Link>
        </div>
      </header>

      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: isMobile ? '24px 16px' : '40px 24px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 340px',
        gap: isMobile ? 40 : 48,
        alignItems: 'start',
      }}>

        {/* LEFT: Topic selection */}
        <div>
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 6 }}>Step 01</p>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 32, letterSpacing: 1, color: 'var(--text)' }}>Choose a Topic</h2>
          </div>

          {loading ? (
            <div style={{ color: 'var(--text-2)', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, letterSpacing: 1 }}>Loading...</div>
          ) : error ? (
            <div style={{ color: 'var(--red)', fontSize: 14 }}>Failed to connect: {error}</div>
          ) : (
            <>
              {/* Category tabs */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                    letterSpacing: 2, textTransform: 'uppercase',
                    padding: '6px 14px', borderRadius: 3, cursor: 'pointer', transition: 'all 0.1s',
                    border: activeCategory === cat ? '1px solid var(--lime)' : '1px solid var(--border)',
                    background: activeCategory === cat ? 'var(--lime-dim)' : 'transparent',
                    color: activeCategory === cat ? 'var(--lime)' : 'var(--text-2)',
                  }}>
                    {cat !== 'All' && `${CATEGORY_ICONS[cat] ?? CATEGORY_ICONS.Default} `}{cat}
                  </button>
                ))}
              </div>

              {/* Topic grid */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(auto-fill, minmax(160px, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {visibleLists.map((list) => {
                  const isSelected = selectedList?.slug === list.slug;
                  return (
                    <button key={list.slug} onClick={() => setSelectedList(list)} style={{
                      textAlign: 'left', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.12s',
                      background: isSelected ? 'var(--lime-dim)' : 'var(--surface)',
                      border: isSelected ? '1px solid var(--lime)' : '1px solid var(--border)',
                      borderRadius: 6, outline: 'none',
                    }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: isSelected ? 'var(--lime)' : 'var(--text-3)', marginBottom: 6 }}>
                        {CATEGORY_ICONS[list.category] ?? CATEGORY_ICONS.Default} {list.category}
                      </div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 17, color: isSelected ? 'var(--lime)' : 'var(--text)', lineHeight: 1.2, marginBottom: 6 }}>{list.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{list.description}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: Game setup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Teams */}
          <div>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 6 }}>Step 02</p>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 28, letterSpacing: 1, color: 'var(--text)', marginBottom: 16 }}>Teams</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                ref={teamInputRef}
                type="text"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTeam()}
                placeholder="Team name..."
                maxLength={24}
                style={{
                  flex: 1, background: 'var(--surface)', border: '1px solid var(--border-2)',
                  borderRadius: 4, padding: '10px 14px', color: 'var(--text)', fontSize: 14,
                  fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
                }}
              />
              <button onClick={addTeam} disabled={!teamInput.trim()} style={{
                background: 'var(--lime)', color: '#000', fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 600, fontSize: 14, letterSpacing: 1, padding: '0 18px',
                border: 'none', borderRadius: 4, cursor: 'pointer',
                opacity: teamInput.trim() ? 1 : 0.35,
              }}>ADD</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {teams.map((team, i) => (
                <div key={team} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '8px 12px',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: TEAM_COLORS[i % TEAM_COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>{team}</span>
                  <button onClick={() => setTeams((prev) => prev.filter((t) => t !== team))}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              ))}
              {teams.length < 2 && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  {teams.length === 0 ? 'Add at least 2 teams.' : 'Add 1 more team.'}
                </p>
              )}
            </div>
          </div>

          {/* Guesses per team */}
          <div>
            <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 6 }}>Step 03</p>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 28, letterSpacing: 1, color: 'var(--text)', marginBottom: 4 }}>Guesses / Team</h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16 }}>Total guesses each team gets.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setGuessesPerTeam((n) => Math.max(1, n - 1))}
                style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)', fontSize: 22, cursor: 'pointer', fontWeight: 300 }}>−</button>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 48, color: 'var(--lime)', lineHeight: 1, minWidth: 48, textAlign: 'center' }}>{guessesPerTeam}</span>
              <button onClick={() => setGuessesPerTeam((n) => Math.min(20, n + 1))}
                style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)', fontSize: 22, cursor: 'pointer', fontWeight: 300 }}>+</button>
            </div>
          </div>

          {/* Start */}
          <button onClick={startGame} disabled={!canStart} style={{
            width: '100%', padding: '18px', borderRadius: 6, border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
            background: canStart ? 'var(--lime)' : 'var(--surface-2)',
            color: canStart ? '#000' : 'var(--text-3)',
            fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase',
            transition: 'all 0.12s',
          }}>
            {!selectedList ? 'Select a Topic First' : teams.length < 2 ? 'Add More Teams' : 'Start Game →'}
          </button>
        </div>
      </div>
    </div>
  );
}
