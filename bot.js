const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('💖 Iniciando BOT JEANKENCHAR...');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath: '/opt/render/project/src/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote']
  }
});

let carritos={}; global.client=client;

client.on('qr', (qr)=>{ global.qrCode=qr; global.botStatus='QR LISTO 💖'; console.log('💖 QR GENERADO'); qrcode.generate(qr,{small:true}); });
client.on('ready', ()=>{ global.botStatus='CONECTADO 💖 '+client.info.wid.user; global.qrCode=null; console.log('💖💖💖 BOT CONECTADO', client.info.wid.user); });

client.on('message', async msg=>{
  try{
    if(msg.from.includes('status')||msg.from.includes('@g.us')) return;
    const num=msg.from, texto=msg.body.trim(), lower=texto.toLowerCase(), db=global.db; if(!db) return;
    if(['hola','menu','ola','buenas','inicio','jeans'].some(p=>lower.includes(p))){
      await client.sendMessage(num, `💖 JEANKENCHAR JEANS 💖\n\n1️⃣ VER CATALOGO\n2️⃣ ASESOR`); return;
    }
    if(texto==='1'){ let txt=`💖 CATALOGO (${db.productos.length})\n\n`; db.productos.forEach((p,i)=> txt+=`${i+1}. ${p.nombre} $${p.precio}\n`); txt+=`\nEscribe número`; carritos[num]={items:[]}; await client.sendMessage(num, txt); return; }
    const idx=parseInt(texto)-1; if(!isNaN(idx)&&db.productos[idx]&&carritos[num]){ carritos[num].items.push(db.productos[idx]); await client.sendMessage(num, `✅ Agregado. Escribe LISTO`); return; }
    if(lower==='listo'&&carritos[num]){ const total=carritos[num].items.reduce((s,i)=>s+Number(i.precio),0); const codigo=`JK-${String(db.consecutivo).padStart(3,'0')}`; db.consecutivo++; if(global.saveDB) global.saveDB(); await client.sendMessage(num, `💖 PEDIDO ${codigo} $${total} CREADO`); delete carritos[num]; return; }
    if(texto==='2') await client.sendMessage(num, `🤍 Asesora en camino`);
  }catch(e){ console.log(e.message); }
});

client.initialize();
