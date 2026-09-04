const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const chromium = require('@sparticuz/chromium');

console.log('💖 Iniciando BOT JEANKENCHAR...');

(async () => {
  try {
    const executablePath = await chromium.executablePath();
    console.log('Chromium path:', executablePath);

    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        executablePath: executablePath,
        args: chromium.args.concat([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote',
          '--disable-gpu'
        ])
      }
    });

    let carritos = {};
    global.client = client;

    client.on('qr', (qr) => {
      global.qrCode = qr;
      global.botStatus = 'QR LISTO - Escanea en /qr 💖';
      console.log('💖 QR GENERADO - Ve a /qr en tu web');
      qrcode.generate(qr, {small:true});
    });

    client.on('ready', () => {
      global.botStatus = 'CONECTADO 💖 - ' + client.info.wid.user;
      global.qrCode = null;
      console.log('💖💖💖 BOT CONECTADO', client.info.wid.user);
    });

    client.on('authenticated', ()=>{
      global.botStatus = 'Autenticado, iniciando...';
      console.log('Autenticado');
    });

    client.on('auth_failure', m =>{
      global.botStatus = 'Fallo auth: '+m;
      console.log('Auth failure', m);
    });

    client.on('disconnected', (reason) => {
      console.log('Desconectado', reason);
      global.botStatus = 'Desconectado: ' + reason;
      global.qrCode = null;
      client.initialize();
    });

    // LOG PARA SABER SI LLEGAN MENSAJES
    client.on('message', async msg => {
      try{
        console.log('📩 Mensaje recibido:', msg.body, 'de', msg.from);
        if(msg.from.includes('status')) return;
        // Permitir grupos si quieres, por ahora bloqueamos
        if(msg.from.includes('@g.us')) return;

        const num = msg.from;
        const texto = msg.body.trim();
        const lower = texto.toLowerCase();
        const db = global.db;
        if(!db){
          console.log('DB no lista aún');
          return;
        }

        console.log('DB productos:', db.productos?.length);

        if(['hola','menu','ola','buenas','inicio','buena','jeans'].some(p=>lower.includes(p))){
          await client.sendMessage(num, `💖💖💖 JEANKENCHAR JEANS 💖💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 👖 VER CATALOGO JEANS\n2️⃣ 👩‍💼 HABLAR CON ASESOR\n\nEscribe 1 o 2`);
          return;
        }

        if(texto==='1' || lower.includes('catalogo') || lower.includes('ver menu') || lower.includes('jeans')){
          if(!db.productos || db.productos.length===0){
            console.log('No hay productos en memoria, recargando de Mongo...');
            // Intentar recargar
            await client.sendMessage(num, `💖 Estamos cargando el catálogo, dame 5 segundos y escribe 1 de nuevo 🤍`);
            return;
          }
          let txt = `💖 CATALOGO JEANKENCHAR 🤍\n\n`;
          db.productos.slice(0,20).forEach((p,i)=>{
            txt+= `${i+1}. ${p.emoji||'👖'} ${p.nombre} - $${p.precio} ${p.talla?'T:'+p.talla:''} ${p.color? '('+p.color+')':''} Stock:${p.stock||''}\n`;
          });
          txt+= `\nEscribe el número del producto (ej: 1)`;
          carritos[num] = {items:[], paso:'eligiendo'};
          await client.sendMessage(num, txt);
          return;
        }

        if(carritos[num]?.paso==='eligiendo' || carritos[num]?.paso==='eligiendo_mas'){
          if(lower==='listo'){
            let total = carritos[num].items.reduce((s,i)=> s+ Number(i.precio||i.total),0);
            let resumen = carritos[num].items.map(i=> `${i.emoji||'👖'} 1x ${i.nombre} - $${i.precio}`).join('\n');
            await client.sendMessage(num, `💖 Tu pedido:\n${resumen}\n\n💰 TOTAL: $${total}\n\n¿Alguna observación? Escribe tu observación o escribe *NO*`);
            carritos[num].paso='observacion';
            carritos[num].total=total;
            return;
          }
          const idx = parseInt(texto)-1;
          if(!isNaN(idx) && db.productos[idx]){
            const prod = db.productos[idx];
            carritos[num].items.push({...prod, cantidad:1, total: prod.precio});
            if(!carritos[num]) carritos[num]={items:[], paso:'eligiendo'};
            carritos[num].paso='eligiendo_mas';
            await client.sendMessage(num, `✅ Agregado ${prod.nombre}\n¿Otro? Escribe otro número o escribe *LISTO*`);
          } else {
            await client.sendMessage(num, `❌ Ese número no existe. Escribe un número del menú o *LISTO*`);
          }
          return;
        }

        if(carritos[num]?.paso==='observacion'){
          carritos[num].observacion = lower==='no'? '' : texto;
          const codigo = `JK-${String(db.consecutivo).padStart(3,'0')}`;
          db.consecutivo++;

          // Guardar en Mongo via API interna
          try {
            const mongoose = require('mongoose');
            const Pedido = mongoose.model('Pedido');
            await Pedido.create({
              codigo,
              cliente: num,
              telefono: num,
              items: carritos[num].items,
              total: carritos[num].total,
              estado: 'NUEVO',
              novedad: carritos[num].observacion,
              fecha: new Date().toLocaleString()
            });
          } catch(e){ console.log('Error guardando pedido mongo', e.message); }

          if(global.saveDB) global.saveDB();

          await client.sendMessage(num, `💖💖💖 PEDIDO ${codigo} CREADO 💖💖💖\n\n${carritos[num].items.map(i=> `${i.emoji||'👖'} ${i.nombre}`).join('\n')}\n💰 TOTAL $${carritos[num].total}\n📝 OBS: ${carritos[num].observacion||'Ninguna'}\n\n🤍 En breve te contacta una asesora. ¡Gracias!`);
          delete carritos[num];
          return;
        }

        if(texto==='2' || lower.includes('asesor')){
          await client.sendMessage(num, `🤍 Perfecto, ya avisamos a una asesora de JEANKENCHAR 💖\nEn un momento te atendemos. ¿Me dices tu nombre?`);
          return;
        }

        // Si no entendió nada, mandar menú
        await client.sendMessage(num, `No te entendí 🤍 Escribe *HOLA* para ver el menú`);

      }catch(e){ console.log('Error msg', e); }
    });

    await client.initialize();
    console.log('Client initialize llamado');

  } catch (e) {
    console.error('Error iniciando bot:', e);
    global.botStatus = 'Error iniciando: ' + e.message;
  }
})();
