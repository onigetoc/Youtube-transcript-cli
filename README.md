# MCP YouTube Transcript Server

An MCP (Model Context Protocol) server that retrieves YouTube video transcripts and returns them in plain text chunks (optionally timestamped). The core implementation uses the open‑source `@danielxceron/youtube-transcript` library (no official YouTube Data API quota required). It integrates with any MCP‑compatible client (e.g. Claude Desktop) and also ships with a local test CLI and a minimal JSON‑RPC test client.

## Key Features

- Extract transcript by full YouTube URL or raw video ID.
- Optional language priority list: tries each language in order, falls back automatically.
- Optional timestamps in output.
- Automatic chunking (configurable max characters per chunk) for large transcripts so the MCP host can stream / display safely.
- Heuristic detection of available languages (probing a common set).
- Lightweight standalone CLI (no MCP required) for fast local testing.
- Basic glitch / HTML entity cleanup (decodes `&amp;`, `&#39;`, etc., and normalizes some mis‑encoded musical note artifacts).

## Installation

Using npm (or you can use pnpm / yarn):

```sh
git clone https://github.com/your-user/mcp-youtube-transcript-server.git
cd mcp-youtube-transcript-server
npm install
npm run build
```

Global CLI command names can contain hyphens, so `yt-transcript` is a valid command name.

## Installable Global CLI

After publishing to npm, users will be able to install the CLI globally and run it directly from the terminal:

```sh
npm install -g youtube-transcriptor
yt-transcript https://www.youtube.com/watch?v=4q2fTmGWTpc --lang=en,fr --timestamps --max=6000
```

Before publishing, you can test the exact same command locally from the project folder:

```sh
npm install
npm run build
npm link
yt-transcript https://www.youtube.com/watch?v=4q2fTmGWTpc --lang=en,fr --timestamps --max=6000
```

To remove the local global link after testing:

```sh
npm unlink -g youtube-transcriptor
```

## Run (MCP server)

```sh
npm start
```

This starts the server on stdio (required by MCP hosts).

## Quick Local Test (without MCP host)

1. Build: `npm run build`
2. Use the bundled test JSON-RPC client:
   #This one do not work
   ```sh
   node test-client.cjs https://www.youtube.com/watch?v=dQw4w9WgXcQ --timestamps
   ```
3. Or use the CLI (no JSON-RPC / MCP):

   ```sh
   # simple
   node build/cli.js https://www.youtube.com/watch?v=dQw4w9WgXcQ 
   
   node build/cli.js https://www.youtube.com/watch?v=4q2fTmGWTpc --lang=en,fr --timestamps --max=6000

   node build/cli.js https://www.youtube.com/watch?v=lXWazKnuZNQ --lang=en --timestamps --max=2000
   ```

   If you omit the URL/ID, the CLI falls back to a default demo video.
   Tip: `--max` contrôle la taille des chunks (par nombre de caractères). Mettez `--max=20000` pour réduire fortement le découpage, ou retirez `--max` pour utiliser la valeur par défaut.

## Claude Desktop Configuration Example

Add a section like this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gc-youtube-transcript": {
      "command": "node",
      "args": ["C:/Absolute/Path/To/build/index.js"]
    }
  }
}
```

Notes:

- Replace the path with the absolute path to your built `index.js`.
- No Youtube API key is needed for the library in use; remove any unused env section.
- Use [mcp-easy-installer](https://github.com/onigetoc/mcp-easy-installer) for a quick and hassle-free setup of this or any MCP server.  
  MCP easy installer is a robust tool to search, install, configure, repair, and uninstall MCP servers, making it simple for anyone to get started without technical expertise.

## Exposed Tools

1. `youtube_transcript`

   - Fetches transcript with options.
   - Inputs:
     - `url` (optional string, full YouTube URL if `video_id` not provided)
     - `video_id` (optional string, if `url` not provided)
     - `languages` (optional array of language codes, priority order)
     - `include_timestamps` (boolean, default false)
     - `max_chars_per_chunk` (number, default 0 = pas de découpe, 0–20000)
   - Output: multiple text chunks (first chunk includes a header).

2. `youtube_available_languages`
   - Heuristic probe of a predefined list of language codes; returns those that yield a non-empty transcript.

## JSON-RPC Example (generic host)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/run",
  "params": {
    "name": "youtube_transcript",
    "arguments": {
      "url": "https://www.youtube.com/watch?v=4q2fTmGWTpc",
      "include_timestamps": true,
      "languages": ["en", "fr"]
    }
  }
}
```

## CLI Usage

```sh
yt-transcript [<url|videoId>] [--lang en,fr] [--timestamps] [--max 12000]
```

If no first positional argument is supplied (or it starts with `--`), a default demo video is used.
Note: sans `--max`, aucun chunk n’est produit. L’entête `--- Chunk i/N ---` n’apparaît que s’il y a plusieurs blocs.

## Error Handling & Edge Cases

- Invalid or unresolvable video ID -> error response (`isError: true`).
- No transcript available -> error response.
- Large transcripts -> automatically chunked by character count.
- Language list: tries each code in order; if all fail, falls back to auto language.

## FAQ / Dépannage (chunks et timestamps)

### Pourquoi j’ai des “chunks” (Chunk 1/2, 2/2, …) ?

Par défaut il n’y a plus de découpe (max=0). Le découpage n’a lieu que si vous fixez `--max` (CLI) ou `max_chars_per_chunk` (MCP) à une valeur > 0.
– Vous avez passé `--max=6000`, ce qui force un découpage autour de 6000 caractères.  
– Pour réduire/supprimer le découpage: augmentez à `--max=20000` (limite haute actuelle). Pour de très longues vidéos, plusieurs chunks resteront inévitables.

Note: dans la version actuelle, le découpage est “brut” (par caractères) et peut couper au milieu d’un mot/phrase. Une amélioration ultérieure effectuera la coupe sur des espaces/ponctuation.

### Les timestamps affichent tous [00:00], pourquoi ?

Corrigé: les timestamps utilisent maintenant la valeur réelle de début (offset/start) de chaque segment, au format `[mm:ss]` (ou `[hh:mm:ss]`).

## Roadmap Ideas

- Optional output formats: SRT / VTT file synthesis (currently only plain text chunks).
- Caching layer for repeated queries.
- Streaming partial chunks sooner (if host supports incremental delivery).
- Improve chunking to split on word/sentence boundaries and fix timestamp formatting in all modes.

## License

MIT. See source headers and package metadata.

---

For implementation details see: [src/index.ts](src/index.ts)
