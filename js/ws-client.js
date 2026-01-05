// Simple WebSocket client with reconnect/backoff and status callback
(function(global){
  function init(url, onData, opts){
    opts = opts || {};
    const statusCb = typeof opts.status === 'function' ? opts.status : (s=>{});
    let ws = null; let stopped=false; let backoff=1000;
    const host = url || ('ws://' + location.hostname + ':' + (opts.port || 8080));

    function connect(){
      if(stopped) return;
      statusCb('connecting');
      try{
        ws = new WebSocket(host);
        ws.onopen = () => { backoff = 1000; statusCb('connected'); };
        ws.onmessage = (m) => { try{ const d = JSON.parse(m.data); if(d.ok) onData(d.patients||[]); }catch(e){} };
        ws.onclose = () => { statusCb('closed'); if(!stopped) scheduleReconnect(); };
        ws.onerror = (e) => { statusCb('error'); if(ws) ws.close(); };
      }catch(err){ statusCb('error'); scheduleReconnect(); }
    }

    function scheduleReconnect(){ setTimeout(()=>{ if(!stopped){ statusCb('reconnecting'); connect(); } }, backoff); backoff = Math.min(16000, backoff*2); }

    connect();

    return { stop(){ stopped=true; if(ws){ ws.close(); ws=null; } statusCb('stopped'); } };
  }

  global.WSClient = { init };
})(window);
