import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  ArrowUpRight,
  Crown,
  Flame,
  Gamepad2,
  Link2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useApp } from '../lib/store';
import { Reveal } from '../components/ui';

type Post = {
  id: number;
  title: string;
  body: string;
  tag: string;
  gameId: string | null;
  createdAt: string;
  author: { username: string; displayName: string; avatar: string; hue: number };
  votes: number;
  voted: boolean;
  comments: number;
  mine: boolean;
};

type Comment = {
  id: number;
  body: string;
  createdAt: string;
  author: { username: string; displayName: string; avatar: string; hue: number };
  mine: boolean;
};

const TAGS = ['all', 'challenges', 'help', 'emulators', 'general'];

export function Community() {
  const { user, toast } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [stats, setStats] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postTag, setPostTag] = useState('general');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState({ title: '', tagline: '', url: '', emoji: '🎮' });

  const load = () => {
    api.get<Post[]>(`/api/community/posts?tag=${tag}&sort=${sort}`).then(setPosts).catch(() => {});
    api.get('/api/community/stats').then(setStats).catch(() => {});
    api.get('/api/leaderboard').then((r) => setScores(r.slice(0, 6))).catch(() => {});
  };

  useEffect(load, [tag, sort]);

  const requireAuth = () => {
    if (user) return true;
    toast('Sign in to join the conversation — it takes ten seconds.', 'info', 'Members only');
    return false;
  };

  const submitPost = async () => {
    if (!requireAuth()) return;
    if (title.trim().length < 3) return toast('Add a title with at least 3 characters.', 'error');
    setPosting(true);
    try {
      await api.post('/api/community/posts', { title, body, tag: postTag });
      setTitle('');
      setBody('');
      setComposerOpen(false);
      load();
      toast('Posted to the feed.', 'success');
    } catch (e: any) {
      toast(e.message || 'Could not post.', 'error');
    } finally {
      setPosting(false);
    }
  };

  const vote = async (post: Post) => {
    if (!requireAuth()) return;
    setPosts((p) =>
      p.map((x) => (x.id === post.id ? { ...x, voted: !x.voted, votes: x.votes + (x.voted ? -1 : 1) } : x))
    );
    try {
      const res = await api.post<{ votes: number; voted: boolean }>(`/api/community/posts/${post.id}/vote`);
      setPosts((p) => p.map((x) => (x.id === post.id ? { ...x, votes: res.votes, voted: res.voted } : x)));
    } catch {
      load();
    }
  };

  const toggleComments = async (post: Post) => {
    if (openComments === post.id) return setOpenComments(null);
    setOpenComments(post.id);
    if (!comments[post.id]) {
      const data = await api.get<Comment[]>(`/api/community/posts/${post.id}/comments`).catch(() => []);
      setComments((c) => ({ ...c, [post.id]: data }));
    }
  };

  const submitComment = async (post: Post) => {
    if (!requireAuth()) return;
    if (!commentDraft.trim()) return;
    try {
      await api.post(`/api/community/posts/${post.id}/comments`, { body: commentDraft });
      const data = await api.get<Comment[]>(`/api/community/posts/${post.id}/comments`);
      setComments((c) => ({ ...c, [post.id]: data }));
      setCommentDraft('');
      setPosts((p) => p.map((x) => (x.id === post.id ? { ...x, comments: x.comments + 1 } : x)));
    } catch (e: any) {
      toast(e.message || 'Could not reply.', 'error');
    }
  };

  const removePost = async (post: Post) => {
    await api.del(`/api/community/posts/${post.id}`).catch(() => {});
    setPosts((p) => p.filter((x) => x.id !== post.id));
    toast('Thread deleted.');
  };

  const submitCustomGame = async () => {
    if (!requireAuth()) return;
    if (!custom.title || !custom.url) return toast('A title and URL are required.', 'error');
    try {
      await api.post('/api/custom-games', custom);
      setCustom({ title: '', tagline: '', url: '', emoji: '🎮' });
      setCustomOpen(false);
      toast('Added to the community catalog.', 'success', 'Game shared');
    } catch (e: any) {
      toast(e.message || 'Could not add that game.', 'error');
    }
  };

  return (
    <div className="page">
      <div className="eyebrow"><MessageSquare size={12} /> Community</div>
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(30px,4.2vw,48px)', letterSpacing: '-0.045em' }}>
            The <span className="grad-text">lobby</span>
          </h1>
          <p className="muted" style={{ marginTop: 8, maxWidth: '60ch', fontSize: 14 }}>
            Weekly challenges, emulator troubleshooting, and the kind of nostalgia that only makes sense to people who
            played it the first time.
          </p>
        </div>
        <div className="pill-row">
          <span className="badge"><Users size={11} /> {stats?.members ?? 0} members</span>
          <span className="badge"><MessageSquare size={11} /> {stats?.comments ?? 0} replies</span>
          <span className="badge badge-live"><span className="dot" />{stats?.hoursPlayed ?? 0}h logged</span>
        </div>
      </div>

      <div className="split-2" style={{ marginTop: 26 }}>
        <div>
          <div className="row wrap" style={{ gap: 10, marginBottom: 16 }}>
            <div className="tabs">
              <button className={sort === 'new' ? 'active' : ''} onClick={() => setSort('new')}>Newest</button>
              <button className={sort === 'top' ? 'active' : ''} onClick={() => setSort('top')}><Flame size={12} style={{ verticalAlign: -2 }} /> Top</button>
            </div>
            <div className="chips">
              {TAGS.map((t) => (
                <button key={t} className={`chip ${tag === t ? 'active' : ''}`} onClick={() => setTag(t)}>
                  {t === 'all' ? 'All' : `#${t}`}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={() => (requireAuth() ? setComposerOpen((v) => !v) : null)}>
              <Plus size={14} /> New thread
            </button>
          </div>

          <AnimatePresence>
            {composerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="card" style={{ padding: 18, marginBottom: 16 }}>
                  <div className="row wrap" style={{ gap: 10, marginBottom: 10 }}>
                    <div className="avatar" style={{ ['--hue' as any]: user?.avatarHue }}>{user?.avatar || '🛸'}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user?.displayName}</div>
                      <div className="post-meta">posting publicly to the hub</div>
                    </div>
                    <div className="spacer" />
                    <select className="select" value={postTag} onChange={(e) => setPostTag(e.target.value)} style={{ fontSize: 12 }}>
                      {TAGS.filter((t) => t !== 'all').map((t) => (
                        <option key={t} value={t}>#{t}</option>
                      ))}
                    </select>
                  </div>
                  <input className="input" placeholder="Thread title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 9 }} />
                  <textarea
                    className="input"
                    placeholder="What's on your mind? Screenshots, hot takes, ROM recommendations…"
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    style={{ resize: 'vertical', minHeight: 84 }}
                  />
                  <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setComposerOpen(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" disabled={posting} onClick={submitPost}>
                      <Send size={13} /> {posting ? 'Posting…' : 'Post thread'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="stack">
            {posts.length === 0 && (
              <div className="empty">
                <div className="big">💬</div>
                No threads here yet — start the conversation.
              </div>
            )}
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={Math.min(i * 0.04, 0.2)}>
                <div className="post">
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <button className={`vote-btn ${post.voted ? 'voted' : ''}`} onClick={() => vote(post)} aria-label="Upvote">
                      <ArrowUp size={15} />
                      {post.votes}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="post-head" style={{ marginBottom: 8 }}>
                        <span className="avatar" style={{ ['--hue' as any]: post.author.hue, width: 30, height: 30, fontSize: 14, borderRadius: 9 }}>
                          {post.author.avatar}
                        </span>
                        <div>
                          <div className="post-author">
                            {post.author.displayName}
                            {post.author.username === 'nova' && <Crown size={12} style={{ color: '#ffd166' }} />}
                          </div>
                          <div className="post-meta">@{post.author.username} · {fmt.ago(post.createdAt)}</div>
                        </div>
                        <span className="badge" style={{ marginLeft: 'auto' }}>#{post.tag}</span>
                        {post.mine && (
                          <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => removePost(post)} aria-label="Delete">
                            <Trash2 style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 15.5, marginBottom: 5 }}>{post.title}</div>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>{post.body}</p>
                      <div className="row" style={{ gap: 14, marginTop: 11, fontSize: 11.5, color: 'var(--muted)' }}>
                        <button
                          className="row"
                          onClick={() => toggleComments(post)}
                          style={{ gap: 5, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }}
                        >
                          <MessageSquare size={12} /> {post.comments} {post.comments === 1 ? 'reply' : 'replies'}
                        </button>
                        {post.gameId && (
                          <Link to={`/game/${post.gameId}`} className="row" style={{ gap: 4 }}>
                            <Gamepad2 size={12} /> {post.gameId}
                          </Link>
                        )}
                      </div>

                      <AnimatePresence>
                        {openComments === post.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                              {(comments[post.id] || []).map((c) => (
                                <div className="comment" key={c.id}>
                                  <span className="avatar" style={{ ['--hue' as any]: c.author.hue, width: 26, height: 26, fontSize: 12, borderRadius: 8 }}>
                                    {c.author.avatar}
                                  </span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                                      {c.author.displayName} <span className="post-meta">· {fmt.ago(c.createdAt)}</span>
                                    </div>
                                    <div style={{ fontSize: 12.8, color: 'var(--muted)', marginTop: 2 }}>{c.body}</div>
                                  </div>
                                </div>
                              ))}
                              {(comments[post.id] || []).length === 0 && (
                                <div className="small muted" style={{ padding: '8px 0' }}>No replies yet.</div>
                              )}
                              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                                <input
                                  className="input"
                                  placeholder={user ? 'Write a reply…' : 'Sign in to reply'}
                                  value={openComments === post.id ? commentDraft : ''}
                                  onChange={(e) => setCommentDraft(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && submitComment(post)}
                                  style={{ fontSize: 13 }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => submitComment(post)}>
                                  <Send size={12} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="stack">
          {!user && (
            <div className="card" style={{ padding: 20, background: 'linear-gradient(150deg, color-mix(in srgb, var(--accent) 16%, transparent), transparent)' }}>
              <div className="eyebrow">Join us</div>
              <h3 style={{ fontSize: 18, margin: '10px 0 6px' }}>Get a name in the lobby</h3>
              <p className="small muted" style={{ lineHeight: 1.6 }}>
                Accounts save your library, scores, themes and APK installs — and let you post, vote and reply.
              </p>
              <div className="row" style={{ gap: 8, marginTop: 14 }}>
                <Link to="/signup" className="btn btn-primary btn-sm">Create account</Link>
                <Link to="/login" className="btn btn-sm">Sign in</Link>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow"><Trophy size={12} /> Global leaderboard</div>
            <div className="stack" style={{ gap: 9, marginTop: 14 }}>
              {scores.length === 0 && <span className="small muted">No scores yet.</span>}
              {scores.map((s, i) => (
                <div key={`${s.username}-${i}`} className="row" style={{ gap: 9, fontSize: 13 }}>
                  <span style={{ width: 16, color: i === 0 ? '#ffd166' : 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                    {i === 0 ? <Crown size={12} /> : i + 1}
                  </span>
                  <span className="avatar" style={{ ['--hue' as any]: s.avatar_hue, width: 24, height: 24, fontSize: 11, borderRadius: 7 }}>
                    {s.avatar}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.game_id}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{fmt.num(s.score)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="eyebrow"><Link2 size={12} /> Share a game</div>
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setCustomOpen((v) => !v)} aria-label="Add game">
                <Plus style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
              Found a browser game worth adding? Drop the URL and it joins the community catalog.
            </p>
            <AnimatePresence>
              {customOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="stack" style={{ gap: 8, marginTop: 12 }}>
                    <input className="input" placeholder="Game title" value={custom.title} onChange={(e) => setCustom({ ...custom, title: e.target.value })} style={{ fontSize: 13 }} />
                    <input className="input" placeholder="One-line tagline" value={custom.tagline} onChange={(e) => setCustom({ ...custom, tagline: e.target.value })} style={{ fontSize: 13 }} />
                    <input className="input" placeholder="https://…" value={custom.url} onChange={(e) => setCustom({ ...custom, url: e.target.value })} style={{ fontSize: 13 }} />
                    <button className="btn btn-primary btn-sm" onClick={submitCustomGame}>Add to catalog</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow"><Sparkles size={12} /> House rules</div>
            <ul className="small muted" style={{ paddingLeft: 16, lineHeight: 1.8, margin: '10px 0 0' }}>
              <li>Be decent — no harassment, no piracy links.</li>
              <li>Spoilers go behind a warning.</li>
              <li>Self-promo in moderation, community games in the form above.</li>
              <li>Bug reports with steps get fixed fastest.</li>
            </ul>
          </div>

          <a href="#top" className="btn btn-ghost btn-sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUpRight size={13} /> Back to top
          </a>
        </div>
      </div>
    </div>
  );
}
