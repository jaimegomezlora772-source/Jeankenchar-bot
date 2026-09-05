const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const chromium = require('@sparticuz/chromium-min');

console.log('💖 Iniciando BOT JEANKENCHAR...');

(async () => {
try {
console.log('💖 Cargando chromium-min...');
const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v122.0.0/chromium-v122.0.0-pack.tar');
console.log('💖 Chromium listo en:', executablePath);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath,
    headless: true,
    args: [...chromium.args, '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote'],
    defaultViewport: null
  }
});

let carritos = {};
global.client = client;

client.on('qr', (qr) => {
  global.qrCode = qr;
  global.botStatus = 'QR LISTO';
  console.log('💖💖💖 QR GENERADO 💖💖💖');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  global.botStatus = 'CONECTADO 💖 ' + client.info.wid.user;
  global.qrCode = null;
  console.log('💖💖💖 BOT CONECTADO', client.info.wid.user);
});

client.on('auth_failure', m => console.log('❌ AUTH FAIL', m));
client.on('disconnected', r => console.log('❌ DISCONNECTED', r));
client.on('loading_screen', (p,m) => console.log('⏳ CARGANDO WA', p, m));

console.log('💖 Inicializando cliente WhatsApp...');
await client.initialize();
console.log('💖 Cliente inicializado - esperando QR');

client.on('message', async msg => {
  try {
    const num = msg.from;
    if (msg.fromMe || num.includes('status') || num.includes('@g.us')) return;

    const vendedora = global.db?.vendedoras?.find(v => num.includes(v.whatsapp));

    if (vendedora && (msg.body.toLowerCase() === 'menu' || msg.body.toLowerCase() === 'hola')) {
      await msg.reply(`💖 Hola ${vendedora.nombre} te identifique como vendedora de JEANKENCHAR 🤍\nEscribe *MENU* para registrar venta fisica`);
      return;
    }

    if (msg.body.toLowerCase() === 'menu' || msg.body.toLowerCase() === 'hola') {
      await msg.reply(`💖💖💖 HELADERIA JEANKENCHAR 💖💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 👩‍💼 HABLAR CON ASESOR`);
    }

    if (msg.body === '1' || msg.body.toLowerCase().includes('ver menu')) {
      let texto = `💖 MENU JEANKENCHAR 🤍\n`;
      const prods = global.db?.productos || [];
      prods.forEach((p, i) => texto += `${i + 1}. ${p.emoji || '🍦'} ${p.nombre} - $${p.precio}\n`);
      await client.sendMessage(num, texto);
      carritos[num] = { items: [], paso: 'eligiendo' };
    }

    if (msg.body === '2') {
      await msg.reply(`🤍 Perfecto, ¿Cuál es tu nombre?`);
      carritos[num] = { paso: 'esperando_nombre_asesor' };
    }

    if (carritos[num]?.paso === 'preguntar_observacion') {
      await client.sendMessage(num, `💖 ¿Deseas algo más o alguna observación? 🤍\n\nTu pedido:\n${resumen(num)}`);
    }
  } catch (e) {
    console.log('❌ MSG ERROR', e.message);
  }
});

function resumen(num) {
  const c = carritos[num];
  if (!c || !c.items) return 'Vacío';
  return c.items.map(i => `${i.emoji || '🍦'} ${i.cantidad || 1}x ${i.nombre}`).join('\n');
}

function generarFactura(pedido) {
  return `💖💖💖 HELADERIA JEANKENCHAR 💖💖💖
🤍 CRA 12F #104-20 - BQUILLA 🤍
📄 FACTURA ${pedido.codigo}
👩‍💼 VENDEDORA: ${pedido.vendedora}
📅 ${pedido.fecha}

${pedido.items.map(i => `${i.emoji} ${i.cantidad}x ${i.nombre} - $${i.total}`).join('\n')}

📝 OBS: ${pedido.observacion || 'Ninguna'}

💖 TOTAL: $${pedido.total} 🤍
💰 PAGO: ${pedido.metodoPago}
💖 NEQUI: 3023790715 - MARIA PARRA
🤍 GRACIAS POR TU COMPRA 💖`;
}

global.generarFactura = generarFactura;

} catch (e) {
  console.log('❌ BOT ERROR FATAL', e.message, e.stack);
}
})();
