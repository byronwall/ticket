# Changelog

## [Unreleased]

### Changed
- Existing `done` tickets and epics now count as closed in the viewer and ticket dependency filters, while `closed` remains the selectable status
- `partially_implemented` records started but unfinished work; eligible tickets appear in `frontier`, can resume with `start`, and appear in the viewer
- `ready` now lists only refined tickets with closed dependencies; `start` requires both conditions
- Extracted `edit`, `ls`, `query`, and `migrate-beads` commands to plugins (ticket-extras)
- The `view` inspector now links plain web URLs in ticket Markdown and opens them in new tabs
- The `view` graph now has a right-click status menu that updates tickets through the status command
- The `view` graph now shows assignee avatars and a legend, and its context menu can assign known or new names

### Added
- `view` command opens a live ticket graph with routed arrows, pan, zoom, filters, and an inspector
- `ready` status and `frontier` command for two-pass ticket planning
- Plugin system: executables named `tk-<cmd>` or `ticket-<cmd>` in PATH are invoked automatically
- `super` command to bypass plugins and run built-in commands directly
- `TICKETS_DIR` and `TK_SCRIPT` environment variables exported for plugins
- `help` command lists installed plugins with descriptions
- Plugin metadata: `# tk-plugin:` comment for scripts, `--tk-describe` flag for binaries
- Multi-package distribution: `ticket-core`, `ticket-extras`, and individual plugin packages
- CI scripts for publishing to Homebrew tap and AUR

### Plugins
- ticket-view 1.8.0: Add a Board tab that groups initiatives by recorded status (planned, active, paused, completed, cancelled); drag a card to change its status, with undo, and copy one prompt per column or a retirement prompt for finished work. Sort the initiative list by most recent file edit, title, status, or phase, and filter by status. Select several initiatives with Cmd-click or their checkboxes and copy one prompt for all of them. Edit status, phase, next action, and `depends_on` dependencies from the reader; edits stamp `last_updated` and add a history entry, and stale or cyclic edits are refused. Show documents beyond the lifecycle briefs in a file tree. Update prompts end with `---` instead of a Comments section. Flag initiatives whose recorded status disagrees with their work evidence.
- ticket-view 1.7.0: Open projects without a `.tickets/` folder straight to their initiatives, and open on Initiatives when there are no tickets; with many documents, show tabs for the briefs and top-level files and reach the rest from a filterable All documents menu grouped by folder and titled by each file's heading; the update prompt now names the skill as `/software-design-sleuth-full`
- ticket-view 1.6.0: Rebuild the Initiatives tab as a reader with a searchable list, a tab for each Markdown document, a readable layout of the map, a prompt for updating the initiative, and view state in the URL; render tables, nested lists, and task lists in ticket bodies
- ticket-view 1.5.0: Filter the graph by assignee from the header legend, and copy one prompt that lists every visible ticket in dependency order, with or without the full ticket text
- ticket-view 1.5.0: Lay out tickets with no visible dependencies as a pool grid left of the dependency columns, sized so the graph is close to the window's shape
- ticket-view 1.4.0: Add an Initiatives tab for initiative maps, with a filter for work that has no recorded start
- ticket-view 1.3.0: Add and remove dependencies in the graph with cycle checks and a five-second undo toast for new connections; fix arrow rendering and keep selected and hovered edge highlights above the base arrows
- ticket-view 1.2.1: Reduce graph edge crossings by swapping nodes within dependency columns before routing links
- ticket-view 1.2.0: Show and edit partially implemented status
- ticket-view 1.1.0: Link plain URLs, edit status and assignee from a node's context menu, and show assignee avatars
- ticket-edit 1.0.0: Open ticket in $EDITOR (extracted from core)
- ticket-ls 1.0.0: List tickets with optional filters (extracted from core); `ticket-list` symlink for alias
- ticket-query 1.0.0: Output tickets as JSON, optionally filtered with jq (extracted from core)
- ticket-migrate-beads 1.0.0: Import tickets from .beads/issues.jsonl (extracted from core)

## [0.3.2] - 2026-02-03

### Fixed
- Ticket ID lookup now trims leading/trailing whitespace (fixes issue with AI agents passing extra spaces)

## [0.3.1] - 2026-01-28

### Added
- `list` command alias for `ls`
- `TICKET_PAGER` environment variable for `show` command (only when stdout is a TTY; falls back to `PAGER`)

### Changed
- Walk parent directories to find `.tickets/` directory, enabling commands from any subdirectory
- Ticket ID suffix now uses full alphanumeric (a-z0-9) instead of hex for increased entropy

### Fixed
- `dep` command now resolves partial IDs for the dependency argument
- `undep` command now resolves partial IDs and validates dependency exists
- `unlink` command now resolves partial IDs for both arguments
- `create --parent` now validates and resolves parent ticket ID
- `generate_id` now uses 3-char prefix for single-segment directory names (e.g., "plan" → "pla" instead of "p")

## [0.3.0] - 2026-01-18

### Added
- Support `TICKETS_DIR` environment variable for custom tickets directory location
- `dep cycle` command to detect dependency cycles in open tickets
- `add-note` command for appending timestamped notes to tickets
- `-a, --assignee` filter flag for `ls`, `ready`, `blocked`, and `closed` commands
- `--tags` flag for `create` command to add comma-separated tags
- `-T, --tag` filter flag for `ls`, `ready`, `blocked`, and `closed` commands

## [0.2.0] - 2026-01-04

### Added
- `--parent` flag for `create` command to set parent ticket
- `link`/`unlink` commands for symmetric ticket relationships
- `show` command displays parent title and linked tickets
- `migrate-beads` now imports parent-child and related dependencies

## [0.1.1] - 2026-01-02

### Fixed
- `edit` command no longer hangs when run in non-TTY environments

## [0.1.0] - 2026-01-02

Initial release.
