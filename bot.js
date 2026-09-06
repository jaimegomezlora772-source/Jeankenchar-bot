const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const chromium = require('@sparticuz/chromium-min');

(async () => {
const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v122.0.0/chromium-v122.0.0-pack.tar');
console.log('Chromium:', executablePath);

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath,
    headless: chromium.headless,
    args: [...chromium.args, '--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--single-process','--no-zygote'],
    defaultViewport: chromium.defaultViewport
  }
});

let carritos = {};
global.client = client;

client.on('qr', qr => {
  global.qrCode = qr;
  global.botStatus = 'QR LISTO';
  console.log('QR LISTO');
});

client.on('ready', () => {
  global.botStatus = 'CONECTADO ' + client.info.wid.user;
  global.qrCode = null;
  console.log('BOT CONECTADO', client.info.wid.user);
});

function getCategorias() {
  const prods = global.db?.productos || [];
  if (prods.length === 0) return ['Helados'];
  return [...new Set(prods.map(p => p.categoria || 'Helados'))];
}
function getProductosPorCategoria(cat) {
  const prods = global.db?.productos || [{nombre:'HELADO DE FRESA', precio:3000, categoria:'Helados', emoji:'🍦', stock:10}];
  return prods.filter(p => (p.categoria || 'Helados') === cat);
}
function resumenCarrito(cart) {
  if(!cart.items.length) return 'Vacío';
  return cart.items.map(i=> `${i.emoji||'🍦'} ${i.cantidad}x ${i.nombre} - $${i.total}`).join('\n');
}
function generarFactura({items, total, observacion, vendedora, metodoPago, cliente}) {
  const fecha = new Date().toLocaleString('es-CO', {timeZone: 'America/Bogota'});
  const codigo = 'JK-' + Date.now().toString().slice(-6);
  return `💖💖💖 HELADERIA JEANKENCHAR 💖💖💖
🤍 CRA 12F #104-20 - BQUILLA 🤍
💖 FACTURA ${codigo} 🤍
🤍 VENDEDORA: ${vendedora || 'BOT AUTOMATICO'} 🤍
🤍 CLIENTE: ${cliente} 🤍
🤍 ${fecha} 🤍

${items.map(i=> `${i.emoji||'🍦'} ${i.cantidad}x ${i.nombre} - $${i.total}`).join('\n')}

💖 OBS: ${observacion || 'Ninguna'} 🤍

💖 TOTAL: $${total} 🤍
💖 PAGO: ${metodoPago || 'NEQUI'} 🤍
💖 NEQUI: 3023790715 - MARIA PARRA 🤍
🤍 GRACIAS POR TU COMPRA 💖`;
}

