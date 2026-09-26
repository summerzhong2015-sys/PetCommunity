import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertTriangle, ArrowRight, BellRing, CheckCircle2, ChevronLeft, Dog, Footprints,
  Heart, HeartHandshake, House, Info, MapPin, MessageCircle, MessageSquare, PawPrint,
  Pencil, Plus, Send, ShieldCheck, Sparkles, UsersRound, X, Clock3, UserPlus,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Avatar,
  EmptyState,
  PageHeader,
  readStored,
  useStored,
  useRevealWhen,
  type Notice,
} from '@/components/page-bits';
import { Adopt, Shelters } from '@/pages/adopt';
import { Give } from '@/pages/give';
import { LostPets } from '@/pages/lost-pets';
import { LostPetSearch } from '@/pages/lost-pet-search';
import { Profile } from '@/pages/profile';
import { Walks } from '@/pages/walks';
import { review, type Verdict } from '@/lib/moderation';
import { PetPortrait, type PortraitSpec } from '@/components/pet-portrait';
import { Sky } from '@/components/sky';
import { PetPhoto } from '@/components/pet-photo';
import { describeDistance, metresBetween, withinCircle } from '@/lib/neighbours';
import { NEIGHBOURS } from '@/lib/neighbours-data';
import {
  OPENER_LIMIT, SIMULATED_REPLY_MS,
  accept as acceptRequest, askable, canSend, checkOpener, decline as declineRequest,
  inbox, requestThread, type Thread,
} from '@/lib/chat-requests';
import { backgroundFor, themeFor, themeVariables } from '@/lib/themes';
import {
  defaultProfile,
  isProfileStarted,
  normalizeProfile,
  type PetProfile,
  type PetType,
} from '@/lib/profile';
import {
  authEnabled,
  clerkProxyUrl,
  clerkPublishableKey,
  useAuthActions,
  useAuthUser,
} from '@/lib/auth';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

type Post = { id: string; author: string; initials: string; petType?: PetType; portrait?: PortraitSpec; time: string; title?: string; body: string; tag: string; likes: number; comments: string[]; accent: string; };


const defaultPosts: Post[] = [
  { id: 'p1', author: 'Maya Chen', initials: 'MC', time: '18 min ago', title: 'The tennis ball has been found', body: 'A sunny loop around Maple Park and Juniper is now officially tired. Thank you to whoever left the squeaky orange ball by the bench — Juniper says it was the highlight of her morning.', tag: 'Maple Park', likes: 14, comments: ['This made my morning. Give Juniper a scratch from us.'], accent: 'coral' },
  { id: 'p2', author: 'Theo Alvarez', initials: 'TA', time: '42 min ago', body: 'Heading down the creek path around 5:30 with Basil. We are doing a slow one today and have room for a couple of friendly stragglers.', tag: 'Out walking', likes: 9, comments: [], accent: 'ochre' },
  { id: 'p3', author: 'Nora Williams', initials: 'NW', time: '2 hr ago', title: 'Found: blue collar near Willow Gate', body: 'Small blue nylon collar, no tag. I left it with the park attendant at Willow Gate so it stays dry. Hope it finds its person.', tag: 'Kind find', likes: 21, comments: ['The owner was looking earlier — passing this along.'], accent: 'sage' },
];
const defaultThreads: Thread[] = [
  { id: 't1', state: 'open' as const, name: 'Rowan Bell', initials: 'RB', pet: 'Pip · terrier', preview: 'Thank you for keeping an eye out.', messages: [{ from: 'them', text: 'Hi, I am Pip’s person. Thank you for keeping an eye out near Willow Gate.', time: '9:04 AM' }, { from: 'me', text: 'Of course. I will let you know if I see him on the creek path.', time: '9:11 AM' }] },
  { id: 't2', state: 'open' as const, name: 'Camille Jones', initials: 'CJ', pet: 'Miso · tabby', preview: 'Miso likes the quiet side of the garden.', messages: [{ from: 'them', text: 'Miso likes the quiet side of the garden, just in case you spot her.', time: 'Yesterday' }] },
  { id: 't3', state: 'open' as const, name: 'Theo Alvarez', initials: 'TA', pet: 'Basil · retriever mix', preview: 'Creekside at 5:30?', messages: [{ from: 'them', text: 'Creekside at 5:30?', time: 'Mon' }, { from: 'me', text: 'We will join for the first loop.', time: 'Mon' }] },
];


function PetAvatar({ type, className = '' }: { type: PetType; className?: string }) {
  return <img src={`${basePath}/pet-${type}.svg`} alt={`${type} profile`} className={`pet-avatar ${className}`} />;
}

/** `mobile` marks the five that fit in the bottom bar on a phone. */
/**
 * What each section is called.
 *
 * Named the way a neighbour would say it, not the way a product spec would.
 * "Give" is a category; "Chip in" is what someone actually does. "Nearby" is a
 * radius; "Your neighbours" is who is in it. `short` is the version that fits
 * the bottom bar on a phone.
 */
const navItems = [
  { href: '/', label: 'Around here', short: 'Home', icon: House, mobile: true },
  { href: '/nearby', label: 'Your neighbours', short: 'Neighbours', icon: UsersRound, mobile: false },
  { href: '/walks', label: 'Good walks', short: 'Walks', icon: Footprints, mobile: false },
  { href: '/lost-pets', label: 'Lost & found', short: 'Lost', icon: BellRing, mobile: true },
  { href: '/adopt', label: 'Looking for homes', short: 'Adopt', icon: PawPrint, mobile: true },
  { href: '/give', label: 'Chip in', short: 'Chip in', icon: HeartHandshake, mobile: true },
  { href: '/messages', label: 'Messages', short: 'Messages', icon: MessageCircle, mobile: true },
];

