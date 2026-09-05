const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('💖 Iniciando BOT JEANKENCHAR...');

const client = new Client({ 
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-zygote','--single-process']
  }
});

let carritos = {}; // numero -> {items, observacion}
global.client = client;

client.on('qr', (qr)=>{
  global.qrCode = qr;
  global.botStatus = 'QR LISTO';
  console.log('💖 QR GENERADO');
  qrcode.generate(qr, {small:true});
});

client.on('ready', ()=>{
  global.botStatus = 'CONECTADO 💖 ' + client.info.wid.user;
  global.qrCode = null;
  console.log('💖💖💖 BOT CONECTADO', client.info.wid.user);
});

client.on('message', async msg => {
  try{
    const num = msg.from;
    if(msg.fromMe || num.includes('status') || num.includes('@g.us')) return;

    const vendedora = global.db?.vendedoras?.find(v=> num.includes(v.whatsapp));

    if(vendedora && (msg.body.toLowerCase()==='menu' || msg.body.toLowerCase()==='hola')){
      await msg.reply(`💖 Hola ${vendedora.nombre} te identifique como vendedora de JEANKENCHAR 🤍\nEscribe *MENU* para registrar venta fisica`);
      return;
    }

    if(msg.body.toLowerCase()==='menu' || msg.body.toLowerCase()==='hola'){
      await msg.reply(`💖💖💖 HELADERIA JEANKENCHAR 💖💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 👩‍💼 HABLAR CON ASESOR`);
    }

    if(msg.body==='1' || msg.body.toLowerCase().includes('ver menu')){
      let texto = `💖 MENU JEANKENCHAR 🤍\n`;
      const prods = global.db?.productos || [];
      prods.forEach((p,i)=> texto += `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio}\n`);
      texto += `\nEscribe el número del producto`;
      await client.sendMessage(num, texto);
      carritos[num] = {items:[], paso:'eligiendo'};
    }

    if(msg.body==='2'){
      await msg.reply(`🤍 Perfecto, ¿Cuál es tu nombre?`);
      carritos[num] = {paso:'esperando_nombre_asesor'};
    }

    // FLUJO OBSERVACION
    if(carritos[num]?.paso==='preguntar_observacion'){
      await client.sendMessage(num, `💖 ¿Deseas algo más o alguna observación? 🤍\n\nTu pedido:\n${resumen(num)}`);
    }

  }catch(e){ console.log('❌ MSG ERROR', e.message); }
});

function resumen(num){
  const c = carritos[num];
  if(!c || !c.items) return 'Vacío';
  return c.items.map(i=> `${i.emoji||'🍦'} ${i.cantidad||1}x ${i.nombre}`).join('\n');
}

function generarFactura(pedido){
  return `💖💖💖 HELADERIA JEANKENCHAR 💖💖💖
🤍 CRA 12F #104-20 - BQUILLA 🤍
📄 FACTURA ${pedido.codigo}
👩‍💼 VENDEDORA: ${pedido.vendedora}
📅 ${pedido.fecha}

${pedido.items.map(i=> `${i.emoji} ${i.cantidad}x ${i.nombre} - $${i.total}`).join('\n')}

📝 OBS: ${pedido.observacion || 'Ninguna'}

💖 TOTAL: $${pedido.total} 🤍
💰 PAGO: ${pedido.metodoPago}
💖 NEQUI: 3023790715 - MARIA PARRA
🤍 GRACIAS POR TU COMPRA 💖`;
}

global.generarFactura = generarFactura;

client.initialize().catch(e=> console.log('❌ INIT ERROR', e.message));
