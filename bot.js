const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('💖 Iniciando BOT JEANKENCHAR...');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath: '/opt/render/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-zygote','--single-process']
  }
});

let carritos = {};
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
      await client.sendMessage(num, texto);
      carritos[num] = {items:[], paso:'eligiendo'};
    }
    if(msg.body==='2'){
      await msg.reply(`🤍 Perfecto, ¿Cuál es tu nombre?`);
      carritos[num] = {paso:'esperando_nombre_asesor'};
    }
  }catch(e){ console.log('❌', e.message); }
});

client.initialize().catch(e=> console.log('❌ INIT ERROR', e.message));
