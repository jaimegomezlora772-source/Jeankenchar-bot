const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('💖 Iniciando BOT JEANKENCHAR SIN CHROMIUM EXTERNO...');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-setuid-sandbox'
    ]
  }
});

let carritos = {};
global.client = client;

client.on('qr', (qr) => {
  global.qrCode = qr;
  global.botStatus = 'QR LISTO - Escanea en /qr 💖';
  console.log('💖 QR GENERADO - Ve a /qr');
  qrcode.generate(qr, {small:true});
});

client.on('ready', () => {
  global.botStatus = 'CONECTADO 💖 - ' + client.info.wid.user;
  global.qrCode = null;
  console.log('💖💖💖 BOT CONECTADO', client.info.wid.user);
});

client.on('authenticated', ()=>{
  global.botStatus = 'Autenticado, iniciando...';
  console.log('Autenticado OK');
});

client.on('auth_failure', m =>{
  global.botStatus = 'Fallo auth: '+m;
  console.log('Auth fail', m);
});

client.on('disconnected', (reason) => {
  console.log('Desconectado', reason);
  global.botStatus = 'Desconectado: ' + reason;
  global.qrCode = null;
  setTimeout(()=>client.initialize(), 5000);
});

client.on('message', async msg => {
  try{
    console.log('📩 MENSAJE:', msg.body, 'DE', msg.from);
    if(msg.from.includes('status')) return;
    if(msg.from.includes('@g.us')) return;

    const num = msg.from;
    const texto = msg.body.trim();
    const lower = texto.toLowerCase();
    const db = global.db;
    if(!db) return;

    if(['hola','menu','ola','buenas','inicio','jeans','jean'].some(p=>lower.includes(p))){
      await client.sendMessage(num, `💖💖💖 JEANKENCHAR JEANS 💖💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 👖 VER CATALOGO JEANS\n2️⃣ 👩‍💼 HABLAR CON ASESOR`);
      return;
    }

    if(texto==='1' || lower.includes('catalogo') || lower.includes('ver')){
      if(!db.productos || db.productos.length===0){
        await client.sendMessage(num, `💔 Catálogo vacío aún. Escribe 2 para asesora 🤍`);
        return;
      }
      let txt = `💖 CATALOGO JEANKENCHAR (${db.productos.length}) 🤍\n\n`;
      db.productos.slice(0,30).forEach((p,i)=>{
        txt+= `${i+1}. ${p.emoji||'👖'} ${p.nombre} - $${p.precio} T:${p.talla||''} ${p.color||''}\n`;
      });
      txt+= `\nEscribe el número (ej: 1)`;
      carritos[num] = {items:[], paso:'eligiendo'};
      await client.sendMessage(num, txt);
      return;
    }

    if(carritos[num]){
      if(lower==='listo'){
        let total = carritos[num].items.reduce((s,i)=> s+ Number(i.precio||0),0);
        await client.sendMessage(num, `💖 Pedido:\n${carritos[num].items.map(i=> `${i.nombre} $${i.precio}`).join('\n')}\nTOTAL $${total}\n\nEscribe tu dirección o NO`);
        carritos[num].paso='observacion'; carritos[num].total=total;
        return;
      }
      if(carritos[num].paso==='observacion'){
        const codigo = `JK-${String(db.consecutivo).padStart(3,'0')}`;
        db.consecutivo++;
        try{
          const mongoose = require('mongoose');
          const Pedido = mongoose.model('Pedido');
          await Pedido.create({ codigo, cliente:num, telefono:num, items:carritos[num].items, total:carritos[num].total, estado:'NUEVO', novedad:texto, fecha:new Date().toLocaleString() });
        }catch(e){ console.log('Error pedido', e.message); }
        if(global.saveDB) global.saveDB();
        await client.sendMessage(num, `💖 PEDIDO ${codigo} CREADO 💖\nTOTAL $${carritos[num].total}\nTe contacta asesora 🤍`);
        delete carritos[num];
        return;
      }
      const idx = parseInt(texto)-1;
      if(!isNaN(idx) && db.productos[idx]){
        carritos[num].items.push(db.productos[idx]);
        carritos[num].paso='eligiendo_mas';
        await client.sendMessage(num, `✅ ${db.productos[idx].nombre} agregado. ¿Otro? o escribe LISTO`);
        return;
      }
    }

    if(texto==='2'){
      await client.sendMessage(num, `🤍 Ya avisamos a asesora 💖 ¿Tu nombre?`);
      return;
    }

  }catch(e){ console.log('Error msg', e.message); }
});

client.initialize()
 .then(()=>console.log('Initialize llamado OK'))
 .catch(e=>console.log('Initialize FAIL', e));
