const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const chromium = require('@sparticuz/chromium');

console.log('💖 Iniciando BOT JEANKENCHAR...');

(async () => {
  const executablePath = await chromium.executablePath();

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: chromium.headless,
      executablePath: executablePath,
      args: chromium.args.concat([
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote'
      ])
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

  client.on('authenticated', ()=>{ global.botStatus = 'Autenticado, iniciando...'; });
  client.on('auth_failure', m =>{ global.botStatus = 'Fallo auth: '+m; });

  client.on('message', async msg => {
    try{
      if(msg.from.includes('status') || msg.from.includes('@g.us')) return;
      const num = msg.from;
      const texto = msg.body.trim();
      const lower = texto.toLowerCase();
      const db = global.db;
      if(!db) return;

      if(['hola','menu','ola','buenas','inicio'].includes(lower)){
        await client.sendMessage(num, `💖💖💖 HELADERIA JEANKENCHAR 💖💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 👩‍💼 HABLAR CON ASESOR`);
        return;
      }

      if(texto==='1' || lower.includes('ver menu') || lower==='menu'){
        if(!db.productos || db.productos.length===0){
          await client.sendMessage(num, `💔 Aún no tenemos productos cargados 🤍\nEscribe 2 para hablar con una asesora`);
          return;
        }
        let txt = `💖 MENU JEANKENCHAR 🤍\n\n`;
        db.productos.forEach((p,i)=>{ txt+= `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio} ${p.color? '('+p.color+')':''}\n`; });
        txt+= `\nEscribe el número del producto (ej: 1)`;
        carritos[num] = {items:[], paso:'eligiendo'};
        await client.sendMessage(num, txt);
        return;
      }

      if(carritos[num]?.paso==='eligiendo'){
        const idx = parseInt(texto)-1;
        if(db.productos[idx]){
          const prod = db.productos[idx];
          carritos[num].items.push({...prod, cantidad:1, total: prod.precio});
          await msg.reply(`✅ Agregado ${prod.nombre}\n¿Otro? Escribe otro número o escribe *LISTO*`);
          carritos[num].paso='eligiendo_mas';
        } else { await msg.reply(`❌ Ese número no existe. Escribe un número del menú`); }
        return;
      }

      if(carritos[num]?.paso==='eligiendo_mas'){
        if(lower==='listo'){
          let total = carritos[num].items.reduce((s,i)=> s+ Number(i.precio||i.total),0);
          let resumen = carritos[num].items.map(i=> `${i.emoji} 1x ${i.nombre} - $${i.precio}`).join('\n');
          await client.sendMessage(num, `💖 Tu pedido:\n${resumen}\n\n💰 TOTAL: $${total}\n\n¿Alguna observación? Escribe tu observación o escribe *NO*`);
          carritos[num].paso='observacion'; carritos[num].total=total;
        } else {
          const idx = parseInt(texto)-1;
          if(db.productos[idx]){
            carritos[num].items.push({...db.productos[idx], cantidad:1, total: db.productos[idx].precio});
            await msg.reply(`✅ Agregado ${db.productos[idx].nombre}\n¿Otro? O escribe *LISTO*`);
          }
        }
        return;
      }

      if(carritos[num]?.paso==='observacion'){
        carritos[num].observacion = lower==='no'? '' : texto;
        const codigo = `JK-${String(db.consecutivo).padStart(3,'0')}`;
        db.consecutivo++;
        const pedido = { codigo, items: carritos[num].items, total: carritos[num].total, observacion: carritos[num].observacion, cliente: num, fecha: new Date().toLocaleString(), estado:'NUEVO', metodoPago:'Por definir' };
        db.pedidos.push(pedido);
        if(global.saveDB) global.saveDB();
        await client.sendMessage(num, `💖💖💖 PEDIDO ${codigo} CREADO 💖💖💖\n\n${carritos[num].items.map(i=> `${i.emoji} ${i.nombre}`).join('\n')}\n💰 TOTAL $${carritos[num].total}\n📝 OBS: ${carritos[num].observacion||'Ninguna'}\n\n🤍 En breve te contacta una asesora. ¡Gracias!`);
        delete carritos[num];
        return;
      }

      if(texto==='2' || lower.includes('asesor')){
        await client.sendMessage(num, `🤍 Perfecto, ya avisamos a una asesora de JEANKENCHAR 💖\n¿Me dices tu nombre por favor?`);
        return;
      }

    }catch(e){ console.log('Error msg', e.message); }
  });

  client.initialize();
})();
