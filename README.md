# ticket

The git-backed issue tracker for AI agents. Rooted in the Unix Philosophy, `tk` is inspired by Joe Armstrong's [Minimal Viable Program](https://joearms.github.io/published/2014-06-25-minimal-viable-program.html) with additional quality of life features for managing and querying against complex issue dependency graphs.

`tk` was written as a full replacement for [beads](https://github.com/steveyegge/beads). It shares many similar commands but without the need for keeping a SQLite file in sync or a rogue background daemon mangling your changes. It ships with a `migrate-beads` command to make this a smooth transition.

Tickets are markdown files with YAML frontmatter in `.tickets/`. This allows AI agents to easily search them for relevant content without dumping ten thousand character JSONL lines into their context window.

Using ticket IDs as file names also allows IDEs to quickly navigate to the ticket for you. For example, you might run `git log` in your terminal and see something like:

```
nw-5c46: add SSE connection management 
```

VS Code allows you to Ctrl+Click or Cmd+Click the ID and jump directly to the file to read the details.

## Install

**Homebrew (macOS/Linux):**
```bash
brew tap wedow/tools
brew install ticket
```

**Arch Linux (AUR):**
```bash
yay -S ticket  # or paru, etc.
```

**From source (auto-updates on git pull):**
```bash
git clone https://github.com/wedow/ticket.git
cd ticket && ln -s "$PWD/ticket" ~/.local/bin/tk
```

**Or** just copy `ticket` to somewhere in your PATH.

## Requirements

`tk` is a portable bash script requiring only coreutils, so it works out of the box on any POSIX system with bash installed. The `query` command requires `jq`. Uses `rg` (ripgrep) if available, falls back to `grep`.
The `view` command requires Python 3 and a browser.

## Agent Setup

Add this line to your `CLAUDE.md` or `AGENTS.md`:

```
This project uses a CLI ticket system for task management. Run `tk help` when you need to use it.
```

Claude Opus picks it up naturally from there. Other models may need additional guidance.

## Usage

```bash
tk - minimal ticket system with dependency tracking

Usage: tk <command> [args]

Commands:
  create [title] [options] Create ticket, prints ID
    -d, --description      Description text
    --design               Design notes
    --acceptance           Acceptance criteria
    -t, --type             Type (bug|feature|task|epic|chore) [default: task]
    -p, --priority         Priority 0-4, 0=highest [default: 2]
    -a, --assignee         Assignee [default: git user.name]
    --external-ref         External reference (e.g., gh-123, JIRA-456)
    --parent               Parent ticket ID
    --tags                 Comma-separated tags (e.g., --tags ui,backend,urgent)
  start <id>               Start a ready or partially implemented ticket with closed dependencies
  close <id>               Set status to closed
  reopen <id>              Set status to open
  status <id> <status>     Update status (open|ready|in_progress|partially_implemented|closed)
  dep <id> <dep-id>        Add dependency (id depends on dep-id)
  dep tree [--full] <id>   Show dependency tree (--full disables dedup)
  dep cycle                Find dependency cycles in unfinished tickets
  undep <id> <dep-id>      Remove dependency
  link <id> <id> [id...]   Link tickets together (symmetric)
  unlink <id> <target-id>  Remove link between tickets
  ls|list [--status=X] [-a X] [-T X]   List tickets
  frontier [-a X] [-T X]   List open/ready/partially implemented tickets with deps resolved
  ready [-a X] [-T X]      List ready tickets with deps resolved
  blocked [-a X] [-T X]    List unfinished tickets with unresolved deps
  closed [--limit=N] [-a X] [-T X] List recently closed tickets (default 20, by mtime)
  show <id>                Display ticket
  view [--port=N]          Open a live ticket graph
  add-note <id> [text]     Append timestamped note (or pipe via stdin)
  super <cmd> [args]       Bypass plugins, run built-in command directly

Bundled plugins (ticket-extras):
  edit <id>                Open ticket in $EDITOR
  ls|list [--status=X] [-a X] [-T X]   List tickets
  query [jq-filter]        Output tickets as JSON, optionally filtered (requires jq)
  migrate-beads            Import tickets from .beads/issues.jsonl (requires jq)

Searches parent directories for .tickets/ (override with TICKETS_DIR env var)
Supports partial ID matching (e.g., 'tk show 5c4' matches 'nw-5c46')
```

New tickets start as `open`: the outcome and known dependencies are recorded,
but implementation detail can still change. Refine an eligible `open` ticket
against the current repository, then run `tk status <id> ready`. `tk frontier`
shows eligible `open`, `ready`, and `partially_implemented` tickets. Use `partially_implemented` when work started but was left unfinished; it stays on the frontier without losing that history. `tk ready` shows only tickets marked `ready`. A ticket with an unfinished dependency appears in `tk blocked` when its status is `open`, `ready`, `in_progress`, or `partially_implemented`. `tk start` accepts `ready` or `partially_implemented` with closed dependencies.

`tk view` opens a local graph for the current project's `.tickets/`
folder. A project with no `.tickets/` folder opens straight to its
initiatives, and a project with no tickets opens on the Initiatives tab. Dependencies point from left to right. When the graph is much wider
than the window, later columns wrap into stacked bands below the first. Tickets
with no visible dependency in either direction form a pool: a grid left of the
dependency columns, set apart by a dotted line. The pool's column count is
chosen so the whole graph is close to the window's shape. Epics
appear in the color legend with their visible ticket counts; their child
tickets appear as nodes grouped by epic within each column. Closed tickets are
hidden by default. Show closed tickets, then show closed epics, to reveal older work.
Click an epic name to filter its tickets; click it again to clear the filter.
The epic filter is disabled when only one epic is available.
Click an assignee in the header legend to show only that assignee's tickets; click it again to clear the filter. The epic and assignee filters combine.
**Copy prompt for visible tickets**, at the top right, copies one prompt that lists every visible ticket with dependencies first, ready to paste into a single agent.
**Copy full tickets** copies the same summary followed by each ticket's front matter and body, for sessions that cannot read the ticket files.
Right-click a ticket node to set its assignee or status. The assignee list includes names already used by tickets, Agent, Unassigned, and Add new for entering a name. Assignees appear as colored initials in the header legend, on nodes, and in the inspector. The status list offers open, ready, in progress, partially implemented, and closed; entering in progress follows the same readiness and dependency checks as `tk status`. Nodes abbreviate partially implemented as Partial, while the inspector shows its full name. Press Shift+F10 on a focused node to open the menu from the keyboard.

Press `C` to connect tickets. If a ticket is selected, it becomes the source; otherwise click a source ticket, then click the dependent target. The arrow points from source to target. Cycles and duplicate dependencies are rejected. Press Escape to cancel. After a connection is created, an Undo button appears in a toast at the top of the screen for five seconds. Click an arrow to select it, then press Delete to remove that dependency.

The graph fits itself on first load. Drag to pan. Use the mouse wheel or the
+/- buttons to zoom. Press `F` or click Fit to show all visible nodes. Select a
ticket to highlight its dependency edges and read styled Markdown and front
matter. Dependency, link, and parent pills open their tickets. Click the ID
button to copy it, or use the inspector button to copy an execution prompt.
Drag the inspector's left edge to resize it; the width is remembered, and a
double-click resets it.
The page checks for changes each second and keeps node positions stable until
dependencies or epics change, or until a window resize changes the number of
bands or pool columns. Use `tk view --no-open` to print the URL without opening a browser.

The **Initiatives** tab is a reader for the project's `initiative-map.json`
files and the Markdown documents beside them. The list on the left has a search
box, a status menu (**Open**, each status with its count, or **All**), and a sort:
**Recently edited** (the newest change to the map or any of its documents, the
default; committed files use their last commit time, and files with uncommitted
changes use their modification time), **Title**, **Status**, or **Phase**. Open hides completed and cancelled
work. Each row shows its status, phase, how long ago it was edited, in blue when it
changed in the last day. Press `/` to search, and use the arrow keys to move
through the list. Matching text in titles, summaries, and next actions is
highlighted.

**Table** (or `T`) expands the list into a full-width table with the summary,
status, phase, next action, dependencies, latest history entry, and edit time of
each initiative. The search, status menu, sort, and selection carry over, and the
Initiative, Status, Phase, and Edited headers sort. Click a row to open it in the
reader; **Reader** or Back returns to the table.

Status is the map's `initiative.status`: planned, active, paused, completed, or
cancelled. A map without one shows a status inferred from its work evidence, in
italics with a dashed marker. **Check status** flags an initiative whose recorded
status disagrees with its linked tickets or milestones.

The **Board** tab lays initiatives out in one column per status. Drag a card to
another column to change its status; a toast offers Undo for five seconds.
Right-click a card, or press Shift+F10 on it, to pick a status from the keyboard.
Each column's **⋯** menu copies one prompt that lists every card in it, and the
Completed and Cancelled columns add **Copy retire prompt**, which approves
retirement of those initiatives. Cards show the next action, phase,
and dependency counts.

To reference several initiatives at once, Cmd-click (or Ctrl- or Shift-click)
them in the list or on the board, tick the checkbox that replaces the status dot
on hover, or press `X` on a focused row. The bar that appears copies one prompt
for the selection, and a retirement prompt when every selected initiative is
finished. Press Escape to clear the selection. With nothing selected, the same
bar copies a prompt for everything the filter shows.

The right side shows the selected initiative. Click the status or phase to
change it, and click the next action to edit it in place (Enter saves, Escape
cancels). **Depends on** lists the initiatives this one waits on, stored as slugs
in `initiative.depends_on`; **Add** picks another initiative, and a dependency
that would create a cycle is refused. **Needed by** and **Related** (from
`related_initiatives`) appear when they apply. **Activity** shows the three newest
history entries; **All N entries** opens the full history in the map. Every edit sets
`last_updated`, appends a history entry, keeps the file's indentation, and is
refused if the map changed since the page last read it.

The intent, brainstorm, shape, and plan briefs and the **Map** get tabs. Every
document in the folder appears in a file tree: in the side rail on wide windows,
or under **Files** otherwise. Folders fold, and the tree filters as you type in
the Files menu. A document opened from the tree gets its own tab while it is
open. Documents render with headings, tables, nested lists, task lists, and
code blocks. Wide windows also show an outline of the document's headings. A
link to another Markdown file in the project opens that file in the reader;
Back returns to the previous document. The **Map** tab lays out the map itself
for reading: lifecycle stages, shape, milestones, linked tickets, claims,
sources, and history. Fields without a dedicated layout still appear. Click a
linked ticket to open it in the graph.

**Copy prompt to update** copies a prompt that names the
`/software-design-sleuth-full` skill and gives the full paths of the initiative
folder, its map, and the open document. It ends with a `---` line, ready for your
comments. Completed and cancelled initiatives also offer **Copy retire prompt**.
Click the folder path above the title to copy its full path.

The tab, selected initiative, open document, search, filter, sort, and table layout are stored
in the URL, so a refresh returns to the same place. The reading position is
restored as well.

Work evidence uses linked ticket states, then recorded milestone or execution
states. A current plan alone does not mean work has started.
Maps and documents refresh with tickets. Invalid maps show an error without
hiding valid maps. The scan skips hidden folders, dependencies, build output,
and vendor files. Only Markdown files inside the project can be read.

## Plugins

Executables named `tk-<cmd>` or `ticket-<cmd>` in your PATH are invoked automatically. This allows you to add custom commands or override built-in ones.

```bash
# Create a simple plugin
cat > ~/.local/bin/tk-hello <<'EOF'
#!/bin/bash
# tk-plugin: Say hello
echo "Hello from plugin!"
EOF
chmod +x ~/.local/bin/tk-hello

# Now it's available
tk hello        # runs tk-hello
tk help         # lists it under "Plugins"
```

**Plugin descriptions** (shown in `tk help`):
- Scripts: comment `# tk-plugin: description` in first 10 lines
- Binaries: `--tk-describe` flag outputs `tk-plugin: description`

**Plugin environment variables:**
- `TICKETS_DIR` - path to the .tickets directory (may be empty)
- `TK_SCRIPT` - absolute path to the tk script

**Calling built-ins from plugins:**
```bash
#!/bin/bash
# tk-plugin: Custom create with extras
id=$("$TK_SCRIPT" super create "$@")
echo "Created $id, doing extra stuff..."
```

Use `tk super <cmd>` to bypass plugins and run the built-in directly.

## Testing

The tests are written in the Behavior-Driven Development library [behave](https://behave.readthedocs.io/en/latest/) and require Python.

If you have `uv` [installed](https://docs.astral.sh/uv/getting-started/installation/) simply:

```sh
make test
```

## Migrating from Beads

```bash
tk migrate-beads

# review new files if you like
git status

# check state matches expectations
tk ready
tk blocked

# compare against
bd ready
bd blocked

# all good, let's go
git rm -rf .beads
git add .tickets
git commit -am "ditch beads"
```

For a thorough system-wide Beads cleanup, see [banteg's uninstall script](https://gist.github.com/banteg/1a539b88b3c8945cd71e4b958f319d8d).

## License

MIT