function Shell({ children, notice, setNotice, profile }: { children: ReactNode; notice: Notice | null; setNotice: (n: Notice | null) => void; profile: PetProfile }) {
  const [location] = useLocation();
  const { isSignedIn } = useAuthUser();
  const { signOut } = useAuthActions();
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);
  // Signed in, or a profile already filled in and kept in this browser.
  const showProfileCard = isSignedIn || isProfileStarted(profile);
  // Each section gets its own palette. Only the colours that carry meaning
  // move — the paper and the type stay put — so the app still reads as one
  // place. See lib/themes.ts; the contrast is tested, not eyeballed.
  const theme = themeFor(location);
  // A toast that never leaves reads as a stale confirmation of whatever you just did.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  return (
    <div
      className="app-shell md:flex theme-surface"
      style={themeVariables(theme) as CSSProperties}
      data-theme={theme.name.toLowerCase().replace(' ', '-')}
    >
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-sidebar text-sidebar-foreground p-5">
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-5" data-testid="link-brand">
          <span className="grid place-items-center w-10 h-10 rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground"><Dog size={22} /></span>
          <span><strong className="serif text-xl tracking-tight">PetCommunity</strong><span className="block mono text-[9px] uppercase tracking-[.16em] opacity-55">Your local circle</span></span>
        </Link>
        {/* Your own picture belongs in front of you whether or not you signed in:
            the profile lives in this browser, so a set-up profile counts. */}
        {showProfileCard ? <div className="rounded-2xl bg-sidebar-accent p-3 mb-7 flex items-center gap-3">
          <Link href="/profile" className="group flex items-center gap-3 min-w-0 flex-1" aria-label="See and edit your pet profile" title="See and edit your pet profile" data-testid="link-sidebar-profile">
            <span className="relative shrink-0 transition-transform group-hover:-translate-y-px">
              <PetPhoto src={profile.avatar} portrait={profile.portrait} alt={profile.petName} className="w-11 h-11 rounded-[.8rem]" />
              <span className="absolute -bottom-1 -right-1 grid place-items-center w-[18px] h-[18px] rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Pencil size={9} strokeWidth={2.6} />
              </span>
            </span>
            <span className="min-w-0">
              <strong className="block text-sm truncate">{profile.username}</strong>
              <span className="block text-[11px] text-sidebar-foreground/60 truncate">{profile.petName} · {profile.petType}</span>
              <span className="block text-[10px] font-bold text-sidebar-primary mt-0.5">Edit profile</span>
            </span>
          </Link>
          {isSignedIn && <button type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1.5 rounded-lg self-start" aria-label="Sign out" data-testid="button-sign-out"><ArrowRight size={15} className="rotate-180" /></button>}
        </div> : <Link href={authEnabled ? '/sign-in' : '/profile'} className="rounded-2xl bg-sidebar-accent p-3 mb-7 flex items-center gap-3 hover:bg-sidebar-accent/80" data-testid="link-sidebar-sign-in">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-sidebar-primary/15 text-sidebar-primary"><Dog size={18} /></span>
          <span><strong className="block text-sm">Set up your pet profile</strong><span className="block text-[11px] text-sidebar-foreground/60 mt-0.5">{authEnabled ? 'Sign in to get started' : 'Saved in this browser'}</span></span>
        </Link>}
        <p className="eyebrow text-sidebar-foreground/50 px-3 mb-3">Where to go</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map(({ href, label, short, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${active(href) ? 'active' : ''}`} data-testid={`link-nav-${short.toLowerCase().replace(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{href === '/lost-pets' && <span className="ml-auto w-2 h-2 rounded-full bg-sidebar-primary" />}</Link>)}
        </nav>
        <div className="mt-auto">
          <div className="rounded-2xl bg-sidebar-accent p-4">
          <ShieldCheck size={19} className="text-sidebar-primary mb-3" />
          <p className="font-bold text-sm">Privacy, by default.</p>
          <p className="text-xs leading-relaxed text-sidebar-foreground/60 mt-1">Use a neighborhood name, not a legal one. Share only what helps.</p>
          </div>
        </div>
      </aside>
      <div
        className="flex-1 min-w-0 pb-20 md:pb-0 relative theme-surface"
        style={{
          backgroundColor: `hsl(${theme.tint})`,
          // The section wash used to be its own absolutely positioned, animated
          // layer spanning the whole scroll height. A composited layer that
          // large, sitting over everything, left parts of the page unpainted
          // until something forced a repaint — which is why text appeared only
          // while the pointer was over it. It is a plain background now, and
          // fixed so it stays viewport-sized however long the page gets.
          backgroundImage: backgroundFor(theme),
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Decoration, pinned behind the page content below. */}
        <Sky />
        <header className="sticky top-0 z-30 md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/90 backdrop-blur">
          <Link href="/" className="flex items-center gap-2" data-testid="link-mobile-brand"><span className="grid place-items-center w-8 h-8 rounded-xl bg-primary text-primary-foreground"><Dog size={17} /></span><strong className="serif text-lg">PetCommunity</strong></Link>
          {showProfileCard || !authEnabled ? <Link href="/profile" className="relative p-1 rounded-xl flex items-center gap-1.5" aria-label="See and edit your pet profile" title="See and edit your pet profile" data-testid="link-mobile-profile">
            <span className="relative">
              <PetPhoto src={profile.avatar} portrait={profile.portrait} alt={profile.petName} className="w-10 h-10 rounded-[.75rem]" />
              <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-[17px] h-[17px] rounded-full bg-primary text-primary-foreground border-2 border-background">
                <Pencil size={8} strokeWidth={2.8} />
              </span>
            </span>
          </Link> : <Link href="/sign-in" className="text-xs font-bold text-primary px-2 py-2" data-testid="link-mobile-sign-in">Sign in</Link>}
        </header>
        <div className="relative z-10">{children}</div>
      </div>
      <nav className="fixed z-30 bottom-0 inset-x-0 md:hidden bg-card/95 backdrop-blur border-t border-border grid grid-cols-5 px-1 py-2" aria-label="Mobile navigation">
        {navItems.filter(item => item.mobile).map(({ href, short, icon: Icon }) => <Link key={href} href={href} className={`mobile-nav-link ${active(href) ? 'active' : ''}`} data-testid={`link-mobile-${short.toLowerCase().replace(' ', '-')}`}><Icon size={19} strokeWidth={active(href) ? 2.5 : 1.8} /><span>{short}</span></Link>)}
      </nav>
      {notice && <div role="status" className={`toast-pop fixed z-50 bottom-24 md:bottom-7 right-4 max-w-[min(90vw,390px)] flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ${notice.tone === 'error' ? 'bg-destructive text-destructive-foreground' : notice.tone === 'success' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border border-border'}`} data-testid="status-notice"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span className="text-sm font-semibold">{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss message" data-testid="button-dismiss-notice"><X size={16} /></button></div>}
    </div>
  );
}


function Home({ notify, profile }: { notify: (n: Notice) => void; profile: PetProfile }) {
  const [filter, setFilter] = useState('All activity');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useStored<Post[]>('pc_posts', defaultPosts);
  const [likes, setLikes] = useStored<string[]>('pc_likes', []);
  const [comments, setComments] = useStored<Record<string, string[]>>('pc_comments', {});
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postVerdict, setPostVerdict] = useState<Verdict | null>(null);
  const filtered = useMemo(() => filter === 'Lost pets' ? posts.filter(p => p.tag.toLowerCase().includes('lost')) : filter === 'Nearby' ? posts.filter(p => ['Maple Park', 'Out walking'].includes(p.tag)) : posts, [filter, posts]);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 180); return () => window.clearTimeout(timer); }, []);
  const addPost = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) { notify({ tone: 'error', text: 'Write a little something before posting.' }); return; }
    // A post goes to the whole circle, so it gets the same check a message does.
    if (!(postVerdict?.level === 'warn' && postVerdict.matched && text.includes(postVerdict.matched))) {
      const result = await review(text);
      if (result.level !== 'clean') { setPostVerdict(result); return; }
    }
    const newPost: Post = { id: `p-${Date.now()}`, author: profile.username, initials: profile.username.slice(0, 2).toUpperCase(), petType: profile.petType, portrait: profile.portrait, time: 'Just now', body: text, tag: profile.neighbourhood, likes: 0, comments: [], accent: 'sage' };
    setPosts(current => [newPost, ...current]); setDraft(''); setPostVerdict(null); setComposerOpen(false); notify({ tone: 'success', text: 'Posted to your neighborhood.' });
  };
  const addComment = (event: FormEvent, postId: string) => {
    event.preventDefault(); const text = commentDrafts[postId]?.trim(); if (!text) return;
    setComments(current => ({ ...current, [postId]: [...(current[postId] || []), text] })); setCommentDrafts(current => ({ ...current, [postId]: '' })); notify({ tone: 'success', text: 'Comment added.' });
  };
  return <main>
    <PageHeader eyebrow="Tuesday · 11 June · Maple Park" title={<>A good day to say <em className="text-primary not-italic">hello.</em></>} description="The friendly corner of your neighborhood for four-legged hellos, useful tips, and the occasional tennis ball mystery." action={<button className="action-button button-accent" onClick={() => setComposerOpen(v => !v)} data-testid="button-create-post"><Plus size={17} /> Start a post</button>} />
    <section className="page-wrap pb-5 grid sm:grid-cols-2 gap-4">
      <Link href="/adopt" className="paper-card p-5 flex items-start gap-4 reveal" data-testid="link-home-adopt">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-secondary text-primary shrink-0"><PawPrint size={22} strokeWidth={1.7} /></span>
        <span>
          <strong className="serif text-xl block">Ten animals need a home</strong>
          <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">From four shelters and rescues within walking distance. Honest write-ups, and you can just go and visit.</span>
        </span>
      </Link>
      <Link href="/give" className="paper-card p-5 flex items-start gap-4 reveal reveal-delay-1" data-testid="link-home-give">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-secondary text-primary shrink-0"><HeartHandshake size={22} strokeWidth={1.7} /></span>
        <span>
          <strong className="serif text-xl block">Six things worth funding</strong>
          <span className="block text-sm text-muted-foreground mt-1 leading-relaxed">A kennel boiler, a neighbour&rsquo;s chemo bill, a kitten&rsquo;s hip, and the stray fund at East Ridge.</span>
        </span>
      </Link>
    </section>
    <section className="page-wrap grid lg:grid-cols-[minmax(0,1fr)_300px] gap-7 pb-10">
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Feed filters">{['All activity', 'Nearby', 'Lost pets'].map(item => <button key={item} onClick={() => setFilter(item)} role="tab" aria-selected={filter === item} className={`action-button whitespace-nowrap !min-h-9 !py-2 !px-3 text-xs ${filter === item ? 'button-primary' : 'button-quiet'}`} data-testid={`button-filter-${item.toLowerCase().replace(' ', '-')}`}>{item}{item === 'Lost pets' && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}</button>)}</div>
     {composerOpen && <form onSubmit={addPost} className="paper-card p-4 reveal" data-testid="form-create-post"><div className="flex gap-3"><PetPortrait spec={profile.portrait} className="w-10 h-10 shrink-0" rounded={20} /><div className="flex-1"><label htmlFor="post-body" className="sr-only">Post to your neighborhood</label><textarea id="post-body" className="field min-h-24 resize-y" autoFocus value={draft} onChange={e => { setDraft(e.target.value); if (postVerdict?.level === 'block') setPostVerdict(null); }} placeholder="Share a small neighborhood update..." data-testid="input-post-body" />{postVerdict && postVerdict.level !== 'clean' && <p className={`text-sm mt-2 flex items-start gap-2 ${postVerdict.level === 'block' ? 'text-destructive' : 'text-muted-foreground'}`} role="alert" data-testid="notice-post-moderation">{postVerdict.level === 'block' ? <AlertTriangle size={15} className="shrink-0 mt-0.5" /> : <Info size={15} className="shrink-0 mt-0.5 text-primary" />}<span>{postVerdict.reason}{postVerdict.level === 'warn' && <em className="not-italic block text-xs mt-1">Press publish again to post it anyway.</em>}</span></p>}<div className="flex justify-end gap-2 mt-3"><button type="button" className="action-button button-quiet" onClick={() => setComposerOpen(false)} data-testid="button-cancel-post">Cancel</button><button type="submit" className="action-button button-primary" data-testid="button-submit-post">Publish post</button></div></div></div></form>}
        {loading ? <div className="space-y-4" role="status" aria-label="Loading neighborhood activity" data-testid="status-loading-feed">{[1, 2, 3].map(item => <div key={item} className="paper-card p-5" aria-hidden="true"><div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-full" /><div className="flex-1 space-y-3"><div className="skeleton h-3 w-32" /><div className="skeleton h-3 w-20" /><div className="skeleton h-16 w-full mt-5" /></div></div></div>)}</div> : filtered.length === 0 ? <EmptyState title="A quiet corner for now" copy="No lost-pet posts in this filter. If you spot something, sharing quickly can make a real difference." icon={BellRing} /> : filtered.map((post, index) => {
          const postComments = [...post.comments, ...(comments[post.id] || [])];
          return <article key={post.id} className={`paper-card p-5 reveal reveal-delay-${Math.min(index + 1, 3)}`} data-testid={`card-post-${post.id}`}>
             <div className="flex gap-3">{post.portrait ? <PetPortrait spec={post.portrait} className="w-10 h-10 shrink-0" rounded={20} /> : post.petType ? <PetAvatar type={post.petType} /> : <Avatar initials={post.initials} />}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-sm" data-testid={`text-post-author-${post.id}`}>{post.author}</p><p className="text-xs text-muted-foreground mt-0.5">{post.time} <span className="mx-1">·</span> neighbors only</p></div><button onClick={() => notify({ tone: 'info', text: 'Posts are shared only with your local circle.' })} className="text-muted-foreground p-1" aria-label={`More options for ${post.author}`} data-testid={`button-post-more-${post.id}`}><span className="text-lg leading-none">···</span></button></div>
              {post.title && <h2 className="serif text-xl mt-4">{post.title}</h2>}<p className="mt-2 prose-note">{post.body}</p><span className="tag mt-4">{post.tag}</span>
              <div className="flex items-center gap-5 border-t border-border mt-5 pt-3 text-xs text-muted-foreground"><button onClick={() => setLikes(current => current.includes(post.id) ? current.filter(id => id !== post.id) : [...current, post.id])} className={`inline-flex items-center gap-1.5 ${likes.includes(post.id) ? 'text-destructive' : 'hover:text-destructive'}`} aria-label={`${likes.includes(post.id) ? 'Unlike' : 'Like'} ${post.author}'s post`} data-testid={`button-like-post-${post.id}`}><Heart size={16} fill={likes.includes(post.id) ? 'currentColor' : 'none'} />{post.likes + (likes.includes(post.id) ? 1 : 0)}</button><button onClick={() => document.getElementById(`comment-${post.id}`)?.focus()} className="inline-flex items-center gap-1.5 hover:text-primary" data-testid={`button-comment-post-${post.id}`}><MessageSquare size={16} />{postComments.length}</button><span className="ml-auto inline-flex items-center gap-1"><MapPin size={13} /> 2 km circle</span></div>
              {postComments.length > 0 && <div className="mt-3 space-y-2">{postComments.map((comment, i) => <p key={`${post.id}-comment-${i}`} className="text-xs bg-secondary rounded-lg px-3 py-2"><strong className="mr-1">Neighbor</strong>{comment}</p>)}</div>}
              <form onSubmit={e => addComment(e, post.id)} className="flex gap-2 mt-3"><label htmlFor={`comment-${post.id}`} className="sr-only">Add a comment</label><input id={`comment-${post.id}`} className="field !py-2 text-xs" value={commentDrafts[post.id] || ''} onChange={e => setCommentDrafts(current => ({ ...current, [post.id]: e.target.value }))} placeholder="Say something kind..." data-testid={`input-comment-${post.id}`} /><button type="submit" className="action-button button-quiet !p-2" aria-label="Send comment" data-testid={`button-submit-comment-${post.id}`}><Send size={15} /></button></form>
            </div></div>
          </article>;
        })}
      </div>
      <aside className="space-y-4">
        <Link href="/lost-pets" className="block rounded-2xl bg-primary text-primary-foreground p-5 hover:shadow-lg hover:-translate-y-0.5 transition-transform" data-testid="link-lost-pet-safety"><div className="flex justify-between items-start"><span className="grid place-items-center w-10 h-10 rounded-xl bg-primary-foreground/10"><BellRing size={21} /></span><ArrowRight size={18} /></div><p className="eyebrow text-primary-foreground/60 mt-7">Safety shortcut</p><h2 className="serif text-2xl mt-1">See a missing pet?</h2><p className="text-sm text-primary-foreground/70 mt-2 leading-relaxed">Post an alert to nearby neighbors in under a minute.</p></Link>
        <div className="paper-card p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Community pulse</p><h2 className="serif text-2xl mt-1">Around here</h2></div><Sparkles size={18} className="text-accent" /></div><div className="mt-5 space-y-4"><div><div className="flex justify-between text-xs mb-1.5"><span>Neighbors out walking</span><strong className="mono text-[11px]">18</strong></div><div className="progress-track"><div className="progress-fill w-[72%]" /></div></div><div><div className="flex justify-between text-xs mb-1.5"><span>Kind finds returned</span><strong className="mono text-[11px]">6 this week</strong></div><div className="progress-track"><div className="progress-fill w-[58%]" /></div></div></div><p className="text-xs text-muted-foreground border-t border-border mt-5 pt-4 flex gap-2"><ShieldCheck size={14} className="shrink-0 text-primary" />Names and exact addresses stay private here.</p></div>
        <div className="paper-card p-5"><p className="eyebrow">Today nearby</p><div className="flex items-center gap-2 mt-4"><div className="flex -space-x-2"><Avatar initials="MC" className="small ring-2 ring-card" /><Avatar initials="TA" className="small ring-2 ring-card" /><Avatar initials="NW" className="small ring-2 ring-card" /></div><p className="text-xs text-muted-foreground"><strong className="text-foreground">18 neighbors</strong> are out in your 2 km circle</p></div><Link href="/nearby" className="text-xs font-bold text-primary inline-flex items-center gap-1 mt-5" data-testid="link-see-nearby">See who is nearby <ArrowRight size={14} /></Link></div>
      </aside>
    </section>
  </main>;
}

