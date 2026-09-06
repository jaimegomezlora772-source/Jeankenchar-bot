const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  }
});

let carritos = {};
global.client = client;

client.on('qr', qr => {
  global.qrCode = qr;
  global.botStatus = 'QR LISTO - ESCANEA';
  console.log('QR LISTO');
});

client.on('ready', () => {
  global.botStatus = 'CONECTADO ' + client.info.wid.user;
  global.qrCode = null;
  console.log('BOT CONECTADO', client.info.wid.user);
});

client.on('auth_failure', m => console.log('AUTH FAIL', m));

function getCategorias() {
  if (!global.db ||!global.db.productos || global.db.productos.length === 0) return ['Helados'];
  return [...new Set(global.db.productos.map(p => p.categoria || 'Helados'))];
}
function getProductosPorCategoria(cat) {
  if (!global.db ||!global.db.productos) return [{nombre:'HELADO DE FRESA', precio:3000, categoria:'Helados', emoji:'🔴', stock:10}];
  return global.db.productos.filter(p => (p.categoria || 'Helados') === cat);
}

client.on('message', async msg => {
  try {
    if (msg.fromMe) return;
    if (msg.from.includes('status') || msg.from.includes('@g.us')) return;
    console.log('📩', msg.from, msg.body);
    const texto = msg.body.trim().toLowerCase();
    const num = msg.from;
    const cart = carritos[num] || { items: [], paso: 'inicio' };

    const ADMIN = '573023790715@c.us';
    if (msg.from === ADMIN && (texto === 'stock' || texto === 'inventario')) {
      let txt = `📦 INVENTARIO\n\n`;
      (global.db?.productos || []).forEach(p => txt += `${p.emoji||'🍦'} ${p.nombre} | Stock: ${p.stock??0} | $${p.precio}\n`);
      await msg.reply(txt);
      return;
    }

    if (texto === 'hola' || texto === 'menu' || texto === 'inicio') {
      carritos[num] = { items: [], paso: 'inicio' };
      await msg.reply(`💖 HELADERIA JEANKENCHAR 💖\n\n1️⃣ 🍦 VER MENU\n2️⃣ 👩‍💼 ASESOR`);
      return;
    }
    if (texto === '1' && cart.paso === 'inicio') {
      const cats = getCategorias();
      let txt = `💖 MENU - Elige categoria:\n\n`;
      cats.forEach((c,i) => txt += `${i+1}. 📂 ${c.toUpperCase()}\n`);
      await msg.reply(txt);
      carritos[num] = { items: [], paso: 'eligiendo_categoria', categorias: cats };
      return;
    }
    if (texto === '2' && cart.paso === 'inicio') {
      await msg.reply(`🤍 Un asesor te atenderá pronto.`);
      carritos[num].paso = 'esperando_asesor';
      return;
    }
    if (cart.paso === 'eligiendo_categoria') {
      const idx = parseInt(texto) - 1;
      const cat = cart.categorias[idx];
      if (cat === undefined || isNaN(idx)) { await msg.reply(`❌ Número de categoria no válido`); return; }
      const productos = getProductosPorCategoria(cat);
      let txt = `💖 ${cat.toUpperCase()}\n\n`;
      productos.forEach((p,i) => txt += `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio} (Stock:${p.stock??0})\n`);
      await msg.reply(txt);
      carritos[num] = {...cart, paso: 'eligiendo_producto', categoriaSel: cat, productosFiltrados: productos };
      return;
    }
    if (cart.paso === 'eligiendo_producto') {
      const idx = parseInt(texto) - 1;
      const prod = cart.productosFiltrados[idx];
      if (!prod) { await msg.reply(`❌ Producto no válido`); return; }
      if ((prod.stock??0) <= 0) { await msg.reply(`❌ Agotado`); return; }
      await msg.reply(`✅ ${prod.nombre} $${prod.precio}\n¿Cuántas? Escribe número`);
      carritos[num] = {...cart, paso: 'eligiendo_cantidad', productoSel: prod };
      return;
    }
    if (cart.paso === 'eligiendo_cantidad') {
      const cant = parseInt(texto);
      if (isNaN(cant) || cant <= 0) { await msg.reply(`❌ Cantidad no válida`); return; }
      const prod = cart.productoSel;
      if (cant > (prod.stock??100)) { await msg.reply(`❌ Solo quedan ${prod.stock}`); return; }
      const item = {...prod, cantidad: cant, total: prod.precio * cant };
      cart.items.push(item);
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      let resumen = `🛒 CARRITO:\n`;
      cart.items.forEach(i => resumen += `${i.cantidad}x ${i.nombre} $${i.total}\n`);
      resumen += `\nTOTAL $${total}\n\n1️⃣ Seguir 2️⃣ Pagar 3️⃣ Vaciar`;
      await msg.reply(resumen);
      carritos[num] = {...cart, paso: 'carrito', productoSel: null };
      return;
    }
    if (cart.paso === 'carrito') {
      if (texto === '1') {
        const cats = getCategorias();
        let txt = `Elige categoria:\n`; cats.forEach((c,i) => txt += `${i+1}. ${c}\n`);
        await msg.reply(txt);
        carritos[num].paso = 'eligiendo_categoria'; carritos[num].categorias = cats; return;
      }
      if (texto === '2') { await msg.reply(`💖 Total: $${cart.items.reduce((s,i)=>s+i.total,0)}\nNEQUI 3023790715`); carritos[num].paso = 'esperando_comprobante'; return; }
      if (texto === '3') { carritos[num] = { items: [], paso: 'inicio' }; await msg.reply(`Vaciado. Escribe menu`); return; }
    }
    await msg.reply(`Escribe *menu*`);
  } catch (e) { console.log('❌ ERROR MSG', e.message); }
});

client.initialize().then(()=>console.log('Inicializando cliente...')).catch(e=>console.log('INIT ERROR', e));
