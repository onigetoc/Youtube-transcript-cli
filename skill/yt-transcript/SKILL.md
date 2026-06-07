---
name: youtube-transcript-cli
description: Fetch and display YouTube video transcripts/subtitles as plain text from a URL or video ID using the `youtube-transcript-cli` CLI. Use when the user wants to extract, read, or work with the transcript of a YouTube video, or when asked to run youtube-transcript-cli commands with options like language selection, timestamps, or chunk size.
---

# youtube-transcript-cli Skill

## Overview

`youtube-transcript-cli` is a CLI that fetches YouTube transcripts from a URL or raw video ID.

The skill should work after install with no build step and no link step.

## Pre-install check

Before installing, you can check whether the CLI is already available to avoid re-installing:

```sh
# check installed youtube-transcript-cli (global)
youtube-transcript-cli -v

# check npx is available (for running via npx)
npx -v

# (optional) check binary path on POSIX/Windows
which youtube-transcript-cli   # POSIX
where youtube-transcript-cli   # Windows
```

## Installation

```sh
# Global install (recommended)
npm install -g youtube-transcript-cli
# or
bun add -g youtube-transcript-cli
```

## CLI Usage

```sh
youtube-transcript-cli [<url|videoId>] [--lang en,fr] [--timestamps] [--max 12000]
```

If no URL/ID is provided, a built-in demo video is used.

## Options

| Flag | Description |
|------|-------------|
| `--lang=en,fr` | Language priority list (comma-separated) |
| `--timestamps` | Include `[mm:ss]` timestamps in output |
| `--max=6000` | Split output into chunks of N characters (0 = no chunking) |
| `--help` / `-h` | Show help |

## Important: Always quote URLs

URLs may contain special characters (`&`, `%`, etc.) that shells like PowerShell interpret as operators. **Always wrap URLs in double quotes** to avoid errors:

```sh
# ✅ Correct (quoted URL)
youtube-transcript-cli "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --timestamps

# ❌ Wrong (unquoted URL with & will break in PowerShell)
youtube-transcript-cli https://www.youtube.com/watch?v=dQw4w9WgXcQ&pp=xyz --timestamps
```

## Common Examples

```sh
# Basic transcript (no timestamps, no chunking)
youtube-transcript-cli "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# With language priority, timestamps, and chunking
youtube-transcript-cli "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --lang=en,fr --timestamps --max=6000

# Using short URL
youtube-transcript-cli "https://youtu.be/dQw4w9WgXcQ" --timestamps

# Using raw video ID
youtube-transcript-cli dQw4w9WgXcQ --lang=en

# Run without global install via npx
npx youtube-transcript-cli "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --lang=en,fr --timestamps --max=6000
```

## Output Behavior

- Without `--max`: output is a single block of text.
- With `--max N`: output is split into chunks of at most N characters.
- Timestamps use `[mm:ss]` or `[hh:mm:ss]` format based on segment start time.

## Skill Execution Notes

- Keep this skill focused on transcript extraction usage.
- Do not include repository development workflows here (`build`, `link`, `publish`).
- Use direct `youtube-transcript-cli` after global install, or `npx youtube-transcript-cli` for one-shot execution.

## SRT Requests

If the user explicitly asks for SRT subtitles:

- Run `youtube-transcript-cli` with `--srt`.
- You can combine it with `--split=<N>` (for example `--split=1000`) when chunked output is useful.
- Keep the response concise: provide the command and the first 6 SRT lines as proof.

## Skill Prompt Examples

Use prompts like:

- `Give me the transcript and timestamps on this video https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `Give me the french transcript of this Youtube video dQw4w9WgXcQ`
- `Extract transcript in English and French with timestamps for https://youtu.be/dQw4w9WgXcQ`
