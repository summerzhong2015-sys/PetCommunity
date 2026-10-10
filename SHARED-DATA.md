# Turning on the shared copy

Everything in PetCommunity used to live in whichever browser it happened in: a
donation moved a total only for the person who made it, and a lost-pet alert
was only ever seen by the person who posted it. There is now one shared copy
that everybody reads and writes.

The app works either way. Until the store below exists, every write still lands
in your own browser and the pages say so in as many words — "Shared totals are
not switched on yet, so what you give stays in this browser." Nothing is
broken while it is not set up.

## What you need to do, once

1. Open the project in the Vercel dashboard.
2. **Storage → Create → Upstash Redis** (it is in the Marketplace list; the free
   tier is far more than this needs).
3. Connect it to this project, for Production and Preview.

That is the whole job. Vercel writes `KV_REST_API_URL` and `KV_REST_API_TOKEN`
into the project itself — this is the step that went wrong when it was done by
hand before, and connecting the store means nobody has to type a key anywhere.
Redeploy, and the pages switch from "this browser" to "everybody" on their own.

If the variables are named `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
instead, that works too — the function accepts either pair.

## What is shared, and what is not

Shared: posts and comments, donations and campaign totals, lost-pet alerts,
sightings and reunions.

Not shared, on purpose: your profile, your photo, your saved animals, your
drafts and your messages. Without real accounts, putting those on a server
would be a privacy mistake rather than a feature.

## Things worth knowing

- **There are no accounts.** Each browser gets a random id so the app can
  answer "was this mine?" for your giving history and your own posts. Clear
  your browser and you are a new neighbour. It is not a login, and anybody who
  can reach the site can post.
- **Two writes in the same instant** can lose one of the two: the function
  reads a list, appends, and writes it back. For a neighbourhood's worth of
  traffic that is a fair trade against the complexity of a transaction, and it
  is written down in `api/state.ts` rather than pretended away.
- **Other people's changes arrive within twenty seconds**, and immediately when
  you come back to the tab. It is polling, not a live socket — cheaper, and
  nobody here needs millisecond news.
- **Everything is capped**: field lengths, item size, and how many rows each
  collection keeps. The oldest fall off the end rather than the store growing
  without limit.
