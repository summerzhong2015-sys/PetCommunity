# PetCommunity on an iPhone

Two steps, and only the first one is done.

## Step one: on the phone now (done)

PetCommunity is installable. On an iPhone, open the site in **Safari**, tap
**Share**, then **Add to Home Screen**. It gets its own icon, opens without
Safari's address bar, fills the screen properly on a notched phone, and opens
on a bad signal — the last page you saw is cached, though shared totals and
alerts always come from the network, never a cache. A wrong number is worse
than a spinner.

It must be Safari. Chrome on iOS cannot install a web app; that is Apple's
rule, not a bug.

## Step two: the App Store (not started)

This is a real project, not a switch. Here is the honest shape of it.

**What it costs.** The Apple Developer Program is US$99 a year, billed
whether or not anything ships. Enrolling as an individual requires being of
the age of majority where you live; enrolling as a company needs a D-U-N-S
number, which is free but takes a week or two.

**What Apple will reject.** Guideline 4.2, Minimum Functionality, exists to
stop people shipping a website in a box. An app that only loads
petcommunity-mvp.vercel.app in a web view will be rejected, and that
rejection is routine rather than unlucky.

**So the app has to earn its place.** The usual route for a React app like
this one is [Capacitor](https://capacitorjs.com): the same code you already
have, in a native shell, plus real device features. The ones that would make
this app obviously worth installing:

- **Push notifications** when a pet goes missing near you. This is the one
  that matters. A lost-dog alert that arrives on a lock screen is a different
  product from one you find next time you open a tab.
- **Real location**, so "where you walk from" can offer your actual position
  instead of a pin you place by hand.
- **The camera**, for a photo of a found animal taken on the spot.
- **The share sheet**, for sending a poster to a neighbourhood group chat.

Build two or three of those properly and the app is not a wrapper any more.
Build none and it is, whatever the shell says.

**What else Apple asks for.** A privacy policy at a public URL. A filled-in
privacy nutrition label — and this app will need an account system before it
can answer those questions honestly, because right now anybody can post as
anybody. Accounts and moderation you can actually act on, because apps with
user-posted content need a way to report and block. Screenshots at several
sizes, an icon, a description, an age rating.

**And a Mac with Xcode**, which you have. Building and submitting an iOS app
is not possible from anywhere else.

## Honest order of work

1. Accounts, so a post belongs to somebody. Clerk is already wired into this
   project and needs only a key.
2. Reporting and blocking. Apple requires it; a neighbourhood app needs it
   anyway.
3. Capacitor shell, then push notifications, then location.
4. Developer Program, privacy policy, store listing, submit.

One to three is weeks of work rather than an afternoon, and worth doing in
that order even if the App Store never happens — every one of them makes the
web app better on its own.
