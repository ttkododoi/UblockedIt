import { ArrowUp, Flame, Gamepad2, MessageSquare, Plus, Send, Sparkles, Trash2, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../lib/api';
import { useApp, avatarColor, initials } from '../lib/store';
import { EmptyState, Reveal } from '../components/ui';

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

function Avatar({ name, hue, size = 30 }: { name: string; hue: number; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, ['--av' as any]: avatarColor(hue) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Community() {
  const { user, toast } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [stats, setStats] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postTag, setPostTag] = useState('general');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [commentDraft, setCommentDraft] = useState('');

  const load = () => {
    api.get<Post[]>(`/api/community/posts?tag=${tag}&sort=${sort}`).then((p) => {
      setPosts(p);
      setLoading(false);
    }).catch(() => setLoading(false));
    api.get('/api/community/stats').then(setStats).catch(() => {});
    api.get('/api/leaderboard').then((r) => setScores(r.slice(0, 6))).catch(() => {});
  };

  useEffect(load, [tag, sort]);

  const requireAuth = () => {
    if (user) return true;
    toast('Sign in to post, reply and vote.', 'info', 'Members only');
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
      toast('Thread published.', 'success');
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

  return (
    <>
      <div className="row wrap row--between" style={{ alignItems: 'flex-end', marginBottom: 26 }}>
        <div>
          <h1 className="h2">Community</h1>
          <p className="muted" style={{ marginTop: 6, maxWidth: '62ch' }}>
            Weekly challenges, emulator troubleshooting, and nostalgia that only makes sense if you were there.
          </p>
        </div>
        <div className="row wrap" style={{ gap: 7 }}>
          <span className="pill"><Users size={11} /> {stats?.members ?? 0} members</span>
          <span className="pill"><MessageSquare size={11} /> {stats?.comments ?? 0} replies</span>
          <span className="pill pill--green"><span className="dot" />{stats?.hoursPlayed ?? 0}h logged</span>
        </div>
      </div>

      <div className="split">
        <div>
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <div className="segmented">
              <button className={sort === 'new' ? 'is-active' : ''} onClick={() => setSort('new')}>Newest</button>
              <button className={sort === 'top' ? 'is-active' : ''} onClick={() => setSort('top')}>
                <Flame size={12} /> Top
              </button>
            </div>
            <div className="chips">
              {TAGS.map((t) => (
                <button key={t} className={`chip ${tag === t ? 'is-active' : ''}`} onClick={() => setTag(t)}>
                  {t === 'all' ? 'All' : `#${t}`}
                </button>
              ))}
            </div>
            <div className="spacer" />
            <button className="btn btn--sm btn--primary" onClick={() => (requireAuth() ? setComposerOpen((v) => !v) : null)}>
              <Plus size={14} /> New thread
            </button>
          </div>

          {composerOpen && (
            <div className="card card--pad" style={{ marginBottom: 16 }}>
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <Avatar name={user?.displayName || '?'} hue={user?.avatarHue || 210} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user?.displayName}</div>
                  <div className="tiny muted">posting publicly to the hub</div>
                </div>
                <div className="spacer" />
                <select className="select" value={postTag} onChange={(e) => setPostTag(e.target.value)} style={{ width: 'auto', fontSize: 12.5 }}>
                  {TAGS.filter((t) => t !== 'all').map((t) => (
                    <option key={t} value={t}>#{t}</option>
                  ))}
                </select>
              </div>
              <input className="field" placeholder="Thread title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 8 }} />
              <textarea
                className="field"
                placeholder="Screenshots, hot takes, ROM recommendations…"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ resize: 'vertical', minHeight: 90 }}
              />
              <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button className="btn btn--sm btn--ghost" onClick={() => setComposerOpen(false)}>Cancel</button>
                <button className="btn btn--sm btn--primary" disabled={posting} onClick={submitPost}>
                  <Send size={13} /> {posting ? 'Posting…' : 'Post thread'}
                </button>
              </div>
            </div>
          )}

          <div className="stack">
            {loading && <div className="skeleton" style={{ height: 140, borderRadius: 18 }} />}
            {!loading && posts.length === 0 && (
              <EmptyState icon={MessageSquare} title="No threads yet">Start the conversation — the first post is always the hardest.</EmptyState>
            )}
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={i < 3 ? (i as 0 | 1 | 2) : 3}>
                <article className="post">
                  <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <button className={`vote-btn ${post.voted ? 'is-on' : ''}`} onClick={() => vote(post)} aria-label="Upvote">
                      <ArrowUp size={14} />
                      {post.votes}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 9, marginBottom: 8 }}>
                        <Avatar name={post.author.displayName} hue={post.author.hue} size={28} />
                        <div style={{ minWidth: 0 }}>
                          <div className="row" style={{ gap: 5, fontSize: 13, fontWeight: 550 }}>
                            {post.author.displayName}
                            {post.author.username === 'nova' && <span className="pill pill--blue" style={{ fontSize: 10, padding: '1px 6px' }}>staff</span>}
                          </div>
                          <div className="tiny muted">@{post.author.username} · {fmt.ago(post.createdAt)}</div>
                        </div>
                        <span className="pill" style={{ marginLeft: 'auto' }}>#{post.tag}</span>
                        {post.mine && (
                          <button className="iconbtn" style={{ width: 24, height: 24 }} onClick={() => removePost(post)} aria-label="Delete thread">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <h3 style={{ fontSize: 15.5, marginBottom: 5 }}>{post.title}</h3>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{post.body}</p>
                      <div className="row" style={{ gap: 14, marginTop: 11, fontSize: 12, color: 'var(--ink-2)' }}>
                        <button
                          className="row"
                          onClick={() => toggleComments(post)}
                          style={{ gap: 5, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0 }}
                        >
                          <MessageSquare size={12} /> {post.comments} {post.comments === 1 ? 'reply' : 'replies'}
                        </button>
                        {post.gameId && (
                          <Link to={`/game/${post.gameId}`} className="row" style={{ gap: 4, color: 'var(--accent-ink)' }}>
                            <Gamepad2 size={12} /> {post.gameId}
                          </Link>
                        )}
                      </div>

                      {openComments === post.id && (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--line-soft)', paddingTop: 12 }}>
                          {(comments[post.id] || []).map((c) => (
                            <div className="row" key={c.id} style={{ gap: 9, alignItems: 'flex-start', marginBottom: 12 }}>
                              <Avatar name={c.author.displayName} hue={c.author.hue} size={24} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 550 }}>
                                  {c.author.displayName} <span className="tiny muted" style={{ fontWeight: 400 }}>· {fmt.ago(c.createdAt)}</span>
                                </div>
                                <div className="small" style={{ color: 'var(--ink-2)', marginTop: 2 }}>{c.body}</div>
                              </div>
                            </div>
                          ))}
                          {(comments[post.id] || []).length === 0 && (
                            <div className="small muted" style={{ padding: '4px 0 10px' }}>No replies yet.</div>
                          )}
                          <div className="row" style={{ gap: 8 }}>
                            <input
                              className="field"
                              placeholder={user ? 'Write a reply…' : 'Sign in to reply'}
                              value={commentDraft}
                              onChange={(e) => setCommentDraft(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && submitComment(post)}
                            />
                            <button className="btn btn--primary btn--sm" onClick={() => submitComment(post)} aria-label="Send reply">
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="stack">
          {!user && (
            <div className="card card--pad">
              <span className="eyebrow">Join in</span>
              <h3 style={{ fontSize: 18, margin: '10px 0 6px' }}>Get a name in the lobby</h3>
              <p className="small muted" style={{ lineHeight: 1.6 }}>
                Accounts keep your library, scores, themes and installs in sync — and let you post, vote and reply.
              </p>
              <div className="row" style={{ gap: 8, marginTop: 14 }}>
                <Link to="/signup" className="btn btn--sm btn--primary">Create account</Link>
                <Link to="/login" className="btn btn--sm btn--outline">Sign in</Link>
              </div>
            </div>
          )}

          <div className="card card--pad">
            <h3 className="row" style={{ gap: 7, fontSize: 13.5 }}><Trophy size={14} /> Global leaderboard</h3>
            <div className="stack" style={{ gap: 9, marginTop: 14 }}>
              {scores.length === 0 && <span className="small muted">No scores recorded yet.</span>}
              {scores.map((s, i) => (
                <div key={`${s.username}-${i}`} className="row" style={{ gap: 9, fontSize: 12.5 }}>
                  <span className="mono tiny muted" style={{ width: 14 }}>{i + 1}</span>
                  <Avatar name={s.username} hue={s.avatar_hue || 210} size={22} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</span>
                  <span className="tiny muted">{s.game_id}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{fmt.num(s.score)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card--pad">
            <h3 className="row" style={{ gap: 7, fontSize: 13.5 }}><Sparkles size={14} /> House rules</h3>
            <ul className="small muted" style={{ paddingLeft: 16, lineHeight: 1.85, margin: '10px 0 0' }}>
              <li>Be decent — no harassment, no piracy links.</li>
              <li>Spoilers go behind a warning.</li>
              <li>Self-promo in moderation; community games via the form above.</li>
              <li>Bug reports with steps get fixed fastest.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
