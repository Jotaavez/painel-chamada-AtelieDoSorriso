#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const chokidar = require('chokidar');

const DATA_FILE = path.join(__dirname, '..', 'data', 'patients.json');
const PORT = process.env.WS_PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });
console.log('WebSocket server listening on port', PORT);

function broadcast(payload){
  const str = JSON.stringify(payload);
  wss.clients.forEach(c=>{ if(c.readyState===WebSocket.OPEN) c.send(str); });
}

function readAndBroadcast(){
  fs.readFile(DATA_FILE, 'utf8', (err, data)=>{
    if(err) return; try{ const patients = JSON.parse(data||'[]'); broadcast({ ok:true, patients }); }catch(e){}
  });
}

wss.on('connection', (ws)=>{
  console.log('client connected');
  // send current
  fs.readFile(DATA_FILE, 'utf8', (err, data)=>{ if(!err){ try{ ws.send(JSON.stringify({ ok:true, patients: JSON.parse(data||'[]') })); }catch(e){} } });
  ws.on('close', ()=>{ /* noop */ });
});

// watch file changes
const watcher = chokidar.watch(DATA_FILE, { persistent: true, ignoreInitial: true });
watcher.on('change', (p)=>{ console.log('data changed, broadcasting'); readAndBroadcast(); });

// broadcast initial state
readAndBroadcast();
