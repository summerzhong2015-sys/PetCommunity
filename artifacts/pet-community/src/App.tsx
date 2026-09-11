import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertTriangle, ArrowRight, BellRing, Bookmark, CalendarDays, Check, CheckCircle2,
  ChevronLeft, Clock3, Dog, Footprints, Heart, House, Info, MapPin, Menu, MessageCircle,
  MessageSquare, Plus, Route as RouteIcon, Search, Send, ShieldCheck, Sparkles,
  UsersRound, X, PawPrint, HeartHandshake,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Avatar,
  EmptyState,
  PageHeader,
  readStored,
  useStored,
  type Notice,
} from '@/components/page-bits';
import { Adopt, Shelters } from '@/pages/adopt';
import { Give } from '@/pages/give';
import { LostPets } from '@/pages/lost-pets';
import { LostPetSearch } from '@/pages/lost-pet-search';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

type PetType = 'dog' | 'cat';
type PetProfile = { username: string; petName: string; petType: PetType };
type Post = { id: string; author: string; initials: string; petType?: PetType; time: string; title?: string; body: string; tag: string; likes: number; comments: string[]; accent: string; };
type Walk = { id: string; name: string; neighborhood: string; distance: string; duration: string; level: string; description: string; best: string; active: number; saved?: boolean; };
type EventItem = { id: string; title: string; date: string; time: string; place: string; host: string; note: string; attendees: number; rsvp: boolean; };
type Thread = { id: string; name: string; initials: string; pet: string; preview: string; messages: { from: 'them' | 'me'; text: string; time: string }[]; };
const defaultProfile: PetProfile = { username: 'Your neighbor', petName: 'Your pet', petType: 'dog' };

const defaultPosts: Post[] = [
  { id: 'p1', author: 'Maya Chen', initials: 'MC', time: '18 min ago', title: 'The tennis ball has been found', body: 'A sunny loop around Maple Park and Juniper is now officially tired. Thank you to whoever left the squeaky orange ball by the bench — Juniper says it was the highlight of her morning.', tag: 'Maple Park', likes: 14, comments: ['This made my morning. Give Juniper a scratch from us.'], accent: 'coral' },
  { id: 'p2', author: 'Theo Alvarez', initials: 'TA', time: '42 min ago', body: 'Heading down the creek path around 5:30 with Basil. We are doing a slow one today and have room for a couple of friendly stragglers.', tag: 'Out walking', likes: 9, comments: [], accent: 'ochre' },
  { id: 'p3', author: 'Nora Williams', initials: 'NW', time: '2 hr ago', title: 'Found: blue collar near Willow Gate', body: 'Small blue nylon collar, no tag. I left it with the park attendant at Willow Gate so it stays dry. Hope it finds its person.', tag: 'Kind find', likes: 21, comments: ['The owner was looking earlier — passing this along.'], accent: 'sage' },
];
const defaultWalks: Walk[] = [
  { id: 'w1', name: 'Creekside Loop', neighborhood: 'North Creek', distance: '2.8 km', duration: '35 min', level: 'Easy', description: 'A shady, mostly flat loop beside the creek with three wide spots for off-leash play. The south gate can get muddy after rain.', best: 'Early morning', active: 4 },
  { id: 'w2', name: 'Maple Park Circuit', neighborhood: 'Maple Park', distance: '1.6 km', duration: '20 min', level: 'Easy', description: 'A bright neighborhood circuit past the community garden and two water fountains. Great for a quick hello-heavy walk.', best: 'Lunch break', active: 7 },
  { id: 'w3', name: 'Hilltop Lookout', neighborhood: 'East Ridge', distance: '4.2 km', duration: '55 min', level: 'Rolling', description: 'A steady climb rewarded with a wide view over the neighborhood. Bring water; the last fountain is at the lower trailhead.', best: 'Golden hour', active: 2 },
];
const defaultEvents: EventItem[] = [
  { id: 'e1', title: 'Sunday sniffari', date: 'Sun, Jun 16', time: '9:00 AM', place: 'Maple Park, north gate', host: 'Maya C.', note: 'A gentle, no-rush loop for curious noses and their people.', attendees: 8, rsvp: false },
  { id: 'e2', title: 'Puppy patio hour', date: 'Thu, Jun 20', time: '6:15 PM', place: 'Fern & Finch courtyard', host: 'Theo A.', note: 'Small dogs and big feelings welcome. Water bowls provided.', attendees: 5, rsvp: true },
  { id: 'e3', title: 'Leash skills, together', date: 'Sat, Jun 22', time: '10:30 AM', place: 'Willow Gate lawn', host: 'Nora W.', note: 'Share what works, practice in parallel, leave with fewer tangles.', attendees: 12, rsvp: false },
];
const defaultThreads: Thread[] = [
  { id: 't1', name: 'Rowan Bell', initials: 'RB', pet: 'Pip · terrier', preview: 'Thank you for keeping an eye out.', messages: [{ from: 'them', text: 'Hi, I am Pip’s person. Thank you for keeping an eye out near Willow Gate.', time: '9:04 AM' }, { from: 'me', text: 'Of course. I will let you know if I see him on the creek path.', time: '9:11 AM' }] },
  { id: 't2', name: 'Camille Jones', initials: 'CJ', pet: 'Miso · tabby', preview: 'Miso likes the quiet side of the garden.', messages: [{ from: 'them', text: 'Miso likes the quiet side of the garden, just in case you spot her.', time: 'Yesterday' }] },
  { id: 't3', name: 'Theo Alvarez', initials: 'TA', pet: 'Basil · retriever mix', preview: 'Creekside at 5:30?', messages: [{ from: 'them', text: 'Creekside at 5:30?', time: 'Mon' }, { from: 'me', text: 'We will join for the first loop.', time: 'Mon' }] },
];


