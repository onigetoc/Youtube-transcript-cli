// Minimal MCP test client for the YouTube Transcript server
// Usage: node test-client.cjs <url_or_video_id> [--lang en,fr] [--timestamps]
// The goal is to avoid installing into a full MCP client.

const { spawn } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node test-client.cjs <url|videoId> [--lang en,fr] [--timestamps]');
  process.exit(1);
}

const target = args[0];
const langsArg = args.find(a => a.startsWith('--lang'));
const timestamps = args.includes('--timestamps');
const languages = langsArg ? langsArg.split('=')[1].split(/[,;]/).map(s=>s.trim()).filter(Boolean) : undefined;

let buffer = '';
let initialized = false;
let listed = false;
let runSent = false;

console.log('🚀 Starting server (build required first: npm run build)');
const serverProcess = spawn('node', ['build/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });

function send(obj){
  serverProcess.stdin.write(JSON.stringify(obj)+'\n');
}

function initialize(){
  send({
    jsonrpc:'2.0',
    id:1,
    method:'initialize',
    params:{
      protocolVersion:'2024-11-05',
      clientInfo:{ name:'local-test-client', version:'1.0.0' },
      capabilities:{}
    }
  });
}

function listTools(){
  send({ jsonrpc:'2.0', id:2, method:'tools/list' });
}

function runTranscript(){
  const argumentsObj = {}; // tool accepts url OR video_id
  if (/^https?:\/\//i.test(target)) argumentsObj.url = target; else argumentsObj.video_id = target;
  if (languages) argumentsObj.languages = languages;
  if (timestamps) argumentsObj.include_timestamps = true;
  send({
    jsonrpc:'2.0',
    id:3,
    method:'tools/call',
    params:{
      name:'youtube_transcript',
      arguments: argumentsObj
    }
  });
  runSent = true;
}

serverProcess.stdout.on('data', data => {
  buffer += data.toString();
  const lines = buffer.split(/\n+/);
  buffer = lines.pop();
  for(const line of lines){
    if(!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { 
      console.log('📄 (non-JSON stdout)', line);
      continue;
    }
    // Compact display
    if (msg.method === 'notifications/...' ) return; // placeholder
    if (msg.id !== undefined) {
      console.log(`\n🔄 Response id=${msg.id}`);
    }
    console.dir(msg, { depth: 6, colors: true });
    if (msg.id === 1 && !msg.error){
      initialized = true;
      listTools();
    } else if (msg.id === 2){
      listed = true;
      const names = (msg.result?.tools || []).map(t=>t.name);
      if (!names.includes('youtube_transcript')){
        console.error('❌ Tool youtube_transcript not found. Available tools:', names);
        serverProcess.kill();
        return;
      }
      runTranscript();
    } else if (msg.id === 3){
      console.log('\n✅ Execution finished. Closing server.');
      serverProcess.kill();
    }
  }
});

serverProcess.stderr.on('data', d => {
  process.stderr.write('STDERR: '+d.toString());
});

serverProcess.on('close', code => {
  console.log(`\n👋 Server stopped (code ${code}).`);
});

setTimeout(() => {
  if(!initialized){
    console.error('⏱️ Timeout: initialize not received');
    serverProcess.kill();
  }
  if(initialized && !runSent){
    console.error('⏱️ Timeout: tools/run not executed');
    serverProcess.kill();
  }
}, 20000);

setTimeout(initialize, 300);
