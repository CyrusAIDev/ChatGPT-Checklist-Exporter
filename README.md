# Living Checklist for ChatGPT

A Chrome extension that turns the latest assistant message in a saved ChatGPT conversation into a living checklist. One checklist per conversation; merge when the plan updates; checked state and removed items are preserved locally.

## Requirements

- Chrome (Manifest V3)
- Saved ChatGPT conversations at `chatgpt.com/c/…`

## Development

```bash
npm install
npm run dev
```

Load the unpacked extension in Chrome from the `.output/chrome-mv3` folder (created by `npm run dev`). Open a saved ChatGPT conversation and use the side panel.

## Build

```bash
npm run build
```

Output is in `.output/chrome-mv3`.

## Development safety and checkpoints

After every major change or phase completion:

1. Update `progress.md` with what was done.
2. Create a checkpoint commit.

This keeps work versioned and recoverable.

## License

MIT
