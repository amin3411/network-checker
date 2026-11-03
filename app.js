'use strict';
const byId = id => document.getElementById(id);
const runButton = byId('run-test');
let currentController = null;
function browserState(){byId('browser-status').textContent = navigator.onLine ? 'ONLINE*' : 'OFFLINE*';}
window.addEventListener('online',browserState);
window.addEventListener('offline',browserState);
browserState();
byId('replay').addEventListener('click',()=>{
  // Replacing the SVG with a local clone restarts CSS animations without remote scripts.
  const svg=document.querySelector('.network');
  const fresh=svg.cloneNode(true);
  svg.replaceWith(fresh);
});
runButton.addEventListener('click',async()=>{
  if(currentController)return;
  const controller=new AbortController();
  currentController=controller;
  runButton.disabled=true;
  byId('request-status').textContent='TESTING';
  byId('http-status').textContent='—';
  byId('duration').textContent='—';
  byId('check-label').textContent='RUNNING';
  byId('result-message').textContent='Sending a fresh HTTPS request to this website…';
  const timeout=setTimeout(()=>controller.abort(),6000);
  const start=performance.now();
  try{
    // Requests are strictly same-origin: there is no free-form target field or backend proxy.
    const url=new URL(window.location.href);
    url.searchParams.set('_probe',crypto.randomUUID());
    const response=await fetch(url,{method:'GET',mode:'same-origin',cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
    const ms=Math.round(performance.now()-start);
    byId('request-status').textContent=response.ok?'REACHABLE':'HTTP ERROR';
    byId('http-status').textContent=String(response.status);
    byId('duration').textContent=`${ms} ms`;
    byId('check-label').textContent=response.ok?'COMPLETE':'ERROR';
    byId('result-message').textContent=response.ok?'Your browser successfully retrieved this website. This does not verify connectivity to other sites, DNS resolvers or TCP ports.':'The website returned an unsuccessful HTTP status.';
  }catch(error){
    byId('request-status').textContent='FAILED';
    byId('check-label').textContent='FAILED';
    byId('duration').textContent=`${Math.round(performance.now()-start)} ms`;
    byId('result-message').textContent=error.name==='AbortError'?'The request exceeded the six-second timeout.':'The request failed, was blocked, or the connection is unavailable.';
  }finally{
    clearTimeout(timeout);
    currentController=null;
    runButton.disabled=false;
    browserState();
  }
});
