# Job Finder Plugin for Tengra

AI-assisted CV profiling and job search for the Tengra desktop assistant.

## Flow

1. Select a Tengra model.
2. Load an existing CV PDF or create one from the form.
3. Extract a candidate profile from the CV with Tengra's generic AI bridge.
4. Search jobs for selected countries through the local `jobspy-ts` adapter layer.
5. Rank results against the extracted profile and show match reasons.

## Architecture

- `src/ui/JobFinderView.tsx`: step-based plugin UI.
- `src/services/tengraAiClient.ts`: generic Tengra model and chat bridge.
- `src/services/cvService.ts`: CV text, profile extraction fallback, PDF export.
- `src/services/jobService.ts`: multi-country search, normalization, ranking.
- `src/lib/jobspy-ts`: local scraper adapter layer.

The plugin does not require a plugin-specific Tengra core bridge. It uses generic capabilities declared in `package.json`: filesystem, network, AI, UI panel, and commands.

## Development

```bash
npm install
npm run build
npx tsc --noEmit
```

## License

MIT
