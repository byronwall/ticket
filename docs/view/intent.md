# tk view: intent

`tk view` is a local, read-only picture of a project's `.tickets/` folder. I run
it next to an agent that is working through tickets, and I want to answer a few
questions at a glance: what is in progress, what can start next, what is
blocked on what, and which epic a piece of work belongs to. When I find the
ticket I care about, I want to read it and hand it to an agent without leaving
the page.

The reference project is `evidence-first-resume-studio`, which has 64 tickets
across 9 epics. That is a realistic size. Twelve open tickets is the everyday
view; all 64 with closed epics turned on is the stress case. Every decision
below was checked against both.

## What it is not

It is not an editor. The files are the source of truth, and agents and people
change them with `tk`. The page polls once a second and redraws what changed.
It never writes.

It is also not an app with a build step. The plugin is one Python file using the
standard library, with the HTML, CSS and JavaScript inline. That constraint is
deliberate. If a feature needs a framework or a bundler, it probably belongs
somewhere else.

## The feel

This is a working tool, not a showcase. The page should feel dense, quiet and
precise, closer to a good diff viewer than a dashboard. Color carries meaning or
it doesn't show up.

- **Epic** is the one categorical color. It tints each card's border and shows
  as a small dot next to the ID. The legend uses the same dot, with a count of
  visible tickets per epic. Ten palette entries cover the 9 epics without
  repeats.
- **In progress** gets a warm amber background. This is the one thing I want to
  see even when zoomed all the way out, and a small status dot disappears at 30%
  zoom. A filled card doesn't.
- **Status** otherwise uses a small marker: a hollow ring for open, blue for
  ready, filled amber for in progress, filled gray for closed. Closed cards sit
  on a muted background so they recede without vanishing.
- **Type** is the system font at a small set of sizes. Monospace is used only for
  ticket IDs, since those are identifiers you copy and search for.

No gradients, no glass, no decorative shadows. Cards have a 1px border and a
very soft drop shadow. The selected card gets a solid blue ring.

## The graph

### Nodes

Cards are 240×104 with a 14px title that can run to four lines. An earlier
version used 220×70 cards with two-line titles. Those were denser on paper, but
the text was unreadable at the zoom level you actually end up at, and the short
cards made the graph even wider. The top row of each card is the epic dot, ID,
status and priority. Everything else is title.

### Layout

Columns are dependency depth: a ticket sits one column to the right of its
deepest dependency. Within a column, tickets are grouped by epic, then sorted by
ID. That grouping keeps related work together without inventing any extra
ordering rules.

Positions are stable. The layout only recomputes when the set of visible
tickets, their dependencies, their epics or the number of bands changes. A
status change or an edit to the body redraws the card in place. This matters
more than any single layout choice, because the page updates while I am looking
at it. If cards jumped around every time an agent closed a ticket, the view
would be useless.

### Matching the viewport

Dependency chains make graphs wide. The 12-ticket view is a 7-column chain, and
at full width it fit at about 48% zoom with most of the screen empty above and
below. The aspect ratio was working against the screen.

So the columns wrap. The layout estimates the width-to-height ratio for 1, 2,
3… bands and compares each with the graph panel's shape. It only wraps when a
single band is off by more than 35%. When it wraps, it picks the band count that
comes closest to the panel's shape, and it splits the columns evenly. Seven
columns become 3 + 2 + 2, never 3 + 3 + 1, because a band holding one lonely
node looks like a bug. The 12-ticket view now fits at 92% in two bands. The full
64-ticket graph is already roughly the panel's shape and stays in one band.

The band count is chosen again when the window or inspector is resized. The
page re-lays out only if the count changes.

### Edges

Edges are orthogonal: horizontal out of the source, vertical in a gap between
columns, horizontal into the target. Every gap between columns has lanes, and
each edge gets its own lane, so parallel edges never draw on top of each other.

The rule I care most about is that an edge should never detour around something
that isn't there. The first version sent every edge that skipped a column
through a track under the whole graph, and it looked like edges were avoiding
obstacles that didn't exist. Now an edge that skips columns takes the first of
these that works:

1. Straight across at the source's height, if no card is in the way.
2. Straight across at the target's height.
3. Through the nearest gap between rows. Rows line up across all columns, so
   those gaps are always clear.

Edges between bands leave through the gap to the right of their source, run
along the space under the source band, and drop in through the gap to the left
of their target. A target in a band's first column, or an edge that skips a
whole band, uses a lane in a thin strip along the left edge.

Crossings are reduced, not eliminated. Ports on a card are ordered by where the
other end sits. Lanes in each gap are ordered in pairs, so a lane goes left of
another when that makes the two edges cross fewer times. Then a few passes of
neighbour swaps keep any change that lowers the real crossing count. On the
reference project, that took the default view from 16 crossings to 4 and the
full graph from 167 to 98. I haven't proven the remaining four are
unavoidable. The search only swaps neighbours, so it can get stuck where a
better ordering needs two things to move at once. A full 64-ticket layout takes
about 36ms.

Edges from the same band into the same target merge. They share one lane
under the source band, one entry lane and one port on the target. The line gets
thicker as each edge joins, and after the last join it is drawn once with one
arrowhead. Three edges fanning into one ticket should read as one dependency
bundle, not three parallel wires.

Selecting a ticket highlights its edges in blue and fades the rest. For a merged
bundle, only the selected ticket's own branch plus the shared tail light up, and
only its real neighbours are marked as related.

### Navigation

Drag to pan, scroll to zoom, `F` or the Fit button to show everything. The graph
fits itself on first load. It does not refit on its own after that, because
refitting under someone who has zoomed in on something is worse than leaving
the view alone.

## The inspector

The right-hand panel is for reading the selected ticket. Its width is
resizable, remembered in `localStorage`, and reset with a double-click.

The top of the panel is the title, then one line with status, type, priority,
assignee and created date, then two buttons: copy the ID, and copy an execution
prompt that points an agent at the ticket. The details section used to be a tall
list of every front-matter key, including `links: []` and `deps: None`. Now it
shows only keys with values, ordered parent, deps, links, tags, then everything
else. Parent, dependency and link pills open their tickets. For the typical
ticket that is three rows.

Below a divider, the ticket body renders as Markdown at 14px. That is one size
up from the rest of the UI, because this is the part you actually read.

## The header

Project name as the title, a muted "Ticket view" label next to it, a count pill
(`12 / 64 tickets`), and the two closed-ticket filters styled as toggle buttons
that turn blue when on. The epic legend sits in its own row below and scrolls
sideways on a phone instead of wrapping.

## Rough edges and open questions

- **Same-band fan-in doesn't merge.** Only edges between bands are bundled.
  Edges into `efrs-cazj` from three tickets in the same band still arrive at
  three ports. It may be worth extending, but those routes already look fine.
- **Some crossings may still be avoidable.** See Edges. A smarter search
  could try moving whole groups of lanes if they turn out to matter.
- **No dark mode.** The colors are tokens, so it would be cheap to add.
- **Epic names can't be read by touch.** Long epic names are cut off in the
  legend and the full name only appears on hover.
- **Untested at scale.** The largest real test is 64 tickets and 68 edges. The
  crossing pass compares edge pairs, so a few hundred tickets may need a cap on
  passes.
- **Resizing the inspector doesn't refit.** That's on purpose (see Navigation),
  but it means pressing `F` after a big resize.
