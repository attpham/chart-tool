@copilot In addition to save/load, please also add a "New Chart" feature:

## Additional Requirement: "New Chart" / Reset to Blank

Users need a way to start from scratch with a brand new chart without reloading the page.

### Requirements:

1. **"New Chart" button** — Add a clearly visible button in the header toolbar (next to Save, My Charts, etc.) that resets the entire app state back to defaults.
   - Reset `chartType` to `'bar'`
   - Reset `chartData` to `DEFAULT_CHART_DATA` (from `chartDefaults.ts`)
   - Reset `customization` to `DEFAULT_CUSTOMIZATION` (from `chartDefaults.ts`)
   - Keep `isDarkMode` as-is (don't reset the theme — that's a user preference, not a chart property)

2. **Confirmation dialog** — Before resetting, show a confirmation: "Start a new chart? Any unsaved changes will be lost." with "Cancel" and "New Chart" buttons. If the current chart has been saved, skip the confirmation.

3. **Clear auto-save** — When starting a new chart, clear the auto-saved session state so the next app load starts fresh too (unless the user makes changes to the new chart, which would trigger auto-save again).

4. **Integration with save flow** — If the user has unsaved changes, the confirmation dialog could offer a third option: "Save & New" that saves the current chart first, then resets.

### UI Notes:
- The button should have a "+" or document icon to indicate "new"
- Place it as the first action in the toolbar, before "Save"
- Follow existing dark mode Tailwind patterns