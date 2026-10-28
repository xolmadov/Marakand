const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
// .env fayli (ixtiyoriy): KEY=VALUE qatorlari
try{for(const l of fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}}catch{}
const E=process.env,PORT=+E.PORT||3000,PASS=E.ADMIN_PASSWORD||'',AP='/'+(E.ADMIN_PATH||'panel').replace(/^\/+/,''),SEC=E.SECRET||crypto.randomBytes(32).toString('hex'),TG=E.TG_API||'https://api.telegram.org';
const DIR=E.DATA_DIR||__dirname,DB=path.join(DIR,'data.json'),UP=path.join(DIR,'uploads'),PUB=path.join(__dirname,'public');
// Supabase (ixtiyoriy): SUPABASE_URL + SUPABASE_KEY berilsa, ma'lumot va rasmlar Supabase'da saqlanadi
const SB=E.SUPABASE_URL&&E.SUPABASE_KEY?{u:E.SUPABASE_URL.replace(/\/+$/,''),k:E.SUPABASE_KEY,b:E.SUPABASE_BUCKET||'uploads'}:null;
if(!SB)fs.mkdirSync(UP,{recursive:true});
const KEEP=E.ORDER_KEEP_DAYS!==undefined&&E.ORDER_KEEP_DAYS!==''?Math.max(0,+E.ORDER_KEEP_DAYS||0):3;
const CSP=n=>["default-src 'self'","script-src 'self' 'nonce-"+n+"' https://cdnjs.cloudflare.com https://maps.googleapis.com https://maps.gstatic.com","style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://maps.googleapis.com","font-src 'self' https://fonts.gstatic.com data:","img-src 'self' data: blob: https://commons.wikimedia.org https://upload.wikimedia.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://api.maptiler.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com"+(SB?' https://*.supabase.co':''),"connect-src 'self' https://nominatim.openstreetmap.org https://*.googleapis.com","worker-src blob:","frame-src 'none'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].join('; ');
const cl=(s,n)=>String(s??'').trim().slice(0,n),h=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const PLOV='https://commons.wikimedia.org/wiki/Special:FilePath/Samarkan_Pilaf.jpg?width=700';
const seedMenu=[
['Osh (palov)','Taomlar',38000,'Andijon uslubida, goʻsht va sabzi bilan'],['Lagʻmon','Taomlar',32000,'Qoʻlda choʻzilgan xamir, sabzavot'],
['Manti (5 dona)','Taomlar',30000,'Bugʻda pishgan, qaymoq bilan'],['Shurva','Taomlar',28000,'Goʻshtli, kartoshkali'],
['Shashlik (1 six)','Gril',22000,'Mol goʻshti, piyoz bilan'],['Somsa','Gril',12000,'Tandirda pishgan'],
['Achichuk','Salatlar',15000,'Pomidor, piyoz, ziravorlar'],['Tandir non','Salatlar',5000,'Issiq non'],
['Choy (choynak)','Ichimliklar',10000,'Qora yoki yashil'],['Coca-Cola 0.5 l','Ichimliklar',9000,'Sovuq'],['Chak-chak','Shirinliklar',18000,'Asal bilan']
].map((x,i)=>({id:i+1,n:x[0],c:x[1],p:x[2],e:'',d:x[3],a:1,img:i===0?PLOV:''}));
const seedSlides=[
{id:1,a:1,k:'Marakand cafe · Poytugʻ',h:'Milliy taomlarning *haqiqiy taʼmi*',p:'Issiq palov, lagʻmon, manti va shashlik. Kafemizda yoki uyingizda tanovul qiling.',b:'Menyuni koʻrish',l:'#menu',i1:'/photos/p3.jpg',i2:'/photos/p1.jpg',ic:'star',bt:'4.2 · Yandex Xaritalar',bs:'Mehmonlar bahosi'},
{id:2,a:1,k:'Yetkazib berish',h:'Issiq taom *eshigingizgacha*',p:'Saytdan buyurtma bering. Biz qabul qilamiz va siz bilan bogʻlanamiz.',b:'Buyurtma berish',l:'#menu',i1:'/photos/p2.jpg',i2:'/photos/p3.jpg',ic:'bike',bt:'Poytugʻ boʻylab',bs:'Yetkazib berish'},
{id:3,a:1,k:'Qulay toʻlov',h:'Toʻlov *naqd pul* bilan',p:'Oldindan hech narsa toʻlamaysiz. Taomni qabul qilganingizda kuryerga naqd toʻlaysiz.',b:'Menyuga oʻtish',l:'#menu',i1:'/photos/p1.jpg',i2:'/photos/p2.jpg',ic:'cash',bt:'Naqd pul',bs:'Kuryerga toʻlaysiz'},
{id:4,a:1,k:'Kofe olib ketish',h:'Kafemizga *xush kelibsiz*',p:'Qulay muhit, serviz dasturxon va mehmondoʻst xizmat. Kofeni oʻzingiz bilan olib ketishingiz ham mumkin.',b:'Manzilimiz',l:'#contact',i1:'/photos/p1.jpg',i2:'/photos/p3.jpg',ic:'clock',bt:'07:00 – 23:00',bs:'Ish vaqti'}];
const seedGal=[{id:1,img:'/photos/p1.jpg',t:''},{id:2,img:'/photos/p3.jpg',t:''},{id:3,img:'/photos/p2.jpg',t:''}];
let db={menu:seedMenu,orders:[],slides:seedSlides,gallery:seedGal,settings:{aboutImg:''},lastId:1000};
// ---- Supabase (REST, kutubxonasiz) ----
const sbh=x=>({apikey:SB.k,...(SB.k.startsWith('sb_')?{}:{authorization:'Bearer '+SB.k}),...x});
async function sbFetch(url,opt,tries=3){let err;for(let i=0;i<tries;i++){try{const r=await fetch(url,opt);if(r.ok||r.status===409)return r;err=new Error('Supabase '+r.status+': '+(await r.text()).slice(0,180))}catch(e){err=e}await new Promise(s=>setTimeout(s,400*(i+1)))}throw err}
const sbPut=(key,value)=>sbFetch(`${SB.u}/rest/v1/kv?on_conflict=key`,{method:'POST',headers:sbh({'content-type':'application/json',prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({key,value,updated_at:new Date().toISOString()})});
const sbDel=key=>sbFetch(`${SB.u}/rest/v1/kv?key=eq.${encodeURIComponent(key)}`,{method:'DELETE',headers:sbh()});
async function sbAll(){const out=[];for(let off=0;;off+=1000){const r=await sbFetch(`${SB.u}/rest/v1/kv?select=key,value&order=key&limit=1000&offset=${off}`,{headers:sbh()});const rows=await r.json();out.push(...rows);if(rows.length<1000)break}return out}
async function sbUpload(name,buf){await sbFetch(`${SB.u}/storage/v1/object/${SB.b}/${name}`,{method:'POST',headers:sbh({'content-type':'image/jpeg','x-upsert':'true'}),body:buf});return `${SB.u}/storage/v1/object/public/${SB.b}/${name}`}
// ---- saqlash ----
async function purge(){
  const n=Date.now(),old=db.orders.filter(o=>o.done&&n-o.done>=KEEP*864e5);let any=false;
  for(const o of old){try{if(SB)await sbDel('order:'+o.id);db.orders=db.orders.filter(x=>x!==o);any=true}catch(e){console.error('Eski buyurtmani oʻchirish xatosi:',e.message)}}
  if(any&&!SB)saveLocal();
}
const saveLocal=()=>{fs.writeFileSync(DB+'.tmp',JSON.stringify(db));fs.renameSync(DB+'.tmp',DB)};
const saveK=async k=>{if(SB)await sbPut(k,db[k]);else saveLocal()};
const saveOrder=async o=>{if(SB)await sbPut('order:'+o.id,o);else saveLocal()};
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const IMG=new RegExp('^(/img/[\\w-]+\\.jpg|/photos/[\\w-]+\\.jpg|https://commons\\.wikimedia\\.org/wiki/Special:FilePath/[\\w%.\\-]+(\\?width=\\d+)?'+(SB?'|'+esc(SB.u)+'/storage/v1/object/public/'+esc(SB.b)+'/[\\w-]+\\.jpg':'')+')$');
const okImg=s=>IMG.test(s||'')?s:'',ICS=['star','bike','cash','clock'];
const cleanMenu=(m,i)=>({id:Math.floor(+m.id)||Date.now()+i,n:cl(m.n,60),c:cl(m.c,30)||'Boshqa',p:Math.max(0,Math.floor(+m.p)||0),e:'',d:cl(m.d,120),a:m.a?1:0,img:okImg(m.img)});
const cleanSlide=(s,i)=>({id:Math.floor(+s.id)||Date.now()+i,a:s.a?1:0,k:cl(s.k,60),h:cl(s.h,120),p:cl(s.p,260),b:cl(s.b,30),l:/^(#[\w-]*|\/[\w\-\/]*)$/.test(s.l||'')?s.l:'#menu',i1:okImg(s.i1),i2:okImg(s.i2),ic:ICS.includes(s.ic)?s.ic:'',bt:cl(s.bt,50),bs:cl(s.bs,50)});
const cleanGal=(g,i)=>({id:Math.floor(+g.id)||Date.now()+i,img:okImg(g.img),t:cl(g.t,80)});
function gc(){if(SB)return;try{const u=new Set(),add=x=>{const m=/^\/img\/([\w-]+\.jpg)$/.exec(x||'');if(m)u.add(m[1])};db.menu.forEach(m=>add(m.img));db.slides.forEach(s=>{add(s.i1);add(s.i2)});db.gallery.forEach(g=>add(g.img));add(db.settings.aboutImg);for(const f of fs.readdirSync(UP))if(!u.has(f)&&Date.now()-fs.statSync(path.join(UP,f)).mtimeMs>864e5)fs.unlinkSync(path.join(UP,f))}catch(e){console.error('gc:',e.message)}}
// ---- Telegram ----
const tgOn=()=>!!(E.BOT_TOKEN&&E.CHAT_ID);
async function tgCall(method,body){const r=await fetch(`${TG}/bot${E.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));if(!j.ok)throw new Error(j.description||'HTTP '+r.status);return j.result}
async function tg(o){
  if(!tgOn())return false;
  const t=`🆕 <b>Buyurtma #${o.id}</b>\n👤 ${h(o.name)}\n📞 ${h(o.phone)}\n📍 ${h(o.addr)}\n━━━━━━━━\n`+o.items.map(i=>`• ${h(i.n)} × ${i.q} — ${(i.p*i.q).toLocaleString('ru-RU')}`).join('\n')+`\n━━━━━━━━\n💰 <b>Jami: ${o.total.toLocaleString('ru-RU')} soʻm</b> (${o.pay})`+(o.note?`\n💬 ${h(o.note)}`:'')+(o.lat!=null?`\n🗺 <a href="https://yandex.uz/maps/?pt=${o.lng},${o.lat}&amp;z=17&amp;l=map">Yandex</a> · <a href="https://www.google.com/maps?q=${o.lat},${o.lng}">Google</a>`:'');
  try{await tgCall('sendMessage',{chat_id:E.CHAT_ID,text:t,parse_mode:'HTML',disable_web_page_preview:true});if(o.lat!=null)await tgCall('sendLocation',{chat_id:E.CHAT_ID,latitude:o.lat,longitude:o.lng});return true}
  catch(e){console.error('Telegram xatosi:',e.message);return false}
}
// ---- auth ----
const sign=x=>crypto.createHmac('sha256',SEC).update(x).digest('hex'),sha=x=>crypto.createHash('sha256').update(x).digest();
const authed=req=>{const m=(req.headers.cookie||'').match(/(?:^|; )s=(\d+)\.([a-f0-9]+)/);if(!m||!SEC)return false;const a=Buffer.from(sign(m[1])),b=Buffer.from(m[2]);return a.length===b.length&&crypto.timingSafeEqual(a,b)&&+m[1]>Date.now()};
const tries=new Map(),ordT=new Map(),postT=new Map();
setInterval(()=>{const n=Date.now();for(const m of[tries,ordT,postT])for(const[k,v]of m)if(Array.isArray(v)?!v.some(t=>n-t<6e5):n-v.t>6e5)m.delete(k)},6e5).unref();
const body=(req,max=2e5)=>new Promise((r,j)=>{let d='';req.on('data',c=>{d+=c;if(d.length>max){req.destroy();j(new Error('big'))}});req.on('end',()=>{try{r(JSON.parse(d||'{}'))}catch{j(new Error('json'))}})});
const send=(res,c,o,hd={})=>{res.writeHead(c,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...hd});res.end(JSON.stringify(o))};
const sendFile=(res,f,type,hd={})=>fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('404')}res.writeHead(200,{'content-type':type,'x-content-type-options':'nosniff',...hd});res.end(d)});
const page=(res,f,extra={})=>fs.readFile(path.join(PUB,f),'utf8',(e,d)=>{
  if(e){res.writeHead(404);return res.end('404')}
  const n=crypto.randomBytes(16).toString('base64');
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache','x-frame-options':'DENY','content-security-policy':CSP(n),...extra});
  res.end(d.replace(/<script>/g,'<script nonce="'+n+'">'));
});
const fail=(res,e)=>{console.error('Saqlash xatosi:',e.message);send(res,500,{error:'Saqlab boʻlmadi: '+e.message})};
const server=http.createServer(async(req,res)=>{try{
  const M=req.method==='HEAD'?'GET':req.method,u=req.url.split('?')[0],ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','strict-origin-when-cross-origin');res.setHeader('permissions-policy','geolocation=(self), camera=(), microphone=(), payment=()');res.setHeader('cross-origin-opener-policy','same-origin');
  if(req.headers['x-forwarded-proto']==='https')res.setHeader('strict-transport-security','max-age=31536000; includeSubDomains');
  if(M==='GET'){
    if(u==='/healthz')return send(res,200,{ok:1,db:SB?'supabase':'local'});
    if(u==='/')return page(res,'index.html');
    if(u===AP)return page(res,'admin.html',{'x-robots-tag':'noindex, nofollow','cache-control':'no-store','referrer-policy':'same-origin'});
    if(u==='/logo.png'||u==='/favicon.png')return sendFile(res,path.join(PUB,u),'image/png',{'cache-control':'public, max-age=86400'});
    let m;
    if(m=u.match(/^\/photos\/([\w-]+\.jpg)$/))return sendFile(res,path.join(PUB,'photos',m[1]),'image/jpeg',{'cache-control':'public, max-age=604800'});
    if(!SB&&(m=u.match(/^\/img\/([\w-]+\.jpg)$/)))return sendFile(res,path.join(UP,m[1]),'image/jpeg',{'cache-control':'public, max-age=2592000'});
    if(u==='/api/menu')return send(res,200,db.menu.filter(x=>x.a));
    if(u==='/api/slides')return send(res,200,db.slides.filter(x=>x.a));
    if(u==='/api/gallery')return send(res,200,db.gallery);
    if(u==='/api/settings')return send(res,200,db.settings);
    if(u==='/api/admin/data')return authed(req)?send(res,200,{menu:db.menu,orders:db.orders.slice(-300),slides:db.slides,gallery:db.gallery,settings:db.settings,tg:{on:tgOn()},db:SB?'supabase':'local',keep:KEEP}):send(res,401,{error:'Ruxsat yoʻq'});
    res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});return res.end('404 — sahifa topilmadi');
  }
  if(M!=='POST')return res.writeHead(405).end();
  const og=req.headers.origin;if(og){try{if(new URL(og).host!==req.headers.host)return send(res,403,{error:'Ruxsat yoʻq'})}catch{return send(res,403,{error:'Ruxsat yoʻq'})}}
  if(!/^application\/json/i.test(req.headers['content-type']||''))return send(res,415,{error:'Notoʻgʻri soʻrov turi'});
  const pn=Date.now(),pl=(postT.get(ip)||[]).filter(t=>pn-t<6e4);if(pl.length>=120)return send(res,429,{error:'Juda koʻp soʻrov'});pl.push(pn);postT.set(ip,pl);
  let b;try{b=await body(req,u==='/api/admin/upload'&&authed(req)?5e6:2e5)}catch(e){return send(res,e.message==='big'?413:400,{error:e.message==='big'?'Soʻrov juda katta (rasm hajmi katta)':'Xato soʻrov'})}
  if(u==='/api/order'){
    if(b.hp)return send(res,200,{id:0});
    const now=Date.now(),L=(ordT.get(ip)||[]).filter(t=>now-t<6e5);
    if(L.length>=6)return send(res,429,{error:'Juda koʻp buyurtma. Birozdan keyin urinib koʻring'});
    const items=[];let total=0;
    for(const it of Array.isArray(b.items)?b.items.slice(0,40):[]){const m=db.menu.find(x=>x.id===it.id&&x.a),q=Math.floor(+it.q);if(m&&q>=1&&q<=50){items.push({n:m.n,q,p:m.p});total+=m.p*q}}
    const name=cl(b.name,60),phone=cl(b.phone,25),addr=cl(b.addr,200);
    if(!items.length)return send(res,400,{error:'Savat boʻsh yoki taomlar mavjud emas'});
    if(!name)return send(res,400,{error:'Ismingizni kiriting'});
    if(phone.replace(/\D/g,'').length<9)return send(res,400,{error:'Telefon raqamini toʻgʻri kiriting'});
    if(!addr)return send(res,400,{error:'Yetkazish manzilini kiriting'});
    const la=b.lat==null||b.lat===''?NaN:+b.lat,lo=b.lng==null||b.lng===''?NaN:+b.lng,geo=Number.isFinite(la)&&Number.isFinite(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180;
    const o={id:++db.lastId,t:now,name,phone,addr,note:cl(b.note,300),pay:'Naqd',items,total,st:0,tg:null,...(geo?{lat:+la.toFixed(6),lng:+lo.toFixed(6)}:{})};
    L.push(now);ordT.set(ip,L);db.orders.push(o);
    if(SB)sbPut('meta',{lastId:db.lastId}).catch(()=>{});
    await saveOrder(o).catch(e=>console.error('Buyurtmani saqlash xatosi:',e.message));
    o.tg=await tg(o);await saveOrder(o).catch(e=>console.error('Buyurtmani yangilash xatosi:',e.message));
    return send(res,200,{id:o.id});
  }
  if(u==='/api/login'){
    const t=tries.get(ip)||{n:0,t:Date.now()};if(Date.now()-t.t>6e4){t.n=0;t.t=Date.now()}
    if(t.n>=5)return send(res,429,{error:'Biroz kuting'});t.n++;tries.set(ip,t);
    if(!PASS||!crypto.timingSafeEqual(sha(String(b.password||'')),sha(PASS)))return send(res,401,{error:'Parol notoʻgʻri'});
    const x=String(Date.now()+6048e5),sec=req.headers['x-forwarded-proto']==='https'?'; Secure':'';
    return send(res,200,{ok:1},{'set-cookie':`s=${x}.${sign(x)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${sec}`});
  }
  if(!authed(req))return send(res,401,{error:'Ruxsat yoʻq'});
  if(u==='/api/admin/logout')return send(res,200,{ok:1},{'set-cookie':'s=; Path=/; HttpOnly; Max-Age=0'});
  if(u==='/api/admin/status'){const o=db.orders.find(x=>x.id===b.id);if(o&&b.st>=0&&b.st<=4){o.st=b.st;o.done=b.st>=3?Date.now():null;try{await saveOrder(o)}catch(e){return fail(res,e)}if(KEEP===0&&o.st>=3)await purge()}return send(res,200,{ok:1})}
  if(u==='/api/admin/resend'){const o=db.orders.find(x=>x.id===b.id);if(!o)return send(res,404,{error:'Buyurtma topilmadi'});o.tg=await tg(o);try{await saveOrder(o)}catch(e){return fail(res,e)}return send(res,200,{ok:o.tg})}
  if(u==='/api/admin/menu'&&Array.isArray(b.menu)){db.menu=b.menu.slice(0,300).map(cleanMenu).filter(m=>m.n&&m.p>0);try{await saveK('menu')}catch(e){return fail(res,e)}gc();return send(res,200,{ok:1,menu:db.menu})}
  if(u==='/api/admin/slides'&&Array.isArray(b.slides)){db.slides=b.slides.slice(0,20).map(cleanSlide).filter(s=>s.h);try{await saveK('slides')}catch(e){return fail(res,e)}gc();return send(res,200,{ok:1,slides:db.slides})}
  if(u==='/api/admin/gallery'&&Array.isArray(b.gallery)){db.gallery=b.gallery.slice(0,60).map(cleanGal).filter(g=>g.img);try{await saveK('gallery')}catch(e){return fail(res,e)}gc();return send(res,200,{ok:1,gallery:db.gallery})}
  if(u==='/api/admin/settings'){db.settings={aboutImg:okImg(b.aboutImg)};try{await saveK('settings')}catch(e){return fail(res,e)}gc();return send(res,200,{ok:1,settings:db.settings})}
  if(u==='/api/admin/upload'){
    const m=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(b.data||'');if(!m)return send(res,400,{error:'Rasm formati notoʻgʻri (JPG boʻlishi kerak)'});
    const buf=Buffer.from(m[1],'base64');if(buf.length>4e6)return send(res,413,{error:'Rasm juda katta'});
    if(!(buf[0]===0xff&&buf[1]===0xd8&&buf[2]===0xff))return send(res,400,{error:'Bu rasm fayli emas'});
    const f=crypto.randomBytes(8).toString('hex')+'.jpg';
    try{if(SB)return send(res,200,{url:await sbUpload(f,buf)});fs.writeFileSync(path.join(UP,f),buf);return send(res,200,{url:'/img/'+f})}catch(e){return fail(res,e)}
  }
  if(u==='/api/admin/telegram-test'){
    if(!tgOn())return send(res,200,{ok:false,error:'BOT_TOKEN yoki CHAT_ID berilmagan. .env faylini tekshiring.'});
    try{const me=await tgCall('getMe');await tgCall('sendMessage',{chat_id:E.CHAT_ID,text:'✅ Marakand: test xabar. Telegram ulanishi ishlayapti.'});return send(res,200,{ok:true,bot:'@'+me.username})}
    catch(e){return send(res,200,{ok:false,error:e.message})}
  }
  send(res,404,{error:'Topilmadi'});
}catch(e){console.error(e);try{send(res,500,{error:'Server xatosi'})}catch{}}});
async function boot(){
  if(SB){
    let rows;
    try{rows=await sbAll()}catch(e){console.error('Supabase bilan ulanib boʻlmadi: '+e.message+'\nAgar "kv" jadvali yoʻq boʻlsa, supabase.sql ni Supabase SQL Editor da ishga tushiring.');process.exit(1)}
    const g=k=>{const r=rows.find(x=>x.key===k);return r&&Array.isArray(r.value)?r.value:null};
    for(const k of['menu','slides','gallery']){const v=g(k);if(v)db[k]=v;else await saveK(k).catch(e=>console.error('Boshlangʻich maʼlumotni yozib boʻlmadi:',e.message))}
    const stv=rows.find(x=>x.key==='settings');if(stv&&stv.value&&typeof stv.value==='object'&&!Array.isArray(stv.value))db.settings={aboutImg:okImg(stv.value.aboutImg)};
    db.orders=rows.filter(x=>String(x.key).startsWith('order:')).map(x=>x.value).sort((a,b)=>a.id-b.id);
    const mt=rows.find(x=>x.key==='meta');db.lastId=Math.max(1000,(mt&&mt.value&&+mt.value.lastId)||0);
    await sbFetch(`${SB.u}/storage/v1/bucket`,{method:'POST',headers:sbh({'content-type':'application/json'}),body:JSON.stringify({id:SB.b,name:SB.b,public:true})},1).catch(()=>{});
    setInterval(()=>sbFetch(`${SB.u}/rest/v1/kv?select=key&limit=1`,{headers:sbh()}).catch(e=>console.error('Supabase keep-alive:',e.message)),6*36e5);
  }else{try{const d=JSON.parse(fs.readFileSync(DB,'utf8'));for(const k of['menu','slides','gallery'])if(Array.isArray(d[k]))db[k]=d[k];if(Array.isArray(d.orders))db.orders=d.orders;if(d.settings&&typeof d.settings==='object')db.settings={aboutImg:okImg(d.settings.aboutImg)};db.lastId=Math.max(1000,+d.lastId||0)}catch{}gc()}
  db.menu.forEach(m=>{if(m.id===1&&m.n==='Osh (palov)'&&!m.img)m.img=PLOV});
  db.lastId=Math.max(db.lastId,...db.orders.map(o=>+o.id||0),1000);db.orders.forEach(o=>{if(o.st>=3&&!o.done)o.done=Date.now()});
  await purge();setInterval(()=>purge().catch(()=>{}),36e5).unref();
  server.listen(PORT,()=>{console.log('Marakand: http://localhost:'+PORT,'| admin:',AP,'| maʼlumot:',SB?'Supabase':'mahalliy fayl');if(!PASS)console.warn('DIQQAT: ADMIN_PASSWORD berilmagan, admin kirish ishlamaydi');else if(PASS.length<10)console.warn('DIQQAT: ADMIN_PASSWORD juda qisqa (kamida 10 belgi boʻlsin)');if(!E.SECRET)console.warn('DIQQAT: SECRET berilmagan. Server qayta yonganda admin qayta kirishi kerak boʻladi');if(!tgOn())console.warn('Eslatma: BOT_TOKEN/CHAT_ID yoʻq, buyurtmalar Telegramga yuborilmaydi')});
}
boot();
