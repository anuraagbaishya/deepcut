'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { findMatch, initMatcher, searchItems } from '@/utils/matching';
import type { FullList, Team, RevealedItem, GuessResult, GameState, ListItem } from '@/types';

const TEAM_COLORS = ['#FF5555', '#5599FF', '#44DD77', '#FFCC33', '#AA77FF', '#FF77CC'];

interface Toast { id: number; message: string; type: 'hit' | 'miss'; }

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function GamePage() {
  const router = useRouter();
  const isMobile = useWindowWidth() < 768;
  const [mobileTab, setMobileTab] = useState<'play' | 'board'>('play');

  const [state, setState] = useState<GameState | null>(null);
  const guessesPerTeam = state?.guessesPerTeam ?? 5;

  const [list, setList] = useState<FullList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [guessesUsed, setGuessesUsed] = useState<number[]>([]);

  const [revealedItems, setRevealedItems] = useState<Map<number, RevealedItem>>(new Map());
  const [revealedRanks, setRevealedRanks] = useState<Set<number>>(new Set());

  const [guess, setGuess] = useState('');
  const [suggestions, setSuggestions] = useState<ListItem[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [lastResult, setLastResult] = useState<GuessResult | null>(null);
  const [recentGuesses, setRecentGuesses] = useState<GuessResult[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);
  const [showEndScreen, setShowEndScreen] = useState(false);

  const guessInputRef = useRef<HTMLInputElement>(null);
  const listPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('gameState');
    if (!raw) { router.replace('/'); return; }
    const gs: GameState = JSON.parse(raw);
    setState(gs);
    setTeams(gs.teamNames.map((name, i) => ({ name, color: TEAM_COLORS[i % TEAM_COLORS.length], score: 0 })));
    setGuessesUsed(new Array(gs.teamNames.length).fill(0));

    fetch(`/api/lists/${gs.slug}`)
      .then((r) => r.json())
      .then((l: FullList) => { setList(l); initMatcher(l.items); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  const addToast = useCallback((message: string, type: 'hit' | 'miss') => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  function handleGuessChange(value: string) {
    setGuess(value);
    setSelectedSuggestion(-1);
    setSuggestions(value.trim().length >= 1 ? searchItems(value, revealedRanks) : []);
  }

  function submitGuess(overrideValue?: string) {
    const guessValue = overrideValue ?? guess;
    if (!list || !guessValue.trim() || teams.length === 0) return;
    setSuggestions([]);
    setSelectedSuggestion(-1);

    const matched = findMatch(guessValue, list.items, revealedRanks);
    const activeTeam = teams[activeTeamIndex];

    if (matched) {
      const points = matched.rank;
      const result: GuessResult = { guess: guessValue, matched: true, rank: matched.rank, value: matched.value, points, teamName: activeTeam.name };

      const newRevealed = new Map(revealedItems);
      newRevealed.set(matched.rank, { rank: matched.rank, value: matched.value, hint: matched.hint, teamName: activeTeam.name, teamColor: activeTeam.color });
      setRevealedItems(newRevealed);

      const newRevealedRanks = new Set(revealedRanks);
      newRevealedRanks.add(matched.rank);
      setRevealedRanks(newRevealedRanks);

      setTeams((prev) => prev.map((t, i) => i === activeTeamIndex ? { ...t, score: t.score + points } : t));
      setLastResult(result);
      setRecentGuesses((prev) => [result, ...prev].slice(0, 8));
      addToast(`#${matched.rank} — ${matched.value} · +${points}`, 'hit');

      setTimeout(() => {
        const el = listPanelRef.current?.querySelector(`[data-rank="${matched.rank}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      const result: GuessResult = { guess: guessValue, matched: false };
      setLastResult(result);
      setRecentGuesses((prev) => [result, ...prev].slice(0, 8));
      addToast(`"${guessValue}" — not on the list`, 'miss');
    }

    setGuess('');
    setSuggestions([]);

    const newGuessesUsed = [...guessesUsed];
    newGuessesUsed[activeTeamIndex] += 1;
    setGuessesUsed(newGuessesUsed);

    if (newGuessesUsed.every((n) => n >= guessesPerTeam)) {
      setShowEndScreen(true);
      return;
    }

    const total = teams.length;
    let next = (activeTeamIndex + 1) % total;
    for (let i = 0; i < total; i++) {
      if (newGuessesUsed[next % total] < guessesPerTeam) break;
      next++;
    }
    setActiveTeamIndex(next % total);
    guessInputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestion((p) => Math.min(p + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestion((p) => Math.max(p - 1, -1)); }
    else if (e.key === 'Escape') { setSuggestions([]); setSelectedSuggestion(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) submitGuess(suggestions[selectedSuggestion].value);
      else submitGuess();
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: 3, color: 'var(--text-2)' }}>LOADING...</span>
    </div>
  );

  if (error || !list || !state) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', marginBottom: 12 }}>{error ?? 'Failed to load'}</p>
        <button onClick={() => router.push('/')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>Back</button>
      </div>
    </div>
  );

  const activeTeam = teams[activeTeamIndex];
  const revealedCount = revealedItems.size;
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  const answerBoard = (
    <div ref={listPanelRef} style={isMobile
      ? { flex: 1, overflowY: 'auto', background: 'var(--surface)' }
      : { width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--surface)' }
    }>
      {list.items.slice().sort((a, b) => a.rank - b.rank).map((item) => {
        const rev = revealedItems.get(item.rank);
        return (
          <div key={item.rank} data-rank={item.rank} style={{
            display: 'flex', alignItems: 'center',
            borderBottom: '1px solid var(--border)',
            borderLeft: rev ? `3px solid ${rev.teamColor}` : '3px solid transparent',
            background: rev ? 'var(--surface-2)' : 'transparent',
            transition: 'all 0.2s',
          }}>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500,
              color: rev ? rev.teamColor : 'var(--text-3)',
              minWidth: 36, padding: '7px 0 7px 10px', textAlign: 'right', flexShrink: 0,
            }}>{item.rank}</span>
            <div style={{ flex: 1, padding: '6px 10px', minWidth: 0 }}>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: rev ? 700 : 400,
                fontSize: 14, color: rev ? 'var(--text)' : 'var(--text-2)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{item.value}</div>
              {item.hint && (
                <div style={{ fontSize: 10, color: rev ? rev.teamColor : 'var(--text-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rev ? `${rev.teamName} · +${item.rank}` : item.hint}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const playPanel = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Team scores */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', padding: '10px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {teams.map((team, i) => {
          const isActive = i === activeTeamIndex;
          const used = guessesUsed[i] ?? 0;
          const remaining = Math.max(0, guessesPerTeam - used);
          const exhausted = used >= guessesPerTeam;
          return (
            <button key={team.name} onClick={() => setActiveTeamIndex(i)} style={{
              flexShrink: 0, minWidth: isMobile ? 110 : 130, padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: 6, cursor: 'pointer',
              background: isActive ? `${team.color}18` : 'var(--surface)',
              border: isActive ? `2px solid ${team.color}` : '2px solid var(--border)',
              textAlign: 'left', transition: 'all 0.12s',
              opacity: exhausted ? 0.45 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: team.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 12, color: isActive ? team.color : 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</span>
              </div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 26 : 32, color: isActive ? team.color : 'var(--text)', lineHeight: 1 }}>{team.score}</div>
              <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                {Array.from({ length: guessesPerTeam }).map((_, gi) => (
                  <div key={gi} style={{ width: 6, height: 6, borderRadius: 1, background: gi < remaining ? team.color : 'var(--border-2)', transition: 'background 0.2s' }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Current team banner */}
      <div style={{
        flexShrink: 0, padding: '8px 14px',
        background: `${activeTeam?.color}10`,
        borderBottom: `1px solid ${activeTeam?.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 2 }}>Now Guessing</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 20 : 24, color: activeTeam?.color, letterSpacing: 1 }}>{activeTeam?.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 28 : 36, color: activeTeam?.color, lineHeight: 1 }}>
            {Math.max(0, guessesPerTeam - (guessesUsed[activeTeamIndex] ?? 0))}
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-3)' }}>Guesses Left</div>
        </div>
      </div>

      {/* Guess input */}
      <div style={{ flexShrink: 0, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={guessInputRef}
              type="text"
              value={guess}
              onChange={(e) => handleGuessChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoFocus
              placeholder={`Answer for ${activeTeam?.name}...`}
              style={{
                flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                borderRadius: 4, padding: '12px 14px', color: 'var(--text)', fontSize: 16,
                fontFamily: "'Instrument Sans', sans-serif", outline: 'none',
              }}
            />
            <button onClick={() => submitGuess()} disabled={!guess.trim()} style={{
              background: guess.trim() ? activeTeam?.color : 'var(--surface-2)',
              color: guess.trim() ? '#000' : 'var(--text-3)',
              border: 'none', borderRadius: 4, padding: '0 16px', cursor: 'pointer',
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: 2,
              transition: 'all 0.12s', flexShrink: 0,
            }}>CHECK</button>
          </div>

          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: 'var(--surface-2)', border: '1px solid var(--border-2)',
              borderRadius: 6, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 20,
            }}>
              {suggestions.map((item, i) => (
                <div key={item.rank} onMouseDown={() => submitGuess(item.value)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer',
                  background: i === selectedSuggestion ? activeTeam?.color : 'transparent',
                  transition: 'background 0.08s',
                }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: i === selectedSuggestion ? 'rgba(0,0,0,0.6)' : 'var(--text-3)', minWidth: 24, textAlign: 'right' }}>{item.rank}</span>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: i === selectedSuggestion ? '#000' : 'var(--text)', flex: 1 }}>{item.value}</span>
                  {item.hint && (
                    <span style={{ fontSize: 11, color: i === selectedSuggestion ? 'rgba(0,0,0,0.5)' : 'var(--text-3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.hint}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {lastResult && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 4,
            background: lastResult.matched ? 'var(--green-dim)' : 'var(--red-dim)',
            border: `1px solid ${lastResult.matched ? '#22D47A30' : '#FF404030'}`,
            fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 13 : 15,
            color: lastResult.matched ? 'var(--green)' : 'var(--red)', letterSpacing: 0.5,
          }}>
            {lastResult.matched
              ? `✓ #${lastResult.rank} — ${lastResult.value}  ·  +${lastResult.points} pts  ·  ${lastResult.teamName}`
              : `✗ "${lastResult.guess}" — not on the list`}
          </div>
        )}
      </div>

      {/* Recent guesses log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {recentGuesses.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8 }}>No guesses yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentGuesses.map((g, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 3,
                background: i === 0 ? (g.matched ? 'var(--green-dim)' : 'var(--red-dim)') : 'transparent',
                opacity: 1 - i * 0.1,
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: g.matched ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>{g.matched ? '✓' : '✗'}</span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: g.matched ? 700 : 500, fontSize: 14, color: g.matched ? 'var(--text)' : 'var(--text-2)', flex: 1 }}>
                  {g.matched ? `${g.value} (#${g.rank})` : `"${g.guess}"`}
                </span>
                {g.matched && <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>+{g.points}</span>}
                {g.teamName && <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 12, color: 'var(--text-3)' }}>{g.teamName}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* Header */}
      <header style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', padding: '0 14px', height: 48, gap: isMobile ? 10 : 20 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 15 : 18, letterSpacing: 3, color: 'var(--lime)' }}>DEEP CUT</span>
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: isMobile ? 13 : 15, color: 'var(--text-2)', flex: 1, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.title}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{revealedCount}/{list.items.length}</span>
        <button onClick={() => setShowEndScreen(true)} style={{
          background: 'none', border: '1px solid #FF404040', color: 'var(--red)', borderRadius: 4,
          padding: '5px 12px', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0,
        }}>End</button>
      </header>

      {isMobile ? (
        <>
          <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            {(['play', 'board'] as const).map((tab) => {
              const isActive = mobileTab === tab;
              const label = tab === 'play' ? 'Play' : `Board (${revealedCount})`;
              return (
                <button key={tab} onClick={() => setMobileTab(tab)} style={{
                  flex: 1, padding: '12px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'var(--bg)' : 'var(--surface)',
                  borderBottom: isActive ? '2px solid var(--lime)' : '2px solid transparent',
                  fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 13,
                  letterSpacing: 2, textTransform: 'uppercase',
                  color: isActive ? 'var(--lime)' : 'var(--text-2)',
                  transition: 'all 0.1s',
                }}>{label}</button>
              );
            })}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {mobileTab === 'play' ? playPanel : answerBoard}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {answerBoard}
          {playPanel}
        </div>
      )}

      {/* Toasts */}
      <div style={{ position: 'fixed', bottom: isMobile ? 12 : 20, right: isMobile ? 12 : 20, left: isMobile ? 12 : 'auto', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 50, pointerEvents: 'none' }}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{
            padding: '10px 16px', borderRadius: 4,
            background: toast.type === 'hit' ? '#22D47A' : '#FF4040',
            color: '#000',
            fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: isMobile ? 13 : 15, letterSpacing: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            animation: 'slideIn 0.2s ease',
            textAlign: isMobile ? 'center' : 'left',
          }}>{toast.message}</div>
        ))}
      </div>

      {/* End screen */}
      {showEndScreen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(6px)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, width: '100%', maxWidth: 480,
            overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          }}>
            <div style={{ padding: isMobile ? '20px 20px 16px' : '28px 28px 20px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--lime)', marginBottom: 4 }}>Game Over</p>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 30 : 40, color: 'var(--text)', letterSpacing: 1 }}>Final Scores</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{revealedCount} of {list.items.length} items revealed</p>
            </div>
            <div style={{ padding: isMobile ? '16px 20px' : '20px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedTeams.map((team, i) => (
                <div key={team.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: i === 0 ? `${team.color}15` : 'var(--surface-2)',
                  border: i === 0 ? `1px solid ${team.color}40` : '1px solid var(--border)',
                  borderRadius: 6,
                }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 16 : 20, color: i === 0 ? 'var(--lime)' : 'var(--text-3)', minWidth: 24 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: team.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 600, fontSize: isMobile ? 16 : 20, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: isMobile ? 26 : 32, color: i === 0 ? team.color : 'var(--text)' }}>{team.score}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: isMobile ? '0 20px 20px' : '0 28px 28px', display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEndScreen(false)} style={{
                flex: 1, padding: '14px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', borderRadius: 6, cursor: 'pointer',
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase',
              }}>Resume</button>
              <button onClick={() => router.push('/')} style={{
                flex: 1, padding: '14px', background: 'var(--lime)', border: 'none',
                color: '#000', borderRadius: 6, cursor: 'pointer',
                fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase',
              }}>Play Again</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
