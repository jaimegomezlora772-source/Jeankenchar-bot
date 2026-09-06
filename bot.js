const { Client, LocalAuth } = require('whatsapp-web.js');
const chromium = require('@sparticuz/chromium-min');

(async () => {
const executablePath = await chromium.executablePath();
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { executablePath, headless: true, args: chromium.args }
});

let carritos = {};
global.client = client;

client.on('qr', qr => { global.qrCode = qr; global.botStatus = 'QR LISTO'; console.log('QR LISTO'); });
client.on('ready', () => { global.botStatus = 'CONECTADO ' + client.info.wid.user; global.qrCode = null; console.log('BOT CONECTADO', client.info.wid.user); });

function getCategorias() {
  const prods = global.db?.productos || [];
  if (prods.length === 0) return ['Helados'];
  return [...new Set(prods.map(p => p.categoria || 'Helados'))];
}
function getProductosPorCategoria(cat) {
  const prods = global.db?.productos || [{nombre:'HELADO DE FRESA', precio:3000, categoria:'Helados', emoji:'🔴', stock:10}];
  return prods.filter(p => (p.categoria || 'Helados') === cat);
}

client.on('message', async msg => {
  try {
    if (msg.fromMe) return;
    if (msg.from.includes('status') || msg.from.includes('@g.us')) return;
    const texto = msg.body.trim().toLowerCase();
    const num = msg.from;
    const cart = carritos[num] || { items: [], paso: 'inicio' };

    // ADMIN STOCK
    if (num === '573023790715@c.us' && (texto === 'stock' || texto === 'inventario')) {
      let txt = `📦 STOCK ACTUAL\n\n`;
      (global.db?.productos||[]).forEach(p=>txt+=`${p.emoji} ${p.nombre} - Stock: ${p.stock??0}\n`);
      await msg.reply(txt); return;
    }

    if (['hola','menu','inicio'].includes(texto)) {
      carritos[num] = { items: [], paso: 'inicio' };
      await msg.reply(`💖💖💖 HELADERIA JEANKENCHAR 💖💖\n🤍 Cra 12F #104-20 Bquilla\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 👩‍💼 HABLAR CON ASESOR`);
      return;
    }

    if (texto === '1' && cart.paso === 'inicio') {
      const cats = getCategorias();
      let txt = `💖 MENU JEANKENCHAR 🤍\nElige una categoria:\n\n`;
      cats.forEach((c,i) => txt += `${i+1}. 📂 ${c.toUpperCase()}\n`);
      txt += `\nEscribe el numero de la categoria`;
      await msg.reply(txt);
      carritos[num] = { items: [], paso: 'eligiendo_categoria', categorias: cats };
      return;
    }

    if (texto === '2' && cart.paso === 'inicio') {
      await msg.reply(`🤍 Perfecto, un asesor te atenderá pronto. ¿Cuál es tu nombre?`);
      carritos[num].paso = 'esperando_asesor'; return;
    }

    if (cart.paso === 'eligiendo_categoria') {
      const idx = parseInt(texto) - 1;
      const cat = cart.categorias[idx];
      if (cat === undefined || isNaN(idx)) { await msg.reply(`❌ Opción no válida.`); return; }
      const productos = getProductosPorCategoria(cat);
      let txt = `💖 ${cat.toUpperCase()} 🤍\n\n`;
      productos.forEach((p,i) => txt += `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio}\n`);
      txt += `\nEscribe el número del producto que quieres`;
      await msg.reply(txt);
      carritos[num] = {...cart, paso: 'eligiendo_producto', categoriaSel: cat, productosFiltrados: productos };
      return;
    }

    if (cart.paso === 'eligiendo_producto') {
      const idx = parseInt(texto) - 1;
      const prod = cart.productosFiltrados[idx];
      if (!prod) { await msg.reply(`❌ Producto no válido.`); return; }
      await msg.reply(`✅ Elegiste: ${prod.emoji||'🍦'} ${prod.nombre}\n💰 $${prod.precio}\n\n¿Cuántas unidades quieres? Escribe solo el número (ej: 2)`);
      carritos[num] = {...cart, paso: 'eligiendo_cantidad', productoSel: prod };
      return;
    }

    if (cart.paso === 'eligiendo_cantidad') {
      const cant = parseInt(texto);
      if (isNaN(cant) || cant <= 0) { await msg.reply(`❌ Escribe una cantidad válida, solo números. Ej: 2`); return; }
      // validación stock sin romper lógica
      if (cant > (cart.productoSel.stock?? 999)) { await msg.reply(`❌ Solo me quedan ${cart.productoSel.stock} unidades de ${cart.productoSel.nombre}`); return; }
      const prod = cart.productoSel;
      const item = {...prod, cantidad: cant, total: prod.precio * cant };
      cart.items.push(item);
      const totalCarrito = cart.items.reduce((s,i)=>s+i.total,0);
      let resumen = `🛒 CARRITO:\n`;
      cart.items.forEach(i => resumen += `${i.emoji||'🍦'} ${i.cantidad}x ${i.nombre} - $${i.total}\n`);
      resumen += `\n💖 TOTAL: $${totalCarrito}\n\n1️⃣ Seguir comprando\n2️⃣ Pagar\n3️⃣ Vaciar carrito`;
      await msg.reply(`✅ Agregado ${cant}x ${prod.nombre}\n\n${resumen}`);
      carritos[num] = {...cart, paso: 'carrito', productoSel: null };
      return;
    }

    if (cart.paso === 'carrito') {
      if (texto === '1') {
        const cats = getCategorias();
        let txt = `💖 Elige categoria:\n\n`;
        cats.forEach((c,i) => txt += `${i+1}. 📂 ${c.toUpperCase()}\n`);
        await msg.reply(txt);
        carritos[num].paso = 'eligiendo_categoria'; carritos[num].categorias = cats; return;
      }
      if (texto === '2') {
        const total = cart.items.reduce((s,i)=>s+i.total,0);
        await msg.reply(`💖 Total a pagar: $${total}\n💖 NEQUI: 3023790715 - MARIA PARRA\n\nEnvía comprobante aquí 🤍`);
        carritos[num].paso = 'esperando_comprobante'; return;
      }
      if (texto === '3') { carritos[num] = { items: [], paso: 'inicio' }; await msg.reply(`🗑️ Carrito vaciado. Escribe *menu* para empezar.`); return; }
    }

    await msg.reply(`💖 Escribe *menu* para ver el menú 🤍`);
  } catch (e) { console.log('❌ ERROR', e.message); }
});

await client.initialize();
})();
