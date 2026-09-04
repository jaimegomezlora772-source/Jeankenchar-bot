const express = require('express');
const path = require('path');
const app = express();

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

function colorToEmoji(color){
  const m = {azul:'🔵',amarillo:'🟡',verde:'🟢',rojo:'🔴',cafe:'🟤',marron:'🟤',rosado:'🩷',morado:'🟣',naranja:'🟠',blanco:'⚪',negro:'⚫'}
  return m[color?.toLowerCase()] || '⚪'
}

// --- FIX: RUTA PRINCIPAL PARA QUE NO SALGA Cannot GET / ---
app.get('/', (req,res)=>{
  // Si tienes index.html en public lo muestra, si no muestra el panel
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err)=>{
    if(err){
      res.send(`
        <div style="font-family:sans-serif;text-align:center;padding:50px;background:#fff0f5;min-height:100vh">
          <h1 style="color:#ff00aa">💖 JEANKENCHAR BOT LIVE 💖</h1>
          <p>Servidor activo correctamente</p>
          <a href="/admin.html" style="background:#ff00aa;color:white;padding:12px 25px;text-decoration:none;border-radius:25px;display:inline-block;margin:10px">Ir al Panel Admin 🤍</a>
          <br><br>
          <p style="color:gray;font-size:13px">API: /api/productos | /api/pedidos | /api/pagos</p>
        </div>
      `);
    }
  });
});

// --- LOGIN ---
app.post('/api/login', (req,res)=>{
  const v = db.vendedoras.find(x=> x.usuario===req.body.usuario && x.password===req.body.password);
  if(v) res.json({ok:true, user:v}); else res.json({ok:false})
});

// --- PRODUCTOS ---
app.get('/api/productos', (req,res)=> res.json(db.productos));
app.post('/api/productos', (req,res)=>{
  const p = {...req.body, id: Date.now(), emoji: colorToEmoji(req.body.color)};
  db.productos.push(p); res.json(p);
});

// --- VENDEDORES ---
app.get('/api/vendedoras', (req,res)=> res.json(db.vendedoras));
app.post('/api/vendedoras', (req,res)=>{
  const v = {...req.body, id: 'VEND-'+Date.now()};
  db.vendedoras.push(v); res.json(v);
});

// --- METODOS PAGO EDITABLES ---
app.get('/api/pagos', (req,res)=> res.json(db.metodosPago));
app.post('/api/pagos', (req,res)=>{ db.metodosPago = req.body; res.json({ok:true}) });

// --- PEDIDOS ---
app.get('/api/pedidos', (req,res)=> res.json(db.pedidos));
app.post('/api/pedido', (req,res)=>{
  const codigo = `JK-${String(db.consecutivo).padStart(3,'0')}`;
  db.consecutivo++;
  const pedido = {...req.body, codigo, estado:'NUEVO', fecha: new Date().toLocaleString()};
  db.pedidos.push(pedido);
  res.json(pedido);
});

app.post('/api/pedido/:codigo/estado', (req,res)=>{
  const p = db.pedidos.find(x=> x.codigo===req.params.codigo);
  if(p){ p.estado = req.body.estado; if(req.body.novedad) p.novedad=req.body.novedad; }
  res.json(p);
});

// --- FIX: PUERTO PARA RENDER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('💖 JEANKENCHAR LIVE en puerto '+PORT));  db.vendedoras.push(v); res.json(v);
});

// --- METODOS PAGO EDITABLES ---
app.get('/api/pagos', (req,res)=> res.json(db.metodosPago));
app.post('/api/pagos', (req,res)=>{ db.metodosPago = req.body; res.json({ok:true}) });

// --- PEDIDOS ---
app.get('/api/pedidos', (req,res)=> res.json(db.pedidos));
app.post('/api/pedido', (req,res)=>{
  const codigo = `JK-${String(db.consecutivo).padStart(3,'0')}`;
  db.consecutivo++;
  const pedido = {...req.body, codigo, estado:'NUEVO', fecha: new Date().toLocaleString()};
  db.pedidos.push(pedido);
  res.json(pedido);
});

app.post('/api/pedido/:codigo/estado', (req,res)=>{
  const p = db.pedidos.find(x=> x.codigo===req.params.codigo);
  if(p){ p.estado = req.body.estado; if(req.body.novedad) p.novedad=req.body.novedad; }
  res.json(p);
});

app.listen(3000, ()=> console.log('💖 JEANKENCHAR corriendo en 3000'));
