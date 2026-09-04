const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = {
  productos: [],
  vendedoras: [
    { id:'ADMIN', nombre:'MARIA PARRA', whatsapp:'3023790715', usuario:'admin', password:'Jeankenchar2024', rol:'ADMIN' }
  ],
  pedidos: [],
  metodosPago: [
    {id:'nequi', nombre:'NEQUI', valor:'3023790715 - Maria Parra', activo:true},
    {id:'breb', nombre:'LLAVE BRE-B', valor:'3023790715', activo:true},
    {id:'bancolombia', nombre:'BANCOLOMBIA', valor:'', activo:true},
    {id:'pse', nombre:'PSE', valor:'', activo:true},
    {id:'daviplata', nombre:'DAVIPLATA', valor:'', activo:true}
  ],
  consecutivo: 1
};

function saveDB(){ try{ fs.writeFileSync('./database.json', JSON.stringify(db, null, 2)); }catch(e){ console.log(e.message) } }
function loadDB(){ try{ if(fs.existsSync('./database.json')) db = JSON.parse(fs.readFileSync('./database.json')); }catch(e){} }
loadDB();

function colorToEmoji(color){
  const m = {azul:'🔵',amarillo:'🟡',verde:'🟢',rojo:'🔴',cafe:'🟤',marron:'🟤',rosado:'🩷',morado:'🟣',naranja:'🟠',blanco:'⚪',negro:'⚫'}
  return m[color?.toLowerCase()] || '⚪'
}

app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err)=>{
    if(err) res.send(`<div style="font-family:sans-serif;text-align:center;padding:50px;background:#fff0f5"><h1 style="color:#ff00aa">💖 JEANKENCHAR BOT LIVE 💖</h1><a href="/admin.html" style="background:#ff00aa;color:white;padding:12px 25px;border-radius:25px;text-decoration:none">Ir al Admin 🤍</a><br><br><a href="/qr">Ver QR Bot</a></div>`);
  });
});

app.get('/qr', (req,res)=>{
  if(!global.qrCode) return res.send(`<div style="font-family:sans-serif;text-align:center;padding:50px;background:#fff0f5;min-height:100vh"><h2>Estado: ${global.botStatus||'Iniciando... espera 30s'}</h2><p>Si dice CONECTADO ya está vinculado 💖</p><a href="/qr" style="background:#ff00aa;color:white;padding:12px 25px;border-radius:20px;text-decoration:none">Recargar 🔄</a><br><br><a href="/admin.html">Volver Admin</a></div>`);
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(global.qrCode)}`;
  res.send(`<div style="text-align:center;padding:30px;font-family:sans-serif;background:#fff0f5;min-height:100vh"><h1 style="color:#ff00aa">💖 Escanea con el cel que quieres que conteste 💖</h1><p>${global.botStatus}</p><img src="${qrImg}" style="border:12px solid white;border-radius:25px"/><br><br><p>WhatsApp > Ajustes > Dispositivos vinculados > Vincular dispositivo</p></div>`);
});

app.get('/api/bot/logout', (req,res)=>{
  try{
    if(fs.existsSync('./.wwebjs_auth')) fs.rmSync('./.wwebjs_auth', {recursive:true, force:true});
    if(fs.existsSync('./.wwebjs_cache')) fs.rmSync('./.wwebjs_cache', {recursive:true, force:true});
    global.qrCode=null; 
    global.botStatus='Sesión borrada. Reiniciando QR... espera 20s y dale a Ver QR';
    try{ global.client.destroy().then(()=>global.client.initialize()); }catch(e){ try{ global.client.initialize(); }catch(e2){} }
    res.json({ok:true});
  }catch(e){ res.json({ok:false, error:e.message}) }
});

app.post('/api/login', (req,res)=>{ const v=db.vendedoras.find(x=> x.usuario===req.body.usuario && x.password===req.body.password); res.json(v?{ok:true,user:v}:{ok:false}) });
app.get('/api/productos', (req,res)=> res.json(db.productos));
app.post('/api/productos', (req,res)=>{ const p={...req.body, id:Date.now(), emoji:colorToEmoji(req.body.color)}; db.productos.push(p); saveDB(); res.json(p); });
app.delete('/api/productos/:id', (req,res)=>{ db.productos=db.productos.filter(p=> String(p.id)!==String(req.params.id)); saveDB(); res.json({ok:true}); });
app.get('/api/vendedoras', (req,res)=> res.json(db.vendedoras));
app.post('/api/vendedoras', (req,res)=>{ const v={...req.body, id:'VEND-'+Date.now()}; db.vendedoras.push(v); saveDB(); res.json(v); });
app.get('/api/pagos', (req,res)=> res.json(db.metodosPago));
app.post('/api/pagos', (req,res)=>{ db.metodosPago=req.body; saveDB(); res.json({ok:true}) });
app.get('/api/pedidos', (req,res)=> res.json(db.pedidos));
app.post('/api/pedido', (req,res)=>{ const codigo=`JK-${String(db.consecutivo).padStart(3,'0')}`; db.consecutivo++; const pedido={...req.body,codigo,estado:'NUEVO',fecha:new Date().toLocaleString()}; db.pedidos.push(pedido); saveDB(); res.json(pedido); });
app.post('/api/pedido/:codigo/estado', (req,res)=>{ const p=db.pedidos.find(x=> x.codigo===req.params.codigo); if(p){ p.estado=req.body.estado; if(req.body.novedad) p.novedad=req.body.novedad; saveDB(); } res.json(p); });

global.db=db; global.saveDB=saveDB; global.app=app; global.qrCode=null; global.botStatus='Iniciando servidor...';
const PORT=process.env.PORT||3000;
app.listen(PORT, ()=> console.log('💖 LIVE '+PORT));
try{ require('./bot'); }catch(e){ console.log('Bot error', e.message) }
