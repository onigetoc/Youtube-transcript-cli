# YouTube Transcript CLI

A Node.js CLI that fetches YouTube transcripts from a video URL or video ID.

This project is a standalone CLI package for npx, npm and bun.

## Features

- Fetch transcript by full YouTube URL or raw video ID
- Optional language priority list (`--lang=en,fr`)
- Optional timestamps (`--timestamps`)
- Optional chunking by max characters (`--max=6000`)
- Works as a local command and as a global command (`-g`)

## Command Name

The CLI command is:

```sh
yt-transcript
```

Hyphens are valid in CLI command names.

## Installation

### Global install (recommended)

```sh
npm install -g youtube-transcript-cli
# or with bun
bun add -g youtube-transcript-cli
```

Then use it directly from any terminal:

```sh
yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --max=6000
```

### Local install in a project

```sh
npm install youtube-transcript-cli
# or with bun
bun add youtube-transcript-cli
```

Run with `npx`:

```sh
npx yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --max=6000
```

## Local Development Test (before publishing)

From this repository folder:

```sh
npm install
npm run build
npm link
yt-transcript --help
yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --max=6000

# bun alternative
bun install
bun run build
bun link
yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --max=6000
```

Remove the global link when done:

```sh
npm unlink -g youtube-transcript-cli
# or with bun
bun unlink -g youtube-transcript-cli
```

## Usage

```sh
yt-transcript [<url|videoId>] [--lang en,fr] [--timestamps] [--max 12000]
```

If no URL/ID is provided, a default demo video is used.

## Version

Check the installed CLI version:

```sh
yt-transcript -v
yt-transcript --version
# when running without global install via npx:
npx youtube-transcript-cli -v
```

## Options

- `--lang=en,fr` or `--lang en,fr`: language priority list
- `--timestamps`: include timestamps in output
- `--max=6000` or `--max 6000`: chunk output by max characters
- `--help` or `-h`: show help

## Output Behavior

- Without `--max`, output is not chunked.
- With `--max`, output is split into chunks.
- Timestamps are based on real segment offsets.

## Use as a Skill (Prompt Examples)

When integrated as a skill in an AI assistant, users can ask:

- `Give me the transcript and timestamps on this video https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `Give me the french transcript of this Youtube video dQw4w9WgXcQ`
- `Extract transcript in English and French with timestamps for https://youtu.be/dQw4w9WgXcQ and save it as a .txt/.md/text/markdown file` 

## Use as a Skill (Integration instructions)

To integrate this CLI as a reusable skill, place a folder containing a `SKILL.md` file inside one of the assistant-supported `skills` directories. Common locations:

- `<your-project>/.claude/skills/yt-transcript/`
- `<your-project>/.github/skills/yt-transcript/`
- `<your-project>/.opencode/skills/yt-transcript/`

In that folder create a `SKILL.md` describing usage and parameters. Minimal example:

```
# yt-transcript

Short description: Uses the `yt-transcript` CLI to fetch a YouTube video's transcript.

Usage examples:
- `yt-transcript https://www.youtube.com/watch?v=<id> --lang en,fr --timestamps`

Notes:
- Ensure `youtube-transcript-cli` is available in the runtime environment (installed as a project dependency or available in `PATH`).
- Adapt the invocation to your assistant runtime (Node, container, cloud function, etc.).
```

After adding the folder, register or load the `skills` directory according to your assistant's mechanism so the skill becomes discoverable.

If you want, I can create an example `SKILL.md` in one of these locations in the repository — which one do you prefer?

## Publish to npm

When you are ready:

```sh
npm login
npm publish
```

The package is configured with:

- package name: `youtube-transcript-cli`
- CLI command: `yt-transcript`

## License

MIT