function PetAvatar({ type, className = '' }: { type: PetType; className?: string }) {
  return <img src={`${basePath}/pet-${type}.svg`} alt={`${type} profile`} className={`pet-avatar ${className}`} />;
}

/** `mobile` marks the five that fit in the bottom bar on a phone. */
const navItems = [
  { href: '/', label: 'Neighborhood', icon: House, mobile: true },
  { href: '/nearby', label: 'Nearby', icon: UsersRound, mobile: false },
  { href: '/walks', label: 'Walks', icon: Footprints, mobile: false },
  { href: '/events', label: 'Events', icon: CalendarDays, mobile: false },
  { href: '/lost-pets', label: 'Lost pets', icon: BellRing, mobile: true },
  { href: '/adopt', label: 'Adopt', icon: PawPrint, mobile: true },
  { href: '/give', label: 'Give', icon: HeartHandshake, mobile: true },
  { href: '/messages', label: 'Messages', icon: MessageCircle, mobile: true },
];

function Shell({ children, notice, setNotice, profile }: { children: ReactNode; notice: Notice | null; setNotice: (n: Notice | null) => void; profile: PetProfile }) {
  const [location] = useLocation();
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);
  return (
    <div className="app-shell md:flex">
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 bg-sidebar text-sidebar-foreground p-5">
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-9" data-testid="link-brand">
          <span className="grid place-items-center w-10 h-10 rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground"><Dog size={22} /></span>
          <span><strong className="serif text-xl tracking-tight">PetCommunity</strong><span className="block mono text-[9px] uppercase tracking-[.16em] opacity-55">Your local circle</span></span>
        </Link>
        <p className="eyebrow text-sidebar-foreground/50 px-3 mb-3">Find your people</p>
        <nav aria-label="Main navigation" className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-link ${active(href) ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Lost pets' && <span className="ml-auto w-2 h-2 rounded-full bg-sidebar-primary" />}</Link>)}
        </nav>
        <div className="mt-auto">
          {isSignedIn ? <div className="rounded-2xl bg-sidebar-accent p-3 mb-3 flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1" data-testid="link-sidebar-profile">
              <PetAvatar type={profile.petType} className="small" />
              <span className="min-w-0"><strong className="block text-sm truncate">{profile.username}</strong><span className="block text-[11px] text-sidebar-foreground/60 truncate">{profile.petName} · {profile.petType}</span></span>
            </Link>
            <button type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1.5 rounded-lg" aria-label="Sign out" data-testid="button-sign-out"><ArrowRight size={15} className="rotate-180" /></button>
          </div> : <Link href="/sign-in" className="rounded-2xl bg-sidebar-accent p-3 mb-3 flex items-center gap-3 hover:bg-sidebar-accent/80" data-testid="link-sidebar-sign-in">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-sidebar-primary/15 text-sidebar-primary"><Dog size={18} /></span>
            <span><strong className="block text-sm">Set up your pet profile</strong><span className="block text-[11px] text-sidebar-foreground/60 mt-0.5">Sign in to get started</span></span>
          </Link>}
          <div className="rounded-2xl bg-sidebar-accent p-4">
          <ShieldCheck size={19} className="text-sidebar-primary mb-3" />
          <p className="font-bold text-sm">Privacy, by default.</p>
          <p className="text-xs leading-relaxed text-sidebar-foreground/60 mt-1">Use a neighborhood name, not a legal one. Share only what helps.</p>
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        <header className="sticky top-0 z-20 md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/90 backdrop-blur">
          <Link href="/" className="flex items-center gap-2" data-testid="link-mobile-brand"><span className="grid place-items-center w-8 h-8 rounded-xl bg-primary text-primary-foreground"><Dog size={17} /></span><strong className="serif text-lg">PetCommunity</strong></Link>
          {isSignedIn ? <Link href="/profile" className="p-1 rounded-xl" aria-label="Open your pet profile" data-testid="link-mobile-profile"><PetAvatar type={profile.petType} className="small" /></Link> : <Link href="/sign-in" className="text-xs font-bold text-primary px-2 py-2" data-testid="link-mobile-sign-in">Sign in</Link>}
        </header>
        {children}
      </div>
      <nav className="fixed z-30 bottom-0 inset-x-0 md:hidden bg-card/95 backdrop-blur border-t border-border grid grid-cols-5 px-1 py-2" aria-label="Mobile navigation">
        {navItems.filter(item => item.mobile).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`mobile-nav-link ${active(href) ? 'active' : ''}`} data-testid={`link-mobile-${label.toLowerCase().replace(' ', '-')}`}><Icon size={19} strokeWidth={active(href) ? 2.5 : 1.8} /><span>{label === 'Neighborhood' ? 'Home' : label}</span></Link>)}
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
  const filtered = useMemo(() => filter === 'Lost pets' ? posts.filter(p => p.tag.toLowerCase().includes('lost')) : filter === 'Nearby' ? posts.filter(p => ['Maple Park', 'Out walking'].includes(p.tag)) : posts, [filter, posts]);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 180); return () => window.clearTimeout(timer); }, []);
  const addPost = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) { notify({ tone: 'error', text: 'Write a little something before posting.' }); return; }
     const newPost: Post = { id: `p-${Date.now()}`, author: profile.username, initials: profile.username.slice(0, 2).toUpperCase(), petType: profile.petType, time: 'Just now', body: draft.trim(), tag: 'Your neighborhood', likes: 0, comments: [], accent: 'sage' };
    setPosts(current => [newPost, ...current]); setDraft(''); setComposerOpen(false); notify({ tone: 'success', text: 'Posted to your neighborhood.' });
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
     {composerOpen && <form onSubmit={addPost} className="paper-card p-4 reveal" data-testid="form-create-post"><div className="flex gap-3"><PetAvatar type={profile.petType} /><div className="flex-1"><label htmlFor="post-body" className="sr-only">Post to your neighborhood</label><textarea id="post-body" className="field min-h-24 resize-y" autoFocus value={draft} onChange={e => setDraft(e.target.value)} placeholder="Share a small neighborhood update..." data-testid="input-post-body" /><div className="flex justify-end gap-2 mt-3"><button type="button" className="action-button button-quiet" onClick={() => setComposerOpen(false)} data-testid="button-cancel-post">Cancel</button><button type="submit" className="action-button button-primary" data-testid="button-submit-post">Publish post</button></div></div></div></form>}
        {loading ? <div className="space-y-4" role="status" aria-label="Loading neighborhood activity" data-testid="status-loading-feed">{[1, 2, 3].map(item => <div key={item} className="paper-card p-5" aria-hidden="true"><div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-full" /><div className="flex-1 space-y-3"><div className="skeleton h-3 w-32" /><div className="skeleton h-3 w-20" /><div className="skeleton h-16 w-full mt-5" /></div></div></div>)}</div> : filtered.length === 0 ? <EmptyState title="A quiet corner for now" copy="No lost-pet posts in this filter. If you spot something, sharing quickly can make a real difference." icon={BellRing} /> : filtered.map((post, index) => {
          const postComments = [...post.comments, ...(comments[post.id] || [])];
          return <article key={post.id} className={`paper-card p-5 reveal reveal-delay-${Math.min(index + 1, 3)}`} data-testid={`card-post-${post.id}`}>
             <div className="flex gap-3">{post.petType ? <PetAvatar type={post.petType} /> : <Avatar initials={post.initials} />}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-sm" data-testid={`text-post-author-${post.id}`}>{post.author}</p><p className="text-xs text-muted-foreground mt-0.5">{post.time} <span className="mx-1">·</span> neighbors only</p></div><button onClick={() => notify({ tone: 'info', text: 'Posts are shared only with your local circle.' })} className="text-muted-foreground p-1" aria-label={`More options for ${post.author}`} data-testid={`button-post-more-${post.id}`}><span className="text-lg leading-none">···</span></button></div>
              {post.title && <h2 className="serif text-xl mt-4">{post.title}</h2>}<p className="text-sm leading-relaxed mt-2">{post.body}</p><span className="tag mt-4">{post.tag}</span>
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

function Nearby({ notify }: { notify: (n: Notice) => void }) {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const people = [{ id: 'mara', name: 'Mara Singh', initials: 'MS', pet: 'Clover', detail: 'Border collie · 4 years', distance: '0.3 km', note: 'Usually exploring the garden loop', color: 'bg-[#d8e3c8]' }, { id: 'theo', name: 'Theo Alvarez', initials: 'TA', pet: 'Basil', detail: 'Retriever mix · 2 years', distance: '0.7 km', note: 'Out walking until 6:15 today', color: 'bg-[#f2d9a7]' }, { id: 'nora', name: 'Nora Williams', initials: 'NW', pet: 'Penny', detail: 'Corgi · 6 years', distance: '1.1 km', note: 'Knows every shady bench', color: 'bg-[#e7c7bd]' }, { id: 'camille', name: 'Camille Jones', initials: 'CJ', pet: 'Miso', detail: 'Orange tabby · 3 years', distance: '1.8 km', note: 'Quiet garden side enthusiast', color: 'bg-[#d4dfe3]' }];
  const chosen = people.find(p => p.id === selected);
  const startMessage = (name: string, pet: string) => { localStorage.setItem('pc_draft', `Hi ${name.split(' ')[0]} — I’m a neighbor and would love to say hello to ${pet}.`); setLocation('/messages'); };
  return <main><PageHeader eyebrow="Your 2 km circle" title={<>Familiar faces,<br /><em className="text-primary not-italic">four paws at a time.</em></>} description="Discover the people and pets who make the routes around you feel like home. Approximate distance only." action={<button className="action-button button-quiet" onClick={() => notify({ tone: 'info', text: 'Maple Park is your current neighborhood circle.' })} data-testid="button-nearby-filter"><MapPin size={16} /> Maple Park <span className="text-muted-foreground">⌄</span></button>} />
    <section className="page-wrap pb-10"><div className="flex items-center gap-2 mb-5"><span className="tag bg-primary/10 text-primary"><span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />18 active now</span><span className="text-xs text-muted-foreground">No precise locations are shown</span></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{people.map((person, i) => <button key={person.id} onClick={() => setSelected(person.id)} className={`paper-card text-left p-5 ${selected === person.id ? 'ring-2 ring-primary' : ''} reveal reveal-delay-${Math.min(i + 1, 3)}`} data-testid={`card-neighbor-${person.id}`}><div className="flex items-start justify-between"><Avatar initials={person.initials} /><span className="tag">{person.distance}</span></div><h2 className="serif text-2xl mt-5">{person.name}</h2><p className="text-sm font-semibold mt-1">{person.pet}</p><p className="text-xs text-muted-foreground mt-1">{person.detail}</p><div className={`rounded-xl ${person.color} mt-5 px-3 py-3 text-xs text-foreground/75 flex gap-2`}><Footprints size={14} className="shrink-0" />{person.note}</div><span className="flex items-center justify-between mt-5 text-xs font-bold text-primary">View neighbor <ArrowRight size={15} /></span></button>)}</div>
      {chosen && <div className="paper-card mt-6 p-5 md:p-7 reveal" data-testid={`panel-neighbor-detail-${chosen.id}`}><div className="flex justify-between items-start"><div className="flex gap-3 items-center"><Avatar initials={chosen.initials} /><div><p className="eyebrow">{chosen.distance} away</p><h2 className="serif text-2xl">{chosen.name} & {chosen.pet}</h2></div></div><button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close neighbor details" data-testid="button-close-neighbor"><X size={18} /></button></div><p className="text-sm text-muted-foreground mt-5 max-w-xl">You are both in the Maple Park circle. PetCommunity keeps the introduction light: no last names, addresses, or personal profiles required.</p><div className="flex flex-wrap gap-2 mt-4"><span className="tag">Friendly introduction</span><span className="tag">Approximate distance</span><span className="tag">Neighborhood only</span></div><button onClick={() => startMessage(chosen.name, chosen.pet)} className="action-button button-primary mt-6" data-testid={`button-message-neighbor-${chosen.id}`}><MessageCircle size={16} /> Draft a friendly hello</button></div>}
    </section>
  </main>;
}

function Walks({ notify }: { notify: (n: Notice) => void }) {
  const [walks, setWalks] = useStored<Walk[]>('pc_walks', defaultWalks);
  const [selected, setSelected] = useState<string | null>(null);
  const chosen = walks.find(w => w.id === selected);
  return <main><PageHeader eyebrow="Go at your own pace" title={<>Routes with a<br /><em className="text-primary not-italic">little local lore.</em></>} description="Familiar loops, honest details, and a peek at who is out there now. Save a route for the next good-weather window." /><section className="page-wrap pb-10"><div className="grid lg:grid-cols-3 gap-4">{walks.map((walk, i) => <article key={walk.id} className={`paper-card overflow-hidden reveal reveal-delay-${Math.min(i + 1, 3)}`} data-testid={`card-walk-${walk.id}`}><div className={`h-32 relative ${i === 0 ? 'bg-[#b8cdb9]' : i === 1 ? 'bg-[#e4c988]' : 'bg-[#c9d8d4]'}`}><div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(135deg, transparent 45%, hsl(158 35% 29% / .25) 46%, transparent 48%), linear-gradient(25deg, transparent 55%, hsl(42 32% 96% / .6) 56%, transparent 58%)', backgroundSize: '44px 44px' }} /><span className="absolute top-4 left-4 tag bg-card/80">{walk.level}</span><button onClick={() => { setWalks(current => current.map(w => w.id === walk.id ? { ...w, saved: !w.saved } : w)); notify({ tone: 'success', text: walk.saved ? 'Route removed from your saved walks.' : 'Route saved for later.' }); }} className={`absolute top-3 right-3 grid place-items-center w-9 h-9 rounded-full ${walk.saved ? 'bg-accent text-accent-foreground' : 'bg-card/85'}`} aria-label={`${walk.saved ? 'Unsave' : 'Save'} ${walk.name}`} data-testid={`button-save-walk-${walk.id}`}><Bookmark size={16} fill={walk.saved ? 'currentColor' : 'none'} /></button><RouteIcon className="absolute bottom-4 right-5 text-primary/70" size={43} strokeWidth={1.2} /></div><div className="p-5"><p className="eyebrow">{walk.neighborhood}</p><h2 className="serif text-2xl mt-1">{walk.name}</h2><div className="flex gap-4 text-xs text-muted-foreground mt-3"><span className="inline-flex items-center gap-1"><RouteIcon size={13} />{walk.distance}</span><span className="inline-flex items-center gap-1"><Clock3 size={13} />{walk.duration}</span></div><p className="text-sm leading-relaxed mt-4">{walk.description}</p><div className="flex items-center justify-between mt-5 pt-4 border-t border-border"><span className="text-xs text-muted-foreground"><strong className="text-primary">{walk.active}</strong> out now</span><button onClick={() => setSelected(walk.id)} className="text-xs font-bold text-primary inline-flex items-center gap-1" data-testid={`button-open-walk-${walk.id}`}>Route details <ArrowRight size={14} /></button></div></div></article>)}</div>{chosen && <div className="paper-card mt-6 p-6 reveal" data-testid="panel-walk-details"><div className="flex justify-between items-start"><div><p className="eyebrow">{chosen.neighborhood} · route notes</p><h2 className="serif text-3xl mt-1">{chosen.name}</h2></div><button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close route details" data-testid="button-close-walk"><X size={18} /></button></div><div className="grid md:grid-cols-3 gap-5 mt-6"><div><p className="eyebrow">The shape</p><p className="text-sm mt-1">{chosen.distance} / {chosen.duration} / {chosen.level}</p></div><div><p className="eyebrow">Best window</p><p className="text-sm mt-1">{chosen.best}</p></div><div><p className="eyebrow">Active neighbors</p><p className="text-sm mt-1 flex items-center gap-2"><UsersRound size={15} className="text-primary" />{chosen.active} people are out nearby</p></div></div><button className="action-button button-primary mt-6" onClick={() => notify({ tone: 'info', text: `You are marked as interested in ${chosen.name}.` })} data-testid="button-join-walk"><Footprints size={16} /> I’m heading there</button></div>}</section></main>;
}

function Events({ notify }: { notify: (n: Notice) => void }) {
  const [events, setEvents] = useStored<EventItem[]>('pc_events', defaultEvents);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '', place: '', note: '' });
  const addEvent = (e: FormEvent) => { e.preventDefault(); if (!form.title || !form.date || !form.time || !form.place) { notify({ tone: 'error', text: 'Add a title, date, time, and place to create an event.' }); return; } setEvents(current => [...current, { id: `e-${Date.now()}`, ...form, date: new Date(`${form.date}T12:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), host: 'You', attendees: 1, rsvp: true }]); setForm({ title: '', date: '', time: '', place: '', note: '' }); setCreateOpen(false); notify({ tone: 'success', text: 'Event created for your neighborhood.' }); };
  return <main><PageHeader eyebrow="Small plans, good company" title={<>There is always room<br />for one more <em className="text-primary not-italic">friend.</em></>} description="Make a low-key plan, find a familiar face, or RSVP to something that sounds like your kind of Saturday." action={<button className="action-button button-accent" onClick={() => setCreateOpen(v => !v)} data-testid="button-create-event"><Plus size={17} /> Create an event</button>} /><section className="page-wrap pb-10">{createOpen && <form onSubmit={addEvent} className="paper-card p-5 md:p-6 mb-6 reveal" data-testid="form-create-event"><div className="flex items-start justify-between"><div><p className="eyebrow">New neighborhood plan</p><h2 className="serif text-2xl mt-1">Keep it simple.</h2></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Close create event form" data-testid="button-close-event-form"><X size={18} /></button></div><div className="grid sm:grid-cols-2 gap-3 mt-5"><label className="text-xs font-bold">Event name<input className="field mt-1" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Morning garden loop" data-testid="input-event-title" /></label><label className="text-xs font-bold">Date<input type="date" className="field mt-1" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} data-testid="input-event-date" /></label><label className="text-xs font-bold">Time<input type="text" className="field mt-1" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="9:30 AM" data-testid="input-event-time" /></label><label className="text-xs font-bold">Place<input className="field mt-1" value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} placeholder="Maple Park, south gate" data-testid="input-event-place" /></label></div><label className="block text-xs font-bold mt-3">A note for neighbors<textarea className="field mt-1 min-h-20" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="What should people know?" data-testid="input-event-note" /></label><div className="flex justify-end mt-4"><button type="submit" className="action-button button-primary" data-testid="button-submit-event">Publish event <ArrowRight size={16} /></button></div></form>}<div className="flex items-center gap-3 mb-5"><span className="tag">This week</span><span className="text-xs text-muted-foreground">{events.length} plans in the circle</span></div><div className="space-y-3">{events.map((event, i) => <article key={event.id} className={`paper-card p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-5 reveal reveal-delay-${Math.min(i + 1, 3)}`} data-testid={`card-event-${event.id}`}><div className="md:w-24 shrink-0"><p className="eyebrow text-primary">{event.date.split(',')[0]}</p><p className="serif text-2xl mt-1">{event.date.split(',').slice(1).join(',')}</p><p className="mono text-[10px] text-muted-foreground mt-1">{event.time}</p></div><div className="hidden md:block w-px h-16 bg-border" /><div className="flex-1"><h2 className="serif text-2xl">{event.title}</h2><p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin size={13} />{event.place} <span className="mx-1">·</span> hosted by {event.host}</p><p className="text-sm mt-3 leading-relaxed">{event.note}</p><p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><UsersRound size={13} />{event.attendees} neighbor{event.attendees === 1 ? '' : 's'} joining</p></div><button onClick={() => { setEvents(current => current.map(item => item.id === event.id ? { ...item, rsvp: !item.rsvp, attendees: item.attendees + (item.rsvp ? -1 : 1) } : item)); notify({ tone: 'success', text: event.rsvp ? 'RSVP removed.' : 'You are on the list.' }); }} className={`action-button shrink-0 ${event.rsvp ? 'button-accent' : 'button-quiet'}`} data-testid={`button-rsvp-event-${event.id}`}>{event.rsvp ? <><Check size={16} /> Going</> : 'I’m interested'}</button></article>)}</div></section></main>;
}


function Messages({ notify }: { notify: (n: Notice) => void }) {
  const [threads, setThreads] = useStored<Thread[]>('pc_threads', defaultThreads);
  const [selectedId, setSelectedId] = useState('t1');
  const [draft, setDraft] = useState(() => { const value = localStorage.getItem('pc_draft') || ''; localStorage.removeItem('pc_draft'); return value; });
  const selected = threads.find(t => t.id === selectedId) || threads[0];
  const send = (e: FormEvent) => { e.preventDefault(); if (!draft.trim()) return; const message = { from: 'me' as const, text: draft.trim(), time: 'Just now' }; setThreads(current => current.map(thread => thread.id === selected.id ? { ...thread, preview: message.text, messages: [...thread.messages, message] } : thread)); setDraft(''); notify({ tone: 'success', text: 'Message sent in your local inbox.' }); };
  return <main className="min-h-[calc(100dvh-4rem)]"><PageHeader eyebrow="Private, neighbor to neighbor" title="A small inbox." description="Conversations stay lightweight and local in this demo. No public profiles, no read receipts, no noise." /><section className="page-wrap pb-10"><div className="paper-card overflow-hidden grid md:grid-cols-[280px_minmax(0,1fr)] min-h-[500px]"><div className="border-b md:border-b-0 md:border-r border-border"><div className="p-4 border-b border-border flex items-center justify-between"><p className="eyebrow">Your conversations</p><button onClick={() => notify({ tone: 'info', text: 'Choose a nearby neighbor to start a private hello.' })} className="p-2 rounded-lg hover:bg-secondary" aria-label="Start a new message" data-testid="button-new-message"><Plus size={17} /></button></div>{threads.map(thread => <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={`w-full text-left p-4 flex gap-3 border-b border-border ${selectedId === thread.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`} data-testid={`button-thread-${thread.id}`}><Avatar initials={thread.initials} className="small" /><div className="min-w-0"><p className="font-bold text-sm">{thread.name}</p><p className="text-[11px] text-muted-foreground">{thread.pet}</p><p className="text-xs mt-1 truncate">{thread.preview}</p></div></button>)}</div><div className="flex flex-col min-h-[500px]"><div className="p-4 md:p-5 border-b border-border flex items-center gap-3"><Avatar initials={selected.initials} className="small" /><div><h2 className="font-bold text-sm">{selected.name}</h2><p className="text-xs text-muted-foreground">{selected.pet} · neighborhood contact</p></div><span className="ml-auto tag"><ShieldCheck size={12} className="mr-1" />private</span></div><div className="flex-1 p-4 md:p-6 space-y-3 bg-background/40" aria-live="polite">{selected.messages.map((message, i) => <div key={`${selected.id}-${i}`} className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`} data-testid={`message-${selected.id}-${i}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${message.from === 'me' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'}`}><p>{message.text}</p><p className={`text-[10px] mt-2 ${message.from === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{message.time}</p></div></div>)}</div><form onSubmit={send} className="p-3 md:p-4 border-t border-border flex gap-2"><label htmlFor="message-compose" className="sr-only">Write a message</label><input id="message-compose" className="field" value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Message ${selected.name.split(' ')[0]}...`} data-testid="input-message-compose" /><button type="submit" className="action-button button-primary !px-3" aria-label="Send message" data-testid="button-send-message"><Send size={17} /></button></form></div></div></section></main>;
}

function Profile({ profile, setProfile, notify }: { profile: PetProfile; setProfile: (value: PetProfile) => void; notify: (n: Notice) => void }) {
  const { isSignedIn, user } = useUser();
  const [form, setForm] = useState<PetProfile>(profile);
  useEffect(() => setForm(profile), [profile]);

  if (!isSignedIn) {
    return <main className="page-wrap py-16 md:py-24"><div className="paper-card max-w-2xl mx-auto p-6 md:p-10 text-center"><PetAvatar type="dog" className="large mx-auto" /><p className="eyebrow mt-6">Your neighborhood identity</p><h1 className="serif text-4xl mt-2">Make it easy to say hello.</h1><p className="text-sm text-muted-foreground max-w-md mx-auto mt-3 leading-relaxed">Sign in to create a simple username and choose the pet portrait neighbors will recognize.</p><Link href="/sign-in" className="action-button button-primary mt-6" data-testid="link-profile-sign-in">Sign in to set up your profile <ArrowRight size={16} /></Link></div></main>;
  }

  const save = (event: FormEvent) => {
    event.preventDefault();
    const username = form.username.trim();
    const petName = form.petName.trim();
    if (!username || !petName) {
      notify({ tone: 'error', text: 'Add a username and your pet’s name before saving.' });
      return;
    }
    setProfile({ ...form, username, petName });
    notify({ tone: 'success', text: 'Your pet profile is ready for the neighborhood.' });
  };

  return <main><PageHeader eyebrow="Your place in the circle" title={<>A profile made for<br /><em className="text-primary not-italic">four-legged hellos.</em></>} description="Choose what neighbors see when you post or say hello. Keep it simple: one username and one pet portrait." /><section className="page-wrap pb-10"><div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 max-w-5xl"><form onSubmit={save} className="paper-card p-5 md:p-7" data-testid="form-profile"><div className="flex items-center gap-4 pb-6 border-b border-border"><PetAvatar type={form.petType} className="large" /><div><p className="eyebrow">Your profile preview</p><h2 className="serif text-2xl mt-1">{form.username || 'Your username'}</h2><p className="text-sm text-muted-foreground mt-1">{form.petName || 'Your pet'} · {form.petType}</p></div></div><div className="mt-6 space-y-4"><label className="block text-xs font-bold">Simple username <span className="text-destructive">*</span><input className="field mt-1" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="MapleParkMaya" maxLength={24} data-testid="input-profile-username" /><span className="block text-[11px] text-muted-foreground font-normal mt-1">Use a nickname or neighborhood name. No last name needed.</span></label><label className="block text-xs font-bold">Pet’s name <span className="text-destructive">*</span><input className="field mt-1" value={form.petName} onChange={e => setForm({ ...form, petName: e.target.value })} placeholder="Juniper" maxLength={24} data-testid="input-profile-pet-name" /></label><fieldset><legend className="text-xs font-bold mb-2">Choose a pet portrait</legend><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setForm({ ...form, petType: 'dog' })} className={`pet-choice ${form.petType === 'dog' ? 'selected' : ''}`} aria-pressed={form.petType === 'dog'} data-testid="button-profile-dog"><PetAvatar type="dog" className="medium" /><span><strong>Dog</strong><small>Park explorer</small></span><span className="pet-choice-check">{form.petType === 'dog' ? <Check size={14} /> : null}</span></button><button type="button" onClick={() => setForm({ ...form, petType: 'cat' })} className={`pet-choice ${form.petType === 'cat' ? 'selected' : ''}`} aria-pressed={form.petType === 'cat'} data-testid="button-profile-cat"><PetAvatar type="cat" className="medium" /><span><strong>Cat</strong><small>Window watcher</small></span><span className="pet-choice-check">{form.petType === 'cat' ? <Check size={14} /> : null}</span></button></div></fieldset></div><div className="flex flex-wrap items-center justify-between gap-3 mt-7 pt-5 border-t border-border"><p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary" />Your email stays private.</p><button type="submit" className="action-button button-primary" data-testid="button-save-profile">Save pet profile <Check size={16} /></button></div></form><aside className="paper-card p-5 h-fit"><p className="eyebrow">Signed in as</p><p className="font-bold mt-2 break-all">{user?.primaryEmailAddress?.emailAddress || 'Your PetCommunity account'}</p><p className="text-xs text-muted-foreground leading-relaxed mt-3">Your sign-in keeps your profile attached to your account. The neighborhood only sees the username and pet portrait you choose.</p><div className="mt-5 pt-4 border-t border-border flex items-start gap-2 text-xs text-muted-foreground"><Info size={14} className="text-primary shrink-0" />Profile details are saved on this device in this MVP.</div></aside></div></section></main>;
}

function NotFoundView() { return <main className="page-wrap py-24 text-center"><p className="eyebrow">404 · off the path</p><h1 className="serif text-5xl mt-3">That page wandered off.</h1><p className="text-muted-foreground mt-3">Let’s get you back to the neighborhood.</p><Link href="/" className="action-button button-primary mt-6" data-testid="link-back-home"><ChevronLeft size={16} /> Back home</Link></main>; }

function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }

function AppContent() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const { user } = useUser();
  const [profile, setProfile] = useStored<PetProfile>(user?.id ? `pc_profile_${user.id}` : 'pc_profile_guest', defaultProfile);
  const notify = (n: Notice) => setNotice(n);
  return <Shell profile={profile} notice={notice} setNotice={setNotice}><RoutedErrorBoundary><Switch><Route path="/" component={() => <Home notify={notify} profile={profile} />} /><Route path="/nearby" component={() => <Nearby notify={notify} />} /><Route path="/walks" component={() => <Walks notify={notify} />} /><Route path="/events" component={() => <Events notify={notify} />} /><Route path="/lost-pets" component={() => <LostPets notify={notify} />} /><Route path="/lost-pets/:id">{(params: { id: string }) => <LostPetSearch caseId={params.id} notify={notify} />}</Route><Route path="/adopt" component={() => <Adopt notify={notify} />} /><Route path="/shelters" component={() => <Shelters notify={notify} />} /><Route path="/give" component={() => <Give notify={notify} />} /><Route path="/messages" component={() => <Messages notify={notify} />} /><Route path="/profile" component={() => <Profile profile={profile} setProfile={setProfile} notify={notify} />} /><Route component={NotFoundView} /></Switch></RoutedErrorBoundary></Shell>;
}

function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
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
  ><QueryClientProvider client={queryClient}><Switch><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route component={AppContent} /></Switch></QueryClientProvider></ClerkProvider>;
}

function App() {
  return <TooltipProvider><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter><Toaster /></TooltipProvider>;
}

export default App;