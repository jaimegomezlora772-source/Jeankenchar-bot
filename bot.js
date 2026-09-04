const { Client, LocalAuth } = require('whatsapp-web.js');
const client = new Client({ authStrategy: new LocalAuth() });
let carritos = {}; // numero -> {items, observacion}

client.on('message', async msg => {
  const num = msg.from;
  const vendedora = global.db?.vendedoras?.find(v=> num.includes(v.whatsapp));

  if(vendedora){
    // ES VENDEDORA IDENTIFICADA POR WHATSAPP
    await msg.reply(`💖 Hola ${vendedora.nombre} te identifique como vendedora de JEANKENCHAR 🤍\nEscribe *MENU* para registrar venta fisica`);
    return;
  }

  if(msg.body.toLowerCase()==='menu' || msg.body.toLowerCase()==='hola'){
    await msg.reply(`💖💖💖 HELADERIA JEANKENCHAR 💖💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 👩‍💼 HABLAR CON ASESOR`);
  }

  if(msg.body==='1' || msg.body.toLowerCase().includes('ver menu')){
    // Mostrar productos con color
    let texto = `💖 MENU JEANKENCHAR 🤍\n`;
    // Aqui llamas a tu API de productos
    await client.sendMessage(num, texto);
    // Luego inicias flujo...
    carritos[num] = {items:[], paso:'eligiendo'};
  }

  if(msg.body==='2'){
    await msg.reply(`🤍 Perfecto, ¿Cuál es tu nombre?`);
    carritos[num] = {paso:'esperando_nombre_asesor'};
  }

  // FLUJO OBSERVACION
  if(carritos[num]?.paso==='preguntar_observacion'){
    await client.sendMessage(num, `💖 ¿Deseas algo más o alguna observación? 🤍\n\nTu pedido:\n${resumen(num)}`, {
      // botones en whatsapp-web.js se hacen con List o Buttons
    });
  }
});

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

client.initialize();
