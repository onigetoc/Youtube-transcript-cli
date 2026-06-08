# YouTube Transcript CLI

A Node.js CLI that fetches YouTube transcripts from a video URL or video ID.

This project is a standalone CLI package for npx, npm and bun.

## Features

- Fetch transcript by full YouTube URL or raw video ID
- Optional language priority list (`--lang=en,fr`)
- Optional timestamps (`--timestamps`)
- Optional SRT output (`--srt`)
- Optional output splitting for downstream processing (`--split=1000`)
- Works with npx (no install needed), or as a global command (`-g`)

## Command Name

The CLI command is:

```sh
youtube-transcript-cli
```

This matches the npm package name so `npx youtube-transcript-cli` works out of the box.

## Quick Start (no install)

```sh
npx youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --timestamps
npx youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --srt --split=1000
```

## Installation

### Global install (recommended for frequent use)

```sh
npm install -g youtube-transcript-cli
# or with bun
bun add -g youtube-transcript-cli
```

Then use it directly from any terminal:

```sh
youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --split=1000
youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --srt --split=1000
```

### Local install in a project

```sh
npm install youtube-transcript-cli
# or with bun
bun add youtube-transcript-cli
```

Run with `npx`:

```sh
npx youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --split=1000
npx youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --srt --split=1000
```

## Local Development Test (before publishing)

From this repository folder:

```sh
npm install
npm run build
npm link
youtube-transcript-cli --help
youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --split=1000
youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --srt --split=1000

# bun alternative
bun install
bun run build
bun link
youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --split=1000
```

Remove the global link when done:

```sh
npm unlink -g youtube-transcript-cli
# or with bun
bun unlink -g youtube-transcript-cli
```

## Usage

```sh
youtube-transcript-cli [<url|videoId>] [--lang en,fr] [--timestamps] [--srt] [--split 12000]
```

If no URL/ID is provided, a default demo video is used.

## Version

Check the installed CLI version:

```sh
youtube-transcript-cli -v
youtube-transcript-cli --version
# via npx:
npx youtube-transcript-cli -v
```

## Local test

Test local in projet after build

```sh
node build/cli.js https://youtu.be/dQw4w9WgXcQ --timestamps
# or
run test:live
```

## Options

- `--lang=en,fr` or `--lang en,fr`: language priority list
- `--timestamps`: include timestamps in output
- `--srt`: output SRT subtitles using the transcript timestamps
- `--split=1000` or `--split 1000`: split output into chunks for downstream processing
- `--help` or `-h`: show help

## Output Behavior

- Without `--split`, output is not chunked.
- With `--split`, output is split into consecutive chunks and every chunk is printed.
- `--split` is useful for downstream processing, batching, or later timestamp-range workflows. It is not a total-output truncation flag.
- `--split` also applies when `--srt` is enabled.
- Timestamps are based on real segment offsets.

## Use as a Skill (Prompt Examples)

When integrated as a skill in an AI assistant, users can ask:

- `Give me the transcript and timestamps on this video https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `Give me the french transcript of this Youtube video dQw4w9WgXcQ`
- `Extract transcript in English and French with timestamps for https://youtu.be/dQw4w9WgXcQ and save it as a .txt/.md/text/markdown file`

## Use as a Skill (Integration instructions)

To integrate this CLI as a reusable skill, place a folder containing a `SKILL.md` file inside one of the assistant-supported `skills` directories. Common locations:

- `<your-project>/.claude/skills/youtube-transcript-cli/`
- `<your-project>/.github/skills/youtube-transcript-cli/`
- `<your-project>/.opencode/skills/youtube-transcript-cli/`

In that folder create a `SKILL.md` describing usage and parameters. Minimal example:

```
# youtube-transcript-cli

Short description: Uses the `youtube-transcript-cli` CLI to fetch a YouTube video's transcript.

Usage examples:
- `youtube-transcript-cli https://www.youtube.com/watch?v=<id> --lang en,fr --timestamps`
- `npx youtube-transcript-cli https://www.youtube.com/watch?v=<id> --timestamps`

Notes:
- Ensure `youtube-transcript-cli` is available in the runtime environment (installed as a project dependency or available in `PATH`).
- Adapt the invocation to your assistant runtime (Node, container, cloud function, etc.).
```

After adding the folder, register or load the `skills` directory according to your assistant's mechanism so the skill becomes discoverable.

The package is configured with:

- package name: `youtube-transcript-cli`
- CLI command: `youtube-transcript-cli`

## License

MIT
