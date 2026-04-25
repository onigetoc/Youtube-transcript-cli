---
name: yt-transcript
description: Fetch and display YouTube video transcripts/subtitles as plain text from a URL or video ID using the `yt-transcript` CLI. Use when the user wants to extract, read, or work with the transcript of a YouTube video, or when asked to run yt-transcript commands with options like language selection, timestamps, or chunk size.
---

# yt-transcript Skill

## Overview

`yt-transcript` is a CLI that fetches YouTube transcripts from a URL or raw video ID.

The skill should work after install with no build step and no link step.

## Pre-install check

Before installing, you can check whether the CLI is already available to avoid re-installing:

```sh
# check installed yt-transcript (global)
yt-transcript -v

# check npx is available (for running via npx)
npx -v

# (optional) check binary path on POSIX/Windows
which yt-transcript   # POSIX
where yt-transcript   # Windows
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
yt-transcript [<url|videoId>] [--lang en,fr] [--timestamps] [--max 12000]
```

If no URL/ID is provided, a built-in demo video is used.

## Options

| Flag | Description |
|------|-------------|
| `--lang=en,fr` | Language priority list (comma-separated) |
| `--timestamps` | Include `[mm:ss]` timestamps in output |
| `--max=6000` | Split output into chunks of N characters (0 = no chunking) |
| `--help` / `-h` | Show help |

## Common Examples

```sh
# Basic transcript (no timestamps, no chunking)
yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ

# With language priority, timestamps, and chunking
yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --max=6000

# Using short URL
yt-transcript https://youtu.be/dQw4w9WgXcQ --timestamps

# Using raw video ID
yt-transcript dQw4w9WgXcQ --lang=en

# Run without global install (optional)
npx yt-transcript https://www.youtube.com/watch?v=dQw4w9WgXcQ --lang=en,fr --timestamps --max=6000
```

## Output Behavior

- Without `--max`: output is a single block of text.
- With `--max N`: output is split into chunks of at most N characters.
- Timestamps use `[mm:ss]` or `[hh:mm:ss]` format based on segment start time.

## Skill Execution Notes

- Keep this skill focused on transcript extraction usage.
- Do not include repository development workflows here (`build`, `link`, `publish`).
- Use direct `yt-transcript` after global install, or `npx` for one-shot execution.

## Skill Prompt Examples

Use prompts like:

- `Give me the transcript and timestamps on this video https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `Give me the french transcript of this Youtube video dQw4w9WgXcQ`
- `Extract transcript in English and French with timestamps for https://youtu.be/dQw4w9WgXcQ`
