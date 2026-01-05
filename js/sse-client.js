// Lightweight SSE client with reconnection/backoff and polling fallback
(function(window){
  function init(url, onData, opts){
    opts = opts || {};
    const pollInterval = opts.pollInterval || 2000;
    const statusCb = typeof opts.status === 'function' ? opts.status : (id=>{});
    let es = null;
    let stopped = false;
    let backoff = 1000;
    let lastId = null;

    function startSSE(){
      if (stopped) return;
      try{
        es = new EventSource(url);
        statusCb('connecting');
        es.addEventListener('patients', function(e){
          backoff = 1000;
          try{ const d = JSON.parse(e.data); onData(d.patients||[]); } catch(err){}
          if(e.lastEventId) lastId = e.lastEventId;
          statusCb('connected');
        });
        es.addEventListener('ping', function(e){ statusCb('connected'); });
        es.onerror = function(){
          statusCb('error');
          if(es){ es.close(); es=null; }
          // try reconnect with backoff
          setTimeout(()=>{ if(!stopped) startSSE(); }, backoff);
          backoff = Math.min(16000, backoff * 2);
        };
      }catch(err){
        statusCb('unsupported');
        startPolling();
      }
    }

    let pollTimer = null;
    async function startPolling(){
      statusCb('polling');
      if(stopped) return;
      try{ await doPoll(); }catch(e){}
      pollTimer = setInterval(() => { if(!stopped) doPoll(); }, pollInterval);
    }
    async function doPoll(){
      try{
        const res = await fetch(url.replace(/\/stream.php.*$/,'/list_patients.php').replace(/\/php\/stream.php/,'/php/list_patients.php'));
        const json = await res.json();
        if(json && json.ok) onData(json.patients||[]);
      }catch(err){ /* ignore */ }
    }

    startSSE();

    // If a WS client exists, prefer it: WS should set document.body.dataset.ws; we expose that via statusCb
    if (window.WSClient){
      // nothing here, the pages will initialize WSClient separately; reflect status if present
      if(document.body.dataset.ws) statusCb(document.body.dataset.ws);
    }

    return {
      stop(){ stopped=true; if(es){ es.close(); es=null; } if(pollTimer) clearInterval(pollTimer); statusCb('stopped'); }
    };
  }

  window.SSEClient = { init };
})(window);
