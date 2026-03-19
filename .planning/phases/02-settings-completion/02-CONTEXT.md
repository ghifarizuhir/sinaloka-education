# Phase 2: Settings Completion - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up all remaining non-functional Settings tabs by removing them entirely. The Settings page will have only 3 tabs that actually work: General, Billing, and Academic. Remove fake UI elements (Branding tab, Security tab, Integrations tab, Delete Institution danger zone) rather than keeping broken placeholders.

</domain>

<decisions>
## Implementation Decisions

### Branding Tab
- **Remove entirely** — user does not want branding customization
- Delete BrandingTab.tsx component
- Remove the "Branding" tab definition from Settings/index.tsx
- Remove associated state (primaryColor) from useSettingsPage.ts
- Note: BRND-01 requirement changes from "persist primary color" to "Branding tab removed (non-functional UI eliminated)"

### Security Tab
- **Remove entirely** — not just "coming soon", fully remove
- Delete SecurityTab.tsx component
- Remove the "Security" tab definition from Settings/index.tsx
- Note: SETT-01 requirement is satisfied — "Security tab does not show fake toggles" because it's removed

### Integrations Tab
- **Remove entirely** — WhatsApp already has its own dedicated page in the sidebar
- Delete IntegrationsTab.tsx component
- Remove the "Integrations" tab definition from Settings/index.tsx
- Note: SETT-02 requirement changes — integrations tab removed because WhatsApp has its own page and other integrations don't exist

### Delete Institution Button
- **Remove entirely** — too risky for a UI button
- Remove the "Danger Zone" section from GeneralTab.tsx
- Note: SETT-03 requirement is satisfied — button is removed rather than exposed

### Claude's Discretion
- Whether to leave empty file stubs or fully delete component files
- Whether to update i18n keys (remove unused tab labels) or leave for Phase 4 quality sweep
- Tab navigation layout after removing 3 tabs (may need visual adjustment with only 3 tabs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Settings Page Structure
- `sinaloka-platform/src/pages/Settings/index.tsx` — Tab definitions, tab array, rendering logic
- `sinaloka-platform/src/pages/Settings/useSettingsPage.ts` — State for all tabs including primaryColor to remove

### Tabs to Remove
- `sinaloka-platform/src/pages/Settings/tabs/BrandingTab.tsx` — File to delete
- `sinaloka-platform/src/pages/Settings/tabs/SecurityTab.tsx` — File to delete
- `sinaloka-platform/src/pages/Settings/tabs/IntegrationsTab.tsx` — File to delete

### General Tab Danger Zone
- `sinaloka-platform/src/pages/Settings/tabs/GeneralTab.tsx` — Contains "Delete Institution" button to remove (around line 99-102)

### Prior Phase Pattern
- `.planning/phases/01-academic-settings/01-CONTEXT.md` — Settings JSON blob pattern from Phase 1

</canonical_refs>

<code_context>
## Existing Code Insights

### Settings Tab Structure
- Settings/index.tsx defines tabs as an array of `{ id, label, icon }` objects
- Active tab state managed in useSettingsPage.ts
- Each tab is a separate component imported and rendered conditionally
- Removing a tab = remove from array + remove import + delete file

### Reusable Pattern
- Phase 1 already modified useSettingsPage.ts and Settings/index.tsx — same files touched again
- The pattern is: remove tab from array, remove import, remove state, delete component file

### Integration Points
- Settings/index.tsx renders tabs based on array — shrinking from 6 to 3 tabs
- useSettingsPage.ts has `primaryColor` state that becomes dead code after BrandingTab removal
- GeneralTab.tsx danger zone section is self-contained — removal is clean

</code_context>

<specifics>
## Specific Ideas

- This phase is primarily cleanup/removal — simpler than Phase 1
- After removal, Settings will have exactly 3 functional tabs: General, Billing, Academic
- All removed tabs had zero backend support — removing them eliminates misleading UI

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-settings-completion*
*Context gathered: 2026-03-19*
