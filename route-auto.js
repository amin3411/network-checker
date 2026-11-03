/* Network Checker V3: read-only public route observation; no API credentials.
   RIPE Atlas results are measured from third-party probes, NEVER from the website visitor.
   Geography comes from approximate IP lookup, not verified physical router locations. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const ATLAS = 'https://atlas.ripe.net/api/v2';
 const STAT = 'https://stat.ripe.net/data';
 const GEO = 'https://ipwho.is/';
 const SVG = 'http://www.w3.org/2000/svg';
 const MAX_HOPS = 11;
 const cache = new Map();
 let busy = false;
 const timeoutFetch = async (url, ms=11000) => {
   const abort = new AbortController();
   const timer = setTimeout(() => abort.abort(), ms);
   try {
     const res = await fetch(url, {signal:abort.signal, credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer', headers:{Accept:'application/json'}});
     if(!res.ok) throw new Error(`API HTTP ${res.status}`);
     return await res.json();
   } finally { clearTimeout(timer); }
 };
 const message=(s,warning=false)=>{const el=$('auto-message');el.textContent=s;el.classList.toggle('auto-warning',warning)};
 const getIP = v => {const a=v.split('.');return a.length===4&&a.every(p=>/^\d{1,3}$/.test(p)&&Number(p)<=255)};
 function publicIPv4(ip){
   if(!getIP(ip))return false;
   const [a,b,c,d]=ip.split('.').map(Number);
   if(a===0||a===10||a===127||a>=224||a===255||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19)||a===192&&b===0||a===192&&b===88&&c===99||a===198&&b===51&&c===100||a===203&&b===0&&c===113) return false;
   return !(a===192&&b===0&&c===2 ||a===192&&b===0&&c===170 ||a===192&&b===0&&c===171||a===192&&b===0&&c===9||a===192&&b===0&&c===10||a===192&&b===0&&c===0&&d===0);
 }
 async function geolocate(ip){
   if(cache.has(ip))return cache.get(ip);
   const d=await timeoutFetch(GEO+encodeURIComponent(ip));
   if(d.success===false || !Number.isFinite(Number(d.latitude)) || !Number.isFinite(Number(d.longitude)))throw new Error('Geolocation unavailable');
   const g={ip:d.ip||ip,lat:Number(d.latitude),lon:Number(d.longitude),city:d.city||'',region:d.region||'',country:d.country||'',asn:d.connection?.asn||'',isp:d.connection?.isp||''};
   cache.set(ip,g);return g;
 }
 const cities={Adelaide:{lat:-34.9285,lon:138.6007},Sydney:{lat:-33.8688,lon:151.2093},Melbourne:{lat:-37.8136,lon:144.9631},Brisbane:{lat:-27.4698,lon:153.0251},Perth:{lat:-31.9523,lon:115.8613}};
 const point=(lat,lon)=>({x:(Number(lon)+180)*2.5,y:(85-Number(lat))*2.5});
 const distance=(a,b)=> {const lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180,dlat=lat2-lat1,dlon=(b.lon-a.lon)*Math.PI/180;return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2)));};
 const clear=(node)=>node.replaceChildren();
 const draw=(tag,attrs,txt)=>{const e=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(txt!==undefined)e.textContent=txt;$('route-vectors').append(e);return e;};
 function renderMap(source,hops){
   clear($('route-vectors'));
   $('map-placeholder').style.display='none';
   const pts=[];
   if(source){pts.push({...source,name:'SOURCE (approx.)'});}
   for(const h of hops){if(h.geo)pts.push({lat:h.geo.lat,lon:h.geo.lon,name:`${h.n}: ${h.geo.city||h.ip}`});}
   if(!pts.length){$('map-placeholder').style.display='';return;}
   for(let i=1;i<pts.length;i++){
     const a=point(pts[i-1].lat,pts[i-1].lon),b=point(pts[i].lat,pts[i].lon);
     // Deliberately skip exact duplicate positions; line is an approximate visual connection only.
     if(Math.hypot(a.x-b.x,a.y-b.y)>1)draw('path',{d:`M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`,class:'auto-route-segment'});
   }
   pts.forEach((p,i)=>{const q=point(p.lat,p.lon);draw('circle',{cx:q.x,cy:q.y,r:i===0?6:4,class:'auto-route-point'});if(i===0||i===pts.length-1||i%2===0)draw('text',{x:Math.max(5,Math.min(790,q.x+8)),y:Math.max(14,Math.min(350,q.y-9)),class:'auto-route-label'},p.name.slice(0,27));});
 }
 function safeLink(url,label,parent){const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer';a.target='_blank';a.textContent=label;parent.append(a);}
 function addTable(hops){
   const wrapper=$('auto-hop-table');clear(wrapper);
   const t=document.createElement('table'),head=document.createElement('thead'),hr=document.createElement('tr');
   ['Hop','IP / response','RTT','Approximate location / notes'].forEach(v=>{const th=document.createElement('th');th.textContent=v;hr.append(th)});head.append(hr);t.append(head);
   const body=document.createElement('tbody');
   hops.forEach(h=>{const tr=document.createElement('tr');const values=[String(h.n),h.ip||'No response',h.rtt===null?'—':`${h.rtt.toFixed(1)} ms`,h.geo?[h.geo.city,h.geo.country].filter(Boolean).join(', '):h.ip?'Not geolocated':'Timed out'];values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;if(i===1&&h.ip&&publicIPv4(h.ip)){td.append(' · ');safeLink('https://bgp.he.net/ip/'+encodeURIComponent(h.ip),'BGP',td)}tr.append(td)});body.append(tr)});t.append(body);wrapper.append(t);
 }
 function extractHops(result){
   if(!Array.isArray(result?.result))return [];
   return result.result.slice(0,40).map(h=>{
     const entries=(Array.isArray(h.result)?h.result:[]);
     const replies=entries.filter(v=>typeof v?.from==='string' && getIP(v.from));
     const selected=replies.find(v=>publicIPv4(v.from))||replies[0];
     const rtts=replies.map(v=>Number(v.rtt)).filter(Number.isFinite);
     return {n:Number(h.hop)||0,ip:selected?.from||null,rtt:rtts.length?Math.min(...rtts):null,geo:null};
   }).filter(h=>h.n>0&&h.n<=40);
 }
 function probeLocation(p){
   const xy=p?.geometry?.coordinates;
   if(Array.isArray(xy)&&xy.length>=2&&Number.isFinite(Number(xy[0]))&&Number.isFinite(Number(xy[1])))return {lat:Number(xy[1]),lon:Number(xy[0])};
   return null;
 }
 async function findAtlasMeasurement(target,source){
   const params=new URLSearchParams({type:'traceroute',target_ip:target,af:'4',page_size:'15',format:'json'});
   const list=await timeoutFetch(`${ATLAS}/measurements/?${params}`);
   const candidates=(list.results||[]).filter(v=>v?.is_public!==false && Number(v?.id)>0).slice(0,10);
   // Select an observation with useful modern data and a probe geographically near source.
   let best=null;
   for(const m of candidates.slice(0,5)){
     let results;
     try{results=await timeoutFetch(`${ATLAS}/measurements/${m.id}/latest/?format=json&lookback_days=7`,16000)}catch{continue}
     if(!Array.isArray(results))continue;
     const eligible=results.filter(r=>r.af===4 && r.prb_id && Array.isArray(r.result) && extractHops(r).some(h=>h.ip)).slice(0,45);
     if(!eligible.length)continue;
     const uniqueIds=[...new Set(eligible.map(r=>r.prb_id))].slice(0,10);
     const probeData=await Promise.all(uniqueIds.map(async id=>{try{return await timeoutFetch(`${ATLAS}/probes/${id}/?format=json`,8000)}catch{return null}}));
     const positions=new Map(probeData.filter(Boolean).map(p=>[p.id,probeLocation(p)]));
     const ranked=eligible.map(r=>({r,loc:positions.get(r.prb_id),score:positions.get(r.prb_id)?distance(source,positions.get(r.prb_id)):Infinity})).sort((a,b)=>a.score-b.score);
     const choice=ranked[0];if(!choice)continue;
     const ageDays=(Date.now()/1000-Number(choice.r.timestamp||0))/86400;
     if(!Number.isFinite(ageDays)||ageDays>8||ageDays<-.5)continue;
     if(!best||choice.score<best.score)best={...choice,measurement:m.id,ageDays};
     if(best.score<100)break;
   }
   return best;
 }
 async function lookupBGPRoutes(target,element){
   try{
     const obj=await timeoutFetch(`${STAT}/looking-glass/data.json?resource=${encodeURIComponent(target)}`);
     const peers=obj?.data?.rrcs||[];
     const routes=[];
     for(const rrc of peers){for(const p of (rrc.peers||[])){for(const a of (p.as_path||[])){/* optional API variants */}const paths=p.routes||[];for(const item of paths){const path=item.as_path||item.path;if(Array.isArray(path)&&path.length){routes.push(path.join(' → '));break}}if(routes.length)break}if(routes.length)break}
     element.textContent=routes.length?`Observed BGP AS path (collector perspective): ${routes[0].slice(0,260)}`:'BGP Looking Glass available via the link below; AS-path layout varies by collector.';
   }catch{element.textContent='BGP Looking Glass unavailable or blocked by browser policy.'}
 }
 async function start(){
   if(busy)return;
   const target=$('auto-destination').value.trim();
   if(!getIP(target)||!publicIPv4(target)){message('Enter a public IPv4 address (e.g. 8.8.8.8). This version does not resolve hostnames or IPv6.',true);return}
   if(!$('auto-consent').checked){message('Please approve sending public IP addresses to the external APIs.',true);return}
   busy=true;$('auto-run').disabled=true;clear($('auto-hop-table'));
   try{
     message('Detecting source IP and querying network intelligence…');
     const sourceGeo=await geolocate(''); // requesting / returns the public IP of the visitor
     const chosen=$('auto-origin').value;
     const source=chosen==='auto'?sourceGeo:cities[chosen];
     $('auto-source').textContent=`${sourceGeo.ip} · ${sourceGeo.isp||'ISP unknown'} · ${chosen==='auto'?(sourceGeo.city||'Unknown city'):(chosen+' (user selected)')}`;
     const info=await timeoutFetch(`${STAT}/network-info/data.json?resource=${encodeURIComponent(target)}`);
     $('auto-target').textContent=`${target} · ${(info?.data?.asns||[]).map(x=>'AS'+x).join(', ')||'ASN unknown'} · ${info?.data?.prefix||'Prefix unknown'}`;
     const bgpDiv=$('auto-bgp');clear(bgpDiv);
     safeLink(`https://bgp.he.net/ip/${encodeURIComponent(target)}`,'Hurricane Electric IP lookup',bgpDiv);
     bgpDiv.append(' · ');safeLink(`https://stat.ripe.net/app/launchpad/S1_${encodeURIComponent(target)}`,'RIPEstat',bgpDiv);
     const detail=document.createElement('div');bgpDiv.append(detail);
     await lookupBGPRoutes(target,detail);
     message('Searching public RIPE Atlas traceroute measurements…');
     let match=null;
     try{match=await findAtlasMeasurement(target,source)}catch(e){message(`Atlas lookup failed: ${e.message}. BGP details remain available.`,true)}
     if(!match){renderMap(source,[]);$('auto-observation').textContent='No matching recent public measurement';$('auto-details').textContent='No suitable recent traceroute was available through the public API. The website cannot infer physical hops from BGP data. Try a different target or use manual traceroute below.';if(!$('auto-message').classList.contains('auto-warning'))message('No public RIPE Atlas route available. BGP information shown; no hops invented.',true);return}
     const hops=extractHops(match.r);
     // Keep only some public IPs per request; avoid excessive third-party API usage.
     const unique=[...new Set(hops.map(h=>h.ip).filter(publicIPv4))].slice(0,MAX_HOPS);
     message(`Measurement ${match.measurement} found. Geolocating up to ${unique.length} public hops…`);
     const locations=new Map();
     for(const ip of unique){try{locations.set(ip,await geolocate(ip))}catch{/* preserve unknown locations */}}
     hops.forEach(h=>{h.geo=locations.get(h.ip)||null});
     renderMap(source,hops);addTable(hops);
     $('auto-observation').textContent=`Atlas probe ${match.r.prb_id} · ${Number.isFinite(match.score)?Math.round(match.score)+' km from chosen city (approx.)':'location unknown'}`;
     clear($('auto-details'));
     const meta=document.createElement('p');meta.textContent=`Measurement ID ${match.measurement} · Probe ID ${match.r.prb_id} · ${new Date(Number(match.r.timestamp)*1000).toLocaleString()} · ${hops.length} responding/timed-out hop positions. Source: RIPE Atlas public traceroute. This is not your own route.`;$('auto-details').append(meta);
     safeLink(`${ATLAS}/measurements/${match.measurement}/`,'View source measurement',$('auto-details'));
     message(`Plotted ${hops.filter(h=>h.geo).length} approximately located public-hop responses from a third-party probe. No unmeasured hops added.`);
   }catch(e){message(`Lookup unsuccessful: ${e.message}. Check CORS, CSP and provider rate limits.`,true)}
   finally{busy=false;$('auto-run').disabled=false}
 }
 $('auto-run')?.addEventListener('click',start);
})();
