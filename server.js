const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// RUTA PRINCIPAL - Esto te faltaba
app.get('/', (req,res)=>{
  res.send(`
    <h1 style="font-family:sans-serif;text-align:center;color:#ff00aa">💖 JEANKENCHAR BOT LIVE 💖</h1>
    <p style="text-align:center">Bot funcionando correctamente</p>
    <p style="text-align:center"><a href="/admin.html">Ir al Panel Admin 🤍</a></p>
    <p style="text-align:center"><a href="/qr">Ver QR del Bot 📱</a></p>
  `);
});

app.get('/qr', (req,res)=>{
  res.send('<h2>Escanea el QR en los logs de Render</h2>');
});

app.get('/admin.html', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API de prueba
app.get('/api/productos', (req,res)=> res.json([{nombre:'Chicle', color:'azul', emoji:'🔵'}]));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('💖 JEANKENCHAR LIVE en puerto '+PORT));  db.productos.push(p); res.json(p);
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

app.listen(3000, ()=> console.log('💖 JEANKENCHAR corriendo en 3000'));