function Nearby({ notify, profile }: { notify: (n: Notice) => void; profile: PetProfile }) {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const panel = useRevealWhen<HTMLDivElement>(selected);
  const people = NEIGHBOURS;
  // Distances are computed from the landmark each person chose, not written
  // down. You appear here only if you asked to, and only for people inside the
  // circle the page promises.
  const you = isProfileStarted(profile) && profile.shareArea
    ? {
        id: 'you',
        name: `${profile.username} (you)`,
        initials: profile.username.slice(0, 2).toUpperCase(),
        pet: profile.petName,
        detail: [profile.breed, profile.age].filter(Boolean).join(' · ') || profile.petType,
        note: `Usually around ${profile.neighbourhood}`,
        color: 'bg-secondary',
        area: profile.neighbourhood,
        photo: undefined as string | undefined,
        avatar: profile.avatar,
        portrait: profile.portrait,
      }
    : null;

  const listed = [...(you ? [you] : []), ...people]
    .map(person => {
      const metres = you ? metresBetween(you.area, person.area) : metresBetween(profile.neighbourhood, person.area);
      return { ...person, metres, distance: person.id === 'you' ? 'your patch' : metres === null ? '' : describeDistance(metres) };
    })
    .filter(person => person.id === 'you' || !you || withinCircle(person.metres))
    .sort((a, b) => (a.metres ?? Infinity) - (b.metres ?? Infinity));

  const chosen = listed.find(p => p.id === selected);
  const startMessage = (name: string, pet: string) => { localStorage.setItem('pc_draft', `Hi ${name.split(' ')[0]} — I’m a neighbor and would love to say hello to ${pet}.`); setLocation('/messages'); };
  return <main><PageHeader eyebrow="Your 2 km circle" title={<>Familiar faces,<br /><em className="text-primary not-italic">four paws at a time.</em></>} description="Discover the people and pets who make the routes around you feel like home. Approximate distance only." action={<button className="action-button button-quiet" onClick={() => notify({ tone: 'info', text: 'Maple Park is your current neighborhood circle.' })} data-testid="button-nearby-filter"><MapPin size={16} /> Maple Park <span className="text-muted-foreground">⌄</span></button>} />
    <section className="page-wrap pb-10"><div className="flex items-center gap-2 mb-5"><span className="tag bg-primary/10 text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />18 active now</span><span className="text-xs text-muted-foreground">No precise locations are shown</span></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{listed.map((person, i) => <button key={person.id} onClick={() => setSelected(person.id)} className={`paper-card text-left p-5 ${selected === person.id ? 'ring-2 ring-primary' : ''} reveal reveal-delay-${Math.min(i + 1, 3)}`} data-testid={`card-neighbor-${person.id}`}><div className="relative"><PetPhoto photo={person.photo} src={person.avatar} portrait={person.portrait} alt={`${person.pet}, ${person.detail}`} className="w-full aspect-[4/3] rounded-[1rem]" width={420} fallback={<span className={`block w-full h-full ${person.color}`} />} /><span className="tag absolute top-3 right-3 bg-card/85 backdrop-blur-sm">{person.distance}</span></div><div className="flex items-center gap-2.5 mt-4"><Avatar initials={person.initials} className="small" /><h2 className="serif text-2xl">{person.name}</h2></div><p className="text-sm font-semibold mt-1">{person.pet}</p><p className="text-xs text-muted-foreground mt-1">{person.detail}</p><div className={`rounded-xl ${person.color} mt-5 px-3 py-3 text-xs text-foreground/75 flex gap-2`}><Footprints size={14} className="shrink-0" />{person.note}</div><span className="flex items-center justify-between mt-5 text-xs font-bold text-primary">View neighbor <ArrowRight size={15} /></span></button>)}</div>
      {chosen && <div ref={panel} className="paper-card mt-6 p-5 md:p-7 reveal" data-testid={`panel-neighbor-detail-${chosen.id}`}><div className="flex justify-between items-start"><div className="flex gap-4 items-center"><PetPhoto photo={chosen.photo} src={chosen.avatar} portrait={chosen.portrait} alt={`${chosen.pet}, ${chosen.detail}`} className="w-20 h-20 shrink-0 rounded-[1.4rem]" width={220} fallback={<span className={`block w-full h-full ${chosen.color}`} />} /><div><p className="eyebrow">{chosen.distance} away</p><h2 className="serif text-2xl">{chosen.name} & {chosen.pet}</h2><p className="text-xs text-muted-foreground mt-1">{chosen.detail}</p></div></div><button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close neighbor details" data-testid="button-close-neighbor"><X size={18} /></button></div><p className="text-sm text-muted-foreground mt-5 max-w-xl">You are both in the Maple Park circle. PetCommunity keeps the introduction light: no last names, addresses, or personal profiles required.</p><div className="flex flex-wrap gap-2 mt-4"><span className="tag">Friendly introduction</span><span className="tag">Approximate distance</span><span className="tag">Neighborhood only</span></div><button onClick={() => startMessage(chosen.name, chosen.pet)} className="action-button button-primary mt-6" data-testid={`button-message-neighbor-${chosen.id}`}><MessageCircle size={16} /> Draft a friendly hello</button></div>}
    </section>
  </main>;
}


function Messages({ notify }: { notify: (n: Notice) => void }) {
  const [threads, setThreads] = useStored<Thread[]>('pc_threads', defaultThreads);
  const [selectedId, setSelectedId] = useState('t1');
  const conversation = useRevealWhen<HTMLDivElement>(selectedId);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);
  const endOfMessages = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(() => { const value = localStorage.getItem('pc_draft') || ''; localStorage.removeItem('pc_draft'); return value; });
  // Starting a conversation: who you can ask, and the hello you are writing.
  const [asking, setAsking] = useState(false);
  const [askingWho, setAskingWho] = useState<string | null>(null);
  const [opener, setOpener] = useState('');
  const listed = inbox(threads);
  const selected = listed.find(t => t.id === selectedId) || listed[0];
  const open = canSend(selected);
  const canAsk = askable(NEIGHBOURS, threads);
  const chosen = canAsk.find(n => n.id === askingWho) ?? null;

  function sendRequest() {
    if (!chosen) return;
    const verdict = checkOpener(opener);
    if (!verdict.ok) { notify({ tone: 'error', text: verdict.reason }); return; }
    const thread = requestThread(chosen, opener);
    setThreads(current => [thread, ...current]);
    setSelectedId(thread.id);
    setAsking(false);
    setAskingWho(null);
    setOpener('');
    notify({ tone: 'success', text: `Asked ${chosen.name.split(' ')[0]}. You will see it here if they say yes.` });

    // Nobody is on the other end yet, so the demo answers. When there is a
    // backend this call comes from it instead, and nothing else changes.
    window.setTimeout(() => {
      setThreads(current => current.map(t => t.id === thread.id
        ? acceptRequest(t, new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
        : t));
      notify({ tone: 'success', text: `${chosen.name.split(' ')[0]} accepted. You can talk now.` });
    }, SIMULATED_REPLY_MS);
  }

  function withdraw(thread: Thread) {
    setThreads(current => current.map(t => (t.id === thread.id ? declineRequest(t) : t)));
    notify({ tone: 'info', text: 'Request withdrawn.' });
  }
  const deliver = (text: string) => {
    const message = { from: 'me' as const, text, time: 'Just now' };
    setThreads(current => current.map(thread => thread.id === selected.id ? { ...thread, preview: message.text, messages: [...thread.messages, message] } : thread));
    setDraft('');
    setVerdict(null);
    notify({ tone: 'success', text: `Sent to ${selected.name.split(' ')[0]}.` });
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    // A warning the person has read and pressed send through is a yes.
    if (verdict?.level === 'warn' && verdict.matched && text.includes(verdict.matched)) { deliver(text); return; }
    setChecking(true);
    const result = await review(text);
    setChecking(false);
    if (result.level === 'clean') { deliver(text); return; }
    setVerdict(result);
  };

  // Keep the newest message in view. Without this the list only grew downward,
  // so everything sent landed below the fold and nothing seemed to happen.
  useEffect(() => { endOfMessages.current?.scrollIntoView({ block: 'nearest' }); }, [selected.messages.length, selectedId]);
  return <main className="min-h-[calc(100dvh-4rem)]"><PageHeader eyebrow="Private, neighbor to neighbor" title="A small inbox." description="Conversations stay lightweight and local in this demo. No public profiles, no read receipts, no noise." /><section className="page-wrap pb-10"><div className="paper-card overflow-hidden grid md:grid-cols-[280px_minmax(0,1fr)] min-h-[500px]"><div className="border-b md:border-b-0 md:border-r border-border"><div className="p-4 border-b border-border flex items-center justify-between"><p className="eyebrow">Your conversations</p><button onClick={() => { setAsking(v => !v); setAskingWho(null); setOpener(''); }} aria-expanded={asking} className="p-2 rounded-lg hover:bg-secondary" aria-label="Ask a neighbour for a chat" data-testid="button-new-message"><Plus size={17} className={`transition-transform ${asking ? 'rotate-45' : ''}`} /></button></div>{asking && <AskPanel neighbours={canAsk} chosen={chosen} onChoose={setAskingWho} opener={opener} onOpener={setOpener} onSend={sendRequest} onCancel={() => { setAsking(false); setAskingWho(null); }} />}
{listed.map(thread => <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={`w-full text-left p-4 flex gap-3 border-b border-border ${selected?.id === thread.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`} data-testid={`button-thread-${thread.id}`}><Avatar initials={thread.initials} className="small" /><div className="min-w-0 flex-1"><p className="font-bold text-sm flex items-center gap-1.5">{thread.name}{thread.state === 'pending' && <Clock3 size={12} className="text-muted-foreground shrink-0" />}</p><p className="text-[11px] text-muted-foreground">{thread.pet}</p><p className={`text-xs mt-1 truncate ${thread.state === 'pending' ? 'italic text-muted-foreground' : ''}`}>{thread.preview}</p></div></button>)}</div><div ref={conversation} className="flex flex-col min-h-[500px]"><div className="p-4 md:p-5 border-b border-border flex items-center gap-3"><Avatar initials={selected.initials} className="small" /><div><h2 className="font-bold text-sm">{selected.name}</h2><p className="text-xs text-muted-foreground">{selected.pet} · neighborhood contact</p></div><span className="ml-auto tag"><ShieldCheck size={12} className="mr-1" />private</span></div><div className="flex-1 p-4 md:p-6 space-y-3 bg-background/40 overflow-y-auto max-h-[46vh] md:max-h-[52vh]" aria-live="polite">{selected.messages.map((message, i) => <div key={`${selected.id}-${i}`} className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`} data-testid={`message-${selected.id}-${i}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${message.from === 'me' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'}`}><p>{message.text}</p><p className={`text-[10px] mt-2 ${message.from === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{message.time}</p></div></div>)}<div ref={endOfMessages} /></div><div className="border-t border-border">{!open ? <PendingPanel thread={selected} onWithdraw={() => withdraw(selected)} /> : <>{verdict && verdict.level !== 'clean' && <div className={`px-3 md:px-4 pt-3 text-sm flex items-start gap-2.5 ${verdict.level === 'block' ? 'text-destructive' : 'text-muted-foreground'}`} role="alert" data-testid="notice-moderation">{verdict.level === 'block' ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : <Info size={16} className="shrink-0 mt-0.5 text-primary" />}<span>{verdict.reason}{verdict.level === 'warn' && <em className="not-italic block text-xs mt-1">Press send again to send it anyway.</em>}</span></div>}<form onSubmit={send} className="p-3 md:p-4 flex gap-2"><label htmlFor="message-compose" className="sr-only">Write a message</label><input id="message-compose" className="field" value={draft} onChange={e => { setDraft(e.target.value); if (verdict?.level === 'block') setVerdict(null); }} placeholder={`Message ${selected.name.split(' ')[0]}...`} data-testid="input-message-compose" /><button type="submit" disabled={checking} className="action-button button-primary !px-3 disabled:opacity-60" aria-label="Send message" data-testid="button-send-message"><Send size={17} /></button></form></>}</div></div></div></section></main>;
}


/** Choose a neighbour, write a hello, ask. */
function AskPanel({
  neighbours, chosen, onChoose, opener, onOpener, onSend, onCancel,
}: {
  neighbours: { id: string; name: string; initials: string; pet: string; detail: string }[];
  chosen: { id: string; name: string } | null;
  onChoose: (id: string) => void;
  opener: string;
  onOpener: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  if (neighbours.length === 0) {
    return (
      <div className="p-4 border-b border-border" data-testid="panel-ask-empty">
        <p className="text-sm">You have a conversation going with everyone in your circle.</p>
        <button onClick={onCancel} className="action-button button-quiet w-full mt-3 text-xs min-h-0 py-2">Close</button>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-border bg-secondary/40" data-testid="panel-ask">
      <p className="eyebrow mb-2.5">Ask someone for a chat</p>
      <div className="space-y-1.5">
        {neighbours.map((person) => (
          <button
            key={person.id}
            onClick={() => onChoose(person.id)}
            aria-pressed={chosen?.id === person.id}
            className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 ${chosen?.id === person.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            data-testid={`button-ask-${person.id}`}
          >
            <Avatar initials={person.initials} className="small" />
            <span className="min-w-0">
              <span className="block text-sm font-bold truncate">{person.name}</span>
              <span className={`block text-[11px] truncate ${chosen?.id === person.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {person.pet} · {person.detail}
              </span>
            </span>
          </button>
        ))}
      </div>

      {chosen && (
        <form
          className="mt-3"
          onSubmit={(e) => { e.preventDefault(); onSend(); }}
          data-testid="form-ask"
        >
          <label htmlFor="ask-opener" className="sr-only">Your hello</label>
          <textarea
            id="ask-opener"
            className="field min-h-20"
            value={opener}
            maxLength={OPENER_LIMIT}
            autoFocus
            onChange={(e) => onOpener(e.target.value)}
            placeholder={`Why you are saying hello to ${chosen.name.split(' ')[0]}...`}
            data-testid="input-ask-opener"
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            They see this before they decide. {OPENER_LIMIT - opener.length} characters left.
          </p>
          <div className="flex gap-2 mt-2.5">
            <button type="submit" className="action-button button-primary flex-1 text-xs min-h-0 py-2" data-testid="button-send-request">
              <UserPlus size={14} /> Ask {chosen.name.split(' ')[0]}
            </button>
            <button type="button" onClick={onCancel} className="action-button button-quiet text-xs min-h-0 py-2" data-testid="button-cancel-ask">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** A request that has not been answered. No compose box until it is. */
function PendingPanel({ thread, onWithdraw }: { thread: Thread; onWithdraw: () => void }) {
  return (
    <div className="p-4 md:p-5" data-testid="panel-pending">
      <p className="font-bold text-sm flex items-center gap-2">
        <Clock3 size={15} className="text-muted-foreground shrink-0" />
        Waiting for {thread.name.split(' ')[0]} to accept
      </p>
      {thread.opener && (
        <p className="prose-note text-muted-foreground mt-2">&ldquo;{thread.opener}&rdquo;</p>
      )}
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        You cannot message someone until they have said yes &mdash; that is what keeps an inbox from being
        somewhere strangers can put things. In this demo there is nobody on the other end, so the app answers
        for them in a few seconds.
      </p>
      <button onClick={onWithdraw} className="action-button button-quiet text-xs min-h-0 py-2 mt-3" data-testid="button-withdraw">
        Withdraw the request
      </button>
    </div>
  );
}

function NotFoundView() { return <main className="page-wrap py-24 text-center"><p className="eyebrow">404 · off the path</p><h1 className="serif text-5xl mt-3">That page wandered off.</h1><p className="text-muted-foreground mt-3">Let’s get you back to the neighborhood.</p><Link href="/" className="action-button button-primary mt-6" data-testid="link-back-home"><ChevronLeft size={16} /> Back home</Link></main>; }

function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }

function AppContent() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const { user } = useAuthUser();
  const signedInAs = (user as { primaryEmailAddress?: { emailAddress?: string } } | null)
    ?.primaryEmailAddress?.emailAddress ?? null;
  const [storedProfile, setStoredProfile] = useStored<PetProfile>(
    user?.id ? `pc_profile_${user.id}` : 'pc_profile_guest',
    defaultProfile,
  );
  const profile = useMemo(() => normalizeProfile(storedProfile), [storedProfile]);
  const setProfile = setStoredProfile;
  // Stable so children that depend on it are not re-created on every notice.
  const notify = useCallback((n: Notice) => setNotice(n), []);
  // wouter's `component={() => ...}` prop builds a NEW component type on every
  // render of this file, so any notice would unmount and remount the whole page
  // and throw away its state (a sent message, an open panel). The children form
  // keeps the same component identity across renders.
  return <Shell profile={profile} notice={notice} setNotice={setNotice}><RoutedErrorBoundary><Switch><Route path="/">{() => <Home notify={notify} profile={profile} />}</Route><Route path="/nearby">{() => <Nearby notify={notify} profile={profile} />}</Route><Route path="/walks">{() => <Walks notify={notify} />}</Route><Route path="/lost-pets">{() => <LostPets notify={notify} profile={profile} />}</Route><Route path="/lost-pets/:id">{(params: { id: string }) => <LostPetSearch caseId={params.id} notify={notify} />}</Route><Route path="/adopt">{() => <Adopt notify={notify} />}</Route><Route path="/shelters">{() => <Shelters notify={notify} />}</Route><Route path="/give">{() => <Give notify={notify} />}</Route><Route path="/messages">{() => <Messages notify={notify} />}</Route><Route path="/profile">{() => <Profile profile={profile} setProfile={setProfile} notify={notify} signedInAs={signedInAs} />}</Route><Route component={NotFoundView} /></Switch></RoutedErrorBoundary></Shell>;
}

function AccountsOff({ heading }: { heading: string }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
    <div className="paper-card max-w-md p-8 text-center">
      <ShieldCheck size={26} className="mx-auto text-primary mb-4" />
      <p className="eyebrow">Accounts are off</p>
      <h1 className="serif text-3xl mt-2">{heading}</h1>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">This copy is running without a Clerk publishable key, so there is nothing to sign in to. Everything else works — your profile, posts, saved pets and giving are kept in this browser.</p>
      <p className="text-xs text-muted-foreground mt-4">To turn accounts on, set <code className="mono">VITE_CLERK_PUBLISHABLE_KEY</code> and restart the dev server.</p>
      <Link href="/" className="action-button button-primary mt-6" data-testid="link-accounts-off-home"><ChevronLeft size={16} /> Back to the neighborhood</Link>
    </div>
  </div>;
}

function SignInPage() {
  if (!authEnabled) return <AccountsOff heading="No sign-in needed here." />;
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  if (!authEnabled) return <AccountsOff heading="Nothing to sign up for." />;
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#27624f',
    colorForeground: '#203a32',
    colorMutedForeground: '#63766e',
    colorDanger: '#b7524e',
    colorBackground: '#fffdf8',
    colorInput: '#f8f3e9',
    colorInputForeground: '#203a32',
    colorNeutral: '#d9d7cd',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf8] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#203a32] font-bold',
    headerSubtitle: 'text-[#63766e]',
    socialButtonsBlockButtonText: 'text-[#203a32]',
    formFieldLabel: 'text-[#203a32]',
    footerActionLink: 'text-[#27624f] font-bold',
    footerActionText: 'text-[#63766e]',
    dividerText: 'text-[#63766e]',
    identityPreviewEditButton: 'text-[#27624f]',
    formFieldSuccessText: 'text-[#27624f]',
    alertText: 'text-[#b7524e]',
    logoBox: 'mb-5',
    logoImage: 'w-12 h-12 rounded-2xl',
    socialButtonsBlockButton: 'border-[#d9d7cd] bg-[#f8f3e9]',
    formButtonPrimary: 'bg-[#27624f] hover:bg-[#1f503f] text-white',
    formFieldInput: 'border-[#d9d7cd] bg-[#f8f3e9] text-[#203a32]',
    footerAction: 'border-[#d9d7cd]',
    dividerLine: 'bg-[#d9d7cd]',
    alert: 'bg-[#fff0ed] border-[#f0c8c1]',
    otpCodeFieldInput: 'border-[#d9d7cd] bg-[#f8f3e9] text-[#203a32]',
    formFieldRow: 'mb-4',
    main: 'text-[#203a32]',
  },
};

const appRoutes = <QueryClientProvider client={queryClient}><Switch><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route component={AppContent} /></Switch></QueryClientProvider>;

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  // No key means no Clerk: rendering the provider anyway would throw and leave a blank page.
  if (!authEnabled) return appRoutes;
  return <ClerkProvider
    publishableKey={clerkPublishableKey as string}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to meet your neighborhood circle' } },
      signUp: { start: { title: 'Join your local circle', subtitle: 'Create a simple account for you and your pet' } },
    }}
    routerPush={(to) => setLocation(to.startsWith(basePath) ? to.slice(basePath.length) || '/' : to)}
    routerReplace={(to) => setLocation(to.startsWith(basePath) ? to.slice(basePath.length) || '/' : to, { replace: true })}
  >{appRoutes}</ClerkProvider>;
}

function AppCrashed({ error, resetError }: { error: Error; resetError: () => void }) {
  return <div className="min-h-[100dvh] grid place-items-center bg-background px-4">
    <div className="paper-card max-w-lg p-8 text-center">
      <AlertTriangle size={26} className="mx-auto text-destructive mb-4" />
      <p className="eyebrow">Something broke</p>
      <h1 className="serif text-3xl mt-2">That should not have happened.</h1>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">The app hit an error it could not recover from on its own. Reloading usually clears it.</p>
      <pre className="mono text-[11px] text-left bg-secondary rounded-lg p-3 mt-4 overflow-x-auto">{error.message}</pre>
      <div className="flex flex-wrap gap-2 justify-center mt-5">
        <button onClick={resetError} className="action-button button-primary" data-testid="button-app-retry">Try again</button>
        <button onClick={() => window.location.reload()} className="action-button button-quiet" data-testid="button-app-reload">Reload the page</button>
      </div>
    </div>
  </div>;
}

function App() {
  return <TooltipProvider><ErrorBoundary FallbackComponent={AppCrashed}><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter></ErrorBoundary><Toaster /></TooltipProvider>;
}

export default App;