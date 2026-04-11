# Job Finder Plugin for Tengra

AI-assisted CV profiling and job search for the Tengra desktop assistant.

## Flow

1. Load an existing CV PDF or create one from structured form inputs.
2. Continue to the model/search step after the CV is ready.
3. Select from the full Tengra model catalog through the plugin-local model selector adapter.
4. Extract a candidate profile with Tengra's generic AI bridge.
5. Search jobs for selected countries through the local `jobspy-ts` adapter layer.
6. Rank results against the extracted profile and show match reasons.

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