client.on('message', async msg => {
  try {
    if (msg.fromMe) return;
    if (msg.from.includes('status') || msg.from.includes('@g.us')) return;
    const num = msg.from;
    const textoOriginal = msg.body.trim();
    const texto = textoOriginal.toLowerCase();
    let cart = carritos[num] || { items: [], paso: 'inicio', observacion: '', vendedora: null };
    const vendedora = global.db?.vendedoras?.find(v=> num.includes(v.whatsapp));
    if (vendedora &&!cart.vendedora) {
      cart.vendedora = vendedora.nombre;
      carritos[num] = cart;
    }
    if (num === '573023790715@c.us' && (texto === 'stock' || texto === 'inventario')) {
      let txt = `💖 INVENTARIO JEANKENCHAR 🤍\n\n`;
      (global.db?.productos||[]).forEach(p=>txt+=`${p.emoji||'🍦'} ${p.nombre} | Stock: ${p.stock??0} | $${p.precio}\n`);
      await msg.reply(txt);
      return;
    }

    // --- FIX BUCLE: PRIMERO RESOLVEMOS LOS PASOS ---
    if (cart.paso === 'eligiendo_categoria') {
      const idx = parseInt(texto) - 1;
      const cat = cart.categorias[idx];
      if (cat === undefined || isNaN(idx)) { await msg.reply(`💖 Opción no válida 🤍`); return; }
      const productos = getProductosPorCategoria(cat);
      let txt = `💖 ${cat.toUpperCase()} 🤍\n\n`;
      productos.forEach((p,i) => txt += `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio} Stock:${p.stock??0}\n`);
      await msg.reply(txt);
      carritos[num] = {...cart, paso: 'eligiendo_producto', categoriaSel: cat, productosFiltrados: productos };
      return;
    }
    if (cart.paso === 'eligiendo_producto') {
      const idx = parseInt(texto) - 1;
      const prod = cart.productosFiltrados[idx];
      if (!prod) { await msg.reply(`💖 Producto no válido 🤍`); return; }
      if ((prod.stock??0) <= 0) { await msg.reply(`💖 ${prod.nombre} AGOTADO 🤍`); return; }
      await msg.reply(`💖 Elegiste: ${prod.emoji} ${prod.nombre} $${prod.precio} 🤍\n¿Cuántas?`);
      carritos[num] = {...cart, paso: 'eligiendo_cantidad', productoSel: prod };
      return;
    }
    if (cart.paso === 'eligiendo_cantidad') {
      const cant = parseInt(texto);
      if (isNaN(cant) || cant <= 0) { await msg.reply(`💖 Cantidad no válida 🤍`); return; }
      if (cant > (cart.productoSel.stock??999)) { await msg.reply(`💖 Solo quedan ${cart.productoSel.stock} 🤍`); return; }
      const prod = cart.productoSel;
      cart.items.push({...prod, cantidad: cant, total: prod.precio * cant });
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      await msg.reply(`💖 Agregado 🤍\n\n🛒 ${resumenCarrito(cart)}\n\n💖 TOTAL: $${total} 🤍\n\n1️⃣ Seguir comprando\n2️⃣ Pagar\n3️⃣ Vaciar`);
      carritos[num] = {...cart, paso: 'carrito', productoSel: null };
      return;
    }
    if (cart.paso === 'carrito') {
      if (texto === '1') {
        const cats = getCategorias();
        let txt = `💖 Elige categoria: 🤍\n\n`;
        cats.forEach((c,i) => txt += `${i+1}. 💖 ${c.toUpperCase()} 🤍\n`);
        await msg.reply(txt);
        cart.paso = 'eligiendo_categoria'; cart.categorias = cats;
        carritos[num] = cart; return;
      }
      if (texto === '2') {
        await msg.reply(`💖 ¿Deseas agregar alguna observación? 🤍\n\nTu pedido:\n${resumenCarrito(cart)}\n\nEscribe tu observación o escribe *NO* si no tienes.`);
        cart.paso = 'preguntar_observacion';
        carritos[num] = cart; return;
      }
      if (texto === '3') {
        carritos[num] = { items: [], paso: 'inicio', observacion: '', vendedora: cart.vendedora };
        await msg.reply(`💖 Vaciado 🤍 Escribe menu`); return;
      }
    }
    if (cart.paso === 'preguntar_observacion') {
      let obs = textoOriginal;
      if (texto === 'no' || texto === 'n' || texto === 'ninguna') obs = 'Ninguna';
      cart.observacion = obs;
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      try {
        const qr = MessageMedia.fromFilePath('./qr-nequi.png');
        await client.sendMessage(num, qr, {caption: `💖 Total a pagar: $${total} 🤍\n💖 NEQUI: 3023790715 - MARIA PARRA 🤍\n\n💖 Obs: ${obs} 🤍\n\nEnvía comprobante aquí 💖`});
      } catch (e) {
        await msg.reply(`💖 Total a pagar: $${total} 🤍\n💖 NEQUI: 3023790715 - MARIA PARRA 🤍\n💖 Obs: ${obs} 🤍\n\nEnvía comprobante aquí 💖`);
      }
      cart.paso = 'esperando_comprobante';
      carritos[num] = cart;
      return;
    }
    if (cart.paso === 'esperando_comprobante') {
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      const factura = generarFactura({
        items: cart.items, total, observacion: cart.observacion,
        vendedora: cart.vendedora, metodoPago: 'NEQUI', cliente: num.replace('@c.us','')
      });
      await msg.reply(factura);
      try { await client.sendMessage('573023790715@c.us', `💖 NUEVO PEDIDO 💖\n\n${factura}\nDe: ${num}`); } catch(e){}
      if (global.db?.productos) {
        for (let item of cart.items) {
          let p = global.db.productos.find(pr => pr.nombre === item.nombre);
          if (p) p.stock = (p.stock || 0) - item.cantidad;
        }
        if (global.guardarDB) await global.guardarDB();
      }
      carritos[num] = { items: [], paso: 'inicio', observacion: '', vendedora: cart.vendedora };
      return;
    }
    if (cart.paso === 'esperando_nombre_asesor') {
      await msg.reply(`💖 Gracias ${textoOriginal}, un asesor te contactará pronto 🤍`);
      carritos[num] = { items: [], paso: 'inicio', observacion: '' };
      return;
    }

    // --- COMANDOS GENERALES SOLO EN INICIO ---
    if (['hola','menu','inicio'].includes(texto)) {
      if (vendedora) {
        await msg.reply(`💖 Hola ${vendedora.nombre} te identifique como vendedora de JEANKENCHAR 🤍\nEscribe *MENU* para registrar venta fisica\n\n1️⃣ 🍦 VER MENU\n2️⃣ 🤍 HABLAR CON ASESOR`);
      } else {
        await msg.reply(`💖💖💖 HELADERIA JEANKENCHAR 💖💖💖\n🤍 Cra 12F #104-20 Bquilla 🤍\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 🤍 HABLAR CON ASESOR`);
      }
      carritos[num] = { items: [], paso: 'inicio', observacion: '', vendedora: vendedora?.nombre || null };
      return;
    }
    if ((texto === '1' || texto.includes('ver menu')) && cart.paso === 'inicio') {
      const cats = getCategorias();
      let txt = `💖 MENU JEANKENCHAR 🤍\nElige una categoria:\n\n`;
      cats.forEach((c,i) => txt += `${i+1}. 💖 ${c.toUpperCase()} 🤍\n`);
      await msg.reply(txt);
      carritos[num] = {...cart, paso: 'eligiendo_categoria', categorias: cats, items: cart.items || [] };
      return;
    }
    if (texto === '2' && cart.paso === 'inicio') {
      await msg.reply(`💖 Perfecto, ¿Cuál es tu nombre? 🤍`);
      carritos[num] = {...cart, paso: 'esperando_nombre_asesor'};
      return;
    }

  } catch (e) {
    console.log('❌ ERROR', e.message);
  }
});

await client.initialize();
})();
