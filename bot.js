const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer');

console.log('💖 Iniciando BOT JEANKENCHAR...');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-zygote','--single-process']
  }
});

let carritos={};
global.client=client;

client.on('qr', (qr)=>{ global.qrCode=qr; global.botStatus='QR LISTO'; console.log('💖 QR GENERADO'); qrcode.generate(qr,{small:true}); });
client.on('authenticated', ()=> console.log('🔐 AUTENTICADO'));
client.on('ready', ()=>{ global.botStatus='CONECTADO 💖 '+client.info.wid.user; global.qrCode=null; console.log('💖💖💖 BOT CONECTADO', client.info.wid.user); });
client.on('auth_failure', m=> console.log('❌ AUTH FAILURE', m));
client.on('disconnected', r=> console.log('❌ DESCONECTADO', r));

client.on('message', async msg=>{
  console.log('📩 MENSAJE:', msg.from, msg.body);
  try{
    if(msg.fromMe || msg.from.includes('status') || msg.from.includes('@g.us')) return;
    const num=msg.from, texto=msg.body.trim(), lower=texto.toLowerCase();
    const db=global.db;
    if(!db ||!db.productos.length){ await client.sendMessage(num, '💖 Cargando catálogo... escribe HOLA de nuevo en 3s'); return; }
    if(['hola','menu','ola','buenas','inicio','jeans','catalogo'].some(p=>lower.includes(p))){
      await client.sendMessage(num, `💖 *JEANKENCHAR JEANS* 💖\n\n1️⃣ VER CATALOGO\n2️⃣ ASESOR`);
      return;
    }
    if(texto==='1'){
      let txt=`💖 CATALOGO (${db.productos.length})\n\n`;
      db.productos.forEach((p,i)=> txt+=`${i+1}. ${p.nombre} $${p.precio}\n`);
      txt+=`\nEscribe el número del jean`;
      carritos[num]={items:[]};
      await client.sendMessage(num, txt);
      return;
    }
    if(texto==='2'){ await client.sendMessage(num, `🤍 Asesora en camino`); return; }
    const idx=parseInt(texto)-1;
    if(!isNaN(idx) && db.productos[idx] && carritos[num]){
      carritos[num].items.push(db.productos[idx]);
      await client.sendMessage(num, `✅ Agregado ${db.productos[idx].nombre}. Escribe LISTO`);
      return;
    }
    if(lower==='listo' && carritos[num]){
      const total=carritos[num].items.reduce((s,i)=>s+Number(i.precio),0);
      const codigo=`JK-${String(db.consecutivo).padStart(3,'0')}`;
      db.consecutivo++; if(global.saveDB) global.saveDB();
      await client.sendMessage(num, `💖 PEDIDO ${codigo} $${total} CREADO. Te escribe asesora`);
      delete carritos[num];
      return;
    }
  }catch(e){ console.log('❌ ERROR MSG:', e.message); }
});

client.initialize().catch(e=> console.log('❌ INIT ERROR', e));
