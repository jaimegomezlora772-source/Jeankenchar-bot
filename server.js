require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === CONEXION MONGODB - INVENTARIO UNICO Y PERSISTENTE ===
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jaimegomezlora772_db_user:PGN0PkdtYEQTt5Wi@cluster0.x17aua1.mongodb.net/jeankenchar_db?appName=Cluster0')
 .then(()=> console.log('✅ MongoDB conectado - inventario persistente'))
 .catch(e=> console.error('Mongo error', e.message));

const Producto = mongoose.model('Producto', new mongoose.Schema({
  id: Number, nombre: String, precio: Number, stock: Number,
  categoria: String, talla: String, color: String, emoji: String
}, { strict: false, timestamps: true }));

const Vendedora = mongoose.model('Vendedora', new mongoose.Schema({
  id: String, nombre: String, whatsapp: String, usuario: String, password: String, rol: String
}, { strict: false }));

const MetodoPago = mongoose.model('MetodoPago', new mongoose.Schema({
  id: String, nombre: String, valor: String, activo: Boolean
}, { strict: false }));

const Pedido = mongoose.model('Pedido', new mongoose.Schema({
  codigo: String, cliente: String, telefono: String, items: Array,
  total: Number, estado: String, novedad: String, fecha: String
}, { strict: false, timestamps: true }));

const Config = mongoose.model('Config', new mongoose.Schema({
  clave: String, consecutivo: Number
}));

// db en memoria para que bot.js siga funcionando
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

async function loadDB(){
  try{
    const prods = await Producto.find();
    const vends = await Vendedora.find();
    const pagos = await MetodoPago.find();
    const peds = await Pedido.find().sort({createdAt:-1}).limit(500);
    const cfg = await Config.findOne({clave:'main'});

    if(prods.length) db.productos = prods;
    if(vends.length) db.vendedoras = vends;
    else {
      // crea admin inicial en mongo
      await Vendedora.create(db.vendedoras[0]);
    }
    if(pagos.length) db.metodosPago = pagos;
    else {
      for(let p of db.metodosPago) await MetodoPago.create(p);
    }
    if(peds.length) db.pedidos = peds;
    if(cfg) db.consecutivo = cfg.consecutivo;

    console.log('✅ DB cargada desde Mongo:', db.productos.length, 'productos');
  }catch(e){ console.log('loadDB error', e.message) }
}
setTimeout(loadDB, 2000);

async function saveDB(){
  try{
    await Config.findOneAndUpdate({clave:'main'}, {consecutivo: db.consecutivo}, {upsert:true});
  }catch(e){ console.log(e.message) }
}

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
    const fs = require('fs');
    if(fs.existsSync('./.wwebjs_auth')) fs.rmSync('./.wwebjs_auth', {recursive:true, force:true});
    if(fs.existsSync('./.wwebjs_cache')) fs.rmSync('./.wwebjs_cache', {recursive:true, force:true});
    global.qrCode=null;
    global.botStatus='Sesión borrada. Reiniciando QR... espera 20s y dale a Ver QR';
    try{ global.client.destroy().then(()=>global.client.initialize()); }catch(e){ try{ global.client.initialize(); }catch(e2){} }
    res.json({ok:true});
  }catch(e){ res.json({ok:false, error:e.message}) }
});

// === RUTAS AHORA CON MONGODB ===
app.post('/api/login', (req,res)=>{ const v=db.vendedoras.find(x=> x.usuario===req.body.usuario && x.password===req.body.password); res.json(v?{ok:true,user:v}:{ok:false}) });

app.get('/api/productos', async (req,res)=>{
  const prods = await Producto.find();
  db.productos = prods;
  res.json(prods);
});

app.post('/api/productos', async (req,res)=>{
  const p = await Producto.create({...req.body, id:Date.now(), emoji:colorToEmoji(req.body.color)});
  db.productos.push(p);
  res.json(p);
});

app.delete('/api/productos/:id', async (req,res)=>{
  await Producto.deleteOne({id: Number(req.params.id)});
  db.productos=db.productos.filter(p=> String(p.id)!==String(req.params.id) && String(p._id)!==String(req.params.id));
  res.json({ok:true});
});

app.get('/api/vendedoras', async (req,res)=>{
  const v = await Vendedora.find();
  if(v.length) db.vendedoras = v;
  res.json(db.vendedoras);
});

app.post('/api/vendedoras', async (req,res)=>{
  const v = await Vendedora.create({...req.body, id:'VEND-'+Date.now()});
  db.vendedoras.push(v);
  res.json(v);
});

app.get('/api/pagos', async (req,res)=>{
  const pagos = await MetodoPago.find();
  if(pagos.length) db.metodosPago = pagos;
  res.json(db.metodosPago);
});

app.post('/api/pagos', async (req,res)=>{
  db.metodosPago=req.body;
  await MetodoPago.deleteMany({});
  for(let p of req.body) await MetodoPago.create(p);
  res.json({ok:true})
});

app.get('/api/pedidos', async (req,res)=>{
  const peds = await Pedido.find().sort({createdAt:-1}).limit(500);
  db.pedidos = peds;
  res.json(peds);
});

app.post('/api/pedido', async (req,res)=>{
  const codigo=`JK-${String(db.consecutivo).padStart(3,'0')}`;
  db.consecutivo++;
  const pedido = await Pedido.create({...req.body,codigo,estado:'NUEVO',fecha:new Date().toLocaleString()});
  db.pedidos.push(pedido);
  await saveDB();
  res.json(pedido);
});

app.post('/api/pedido/:codigo/estado', async (req,res)=>{
  const p = await Pedido.findOneAndUpdate({codigo:req.params.codigo}, {estado:req.body.estado, novedad:req.body.novedad}, {new:true});
  res.json(p);
});

global.db=db; global.saveDB=saveDB; global.app=app; global.qrCode=null; global.botStatus='Iniciando servidor...';
const PORT=process.env.PORT||3000;
app.listen(PORT, ()=> console.log('💖 LIVE '+PORT));
try{ require('./bot'); }catch(e){ console.log('Bot error', e.message) }
