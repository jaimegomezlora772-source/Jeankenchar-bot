const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
let chromium;
try { chromium = require('@sparticuz/chromium-min'); } catch(e){ console.log('chromium-min no disponible, usando args default'); }

(async () => {
try {
console.log('⏳ Iniciando bot...');
let executablePath = undefined;
let browserArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--disable-gpu',
  '--disable-extensions'
];

if (chromium) {
  console.log('Usando args de chromium-min sin descargar pack externo');
  browserArgs = chromium.args;
}

// Buscar Chrome instalado por puppeteer en Render
function findChrome() {
  const cachePath = '/opt/render/.cache/puppeteer';
  try {
    if (!fs.existsSync(cachePath)) return undefined;
    const chromeDir = path.join(cachePath, 'chrome');
    if (!fs.existsSync(chromeDir)) return undefined;
    const versions = fs.readdirSync(chromeDir);
    for (const ver of versions) {
      const possible = path.join(chromeDir, ver, 'chrome-linux64', 'chrome');
      if (fs.existsSync(possible)) {
        return possible;
      }
    }
  } catch(e){ console.log('Error buscando chrome', e.message); }
  return undefined;
}

const foundChrome = findChrome();
if (foundChrome) {
  executablePath = foundChrome;
  console.log('Chrome encontrado:', executablePath);
} else {
  console.log('Chrome no encontrado en cache, intentando default');
}

console.log('Chromium final:', executablePath || 'bundled/default');
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath: executablePath,
    headless: true,
    args: browserArgs,
    defaultViewport: chromium?.defaultViewport || null
  }
});

let carritos = {};
let numeroVinculado = null;
global.client = client;

function esAdmin(num) {
  if (numeroVinculado && num === numeroVinculado) return true;
  if (client.info?.wid?._serialized && num === client.info.wid._serialized) return true;
  const vendedoras = global.db?.vendedoras || [];
  return vendedoras.some(v => {
    const w = (v.whatsapp || '').replace(/\D/g,'');
    return w && num.includes(w);
  });
}

client.on('qr', qr => {
  global.qrCode = qr;
  global.botStatus = 'QR LISTO';
  console.log('QR LISTO - ve a /qr');
});
client.on('authenticated', () => console.log('✅ Autenticado'));
client.on('auth_failure', e => {
  console.log('❌ Auth fail', e);
  global.botStatus = 'Auth fail: ' + e;
});
client.on('ready', () => {
  numeroVinculado = client.info.wid._serialized;
  global.numeroVinculado = numeroVinculado;
  global.botStatus = 'CONECTADO ' + client.info.wid.user;
  global.qrCode = null;
  console.log('BOT CONECTADO - ADMIN ES:', numeroVinculado);
});
client.on('disconnected', r => {
  console.log('❌ Desconectado', r);
  global.botStatus = 'Desconectado: ' + r;
  setTimeout(()=> client.initialize(), 3000);
});

function getCategorias() {
  const prods = global.db?.productos || [];
  if (prods.length === 0) return ['HELADOS POR BOLA'];
  return [...new Set(prods.map(p => (p.categoria || 'Helados').trim()))];
}
function getProductosPorCategoria(cat) {
  const prods = global.db?.productos || [];
  return prods.filter(p => (p.categoria || 'Helados').trim() === cat.trim());
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
📄 FACTURA ${codigo}
👩‍💼 VENDEDORA: ${vendedora || 'BOT AUTOMATICO'}
👤 CLIENTE: ${cliente}
📅 ${fecha}

${items.map(i=> `${i.emoji||'🍦'} ${i.cantidad}x ${i.nombre} - $${i.total}`).join('\n')}

📝 OBS: ${observacion || 'Ninguna'}

💖 TOTAL: $${total} 🤍
💰 PAGO: ${metodoPago || 'NEQUI'}
💖 NEQUI: 3023790715 - MARIA PARRA
🤍 GRACIAS POR TU COMPRA 💖`;
}

client.on('message', async msg => {
  try {
    if (msg.fromMe) return;
    if (msg.from.includes('status') || msg.from.includes('@g.us')) return;
    const num = msg.from;
    const textoOriginal = msg.body.trim();
    const texto = textoOriginal.toLowerCase();
    console.log(`📩 ${num}: ${textoOriginal}`);
    let cart = carritos[num] || { items: [], paso: 'inicio', observacion: '', vendedora: null };

    const vendedora = global.db?.vendedoras?.find(v=> num.includes((v.whatsapp||'').replace(/\D/g,'')));
    if (vendedora &&!cart.vendedora) {
      cart.vendedora = vendedora.nombre;
      carritos[num] = cart;
    }

    if (['hola','menu','inicio','reset'].includes(texto)) {
      if (esAdmin(num)) {
        await msg.reply(`💖 *PANEL ADMIN JEANKENCHAR* 🤍\nHola ${cart.vendedora || 'Admin'} ✨\nAdmin vinculado: ${numeroVinculado || client.info?.wid?.user || 'cargando...'}\n\n1️⃣ 🍦 VER MENU CLIENTE\n2️⃣ 📦 VER STOCK`);
      } else {
        await msg.reply(`💖💖💖 HELADERIA JEANKENCHAR 💖💖💖\n🤍 Cra 12F #104-20 Bquilla 🤍\n\n¿Qué deseas?\n\n1️⃣ 🍦 VER MENU\n2️⃣ 🤍 HABLAR CON ASESOR`);
      }
      carritos[num] = { items: [], paso: 'inicio', observacion: '', vendedora: cart.vendedora };
      return;
    }

    if (['stock','inventario','admin'].includes(texto)) {
      if (!esAdmin(num)) {
        await msg.reply(`❌ No tienes permiso 🤍`);
        return;
      }
      let txt = `📦 *INVENTARIO - ADMIN*\nAdmin: ${numeroVinculado}\n━━━━━━━━━━━━━━━\n\n`;
      (global.db?.productos||[]).forEach(p=>{
        let s = p.stock; if(s===undefined||s===null) s=100;
        txt+=`${p.emoji||'🍦'} ${p.nombre}\nCat: ${p.categoria} | Stock: ${s} | $${p.precio}\n\n`;
      });
      await msg.reply(txt);
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
      if (esAdmin(num)) {
        let txt = `📦 *INVENTARIO*\n\n`;
        (global.db?.productos||[]).forEach(p=>{
          let s = p.stock; if(s===undefined||s===null) s=100;
          txt+=`${p.emoji||'🍦'} ${p.nombre} | Stock: ${s} | $${p.precio}\n`;
        });
        await msg.reply(txt);
        return;
      }
      await msg.reply(`🤍 Perfecto, ¿Cuál es tu nombre?`);
      carritos[num] = {...cart, paso: 'esperando_nombre_asesor'};
      return;
    }
    if (cart.paso === 'eligiendo_categoria') {
      const idx = parseInt(texto) - 1;
      const cat = cart.categorias[idx];
      if (cat === undefined || isNaN(idx)) { await msg.reply(`❌ Opción no válida.`); return; }
      const productos = getProductosPorCategoria(cat);
      let txt = `💖 ${cat.toUpperCase()} 🤍\n\n`;
      productos.forEach((p,i) => {
        txt += `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio}\n`;
      });
      await msg.reply(txt);
      carritos[num] = {...cart, paso: 'eligiendo_producto', categoriaSel: cat, productosFiltrados: productos };
      return;
    }
    if (cart.paso === 'eligiendo_producto') {
      const idx = parseInt(texto) - 1;
      const prod = cart.productosFiltrados[idx];
      if (!prod) { await msg.reply(`❌ Producto no válido.`); return; }
      const prodFresco = (global.db?.productos||[]).find(p=> p.nombre === prod.nombre) || prod;
      let stockReal = prodFresco.stock;
      if (stockReal === undefined || stockReal === null) stockReal = 100;
      if (stockReal <= 0) {
        await msg.reply(`❌ ${prodFresco.nombre} no está disponible en este momento 🤍\nElige otro sabor:`);
        let txt2 = `💖 ${cart.categoriaSel.toUpperCase()} 🤍\n\n`;
        cart.productosFiltrados.forEach((p,i) => {
          txt2 += `${i+1}. ${p.emoji||'🍦'} ${p.nombre} - $${p.precio}\n`;
        });
        await msg.reply(txt2);
        return;
      }
      prodFresco.stock = stockReal;
      await msg.reply(`✅ Elegiste: ${prodFresco.emoji||'🍦'} ${prodFresco.nombre} $${prodFresco.precio}\n¿Cuántas unidades deseas?`);
      carritos[num] = {...cart, paso: 'eligiendo_cantidad', productoSel: prodFresco };
      return;
    }
    if (cart.paso === 'eligiendo_cantidad') {
      const cant = parseInt(texto);
      if (isNaN(cant) || cant <= 0) { await msg.reply(`❌ Cantidad no válida.`); return; }
      let stockDisp = cart.productoSel.stock; if(stockDisp===undefined||stockDisp===null) stockDisp=100;
      if (cant > stockDisp) { await msg.reply(`❌ Solo nos quedan ${stockDisp} disponibles 🤍\nElige una cantidad menor.`); return; }
      const prod = cart.productoSel;
      cart.items.push({...prod, cantidad: cant, total: prod.precio * cant });
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      await msg.reply(`✅ Agregado al carrito\n\n🛒 ${resumenCarrito(cart)}\n\n💖 TOTAL: $${total}\n\n1️⃣ Seguir comprando\n2️⃣ Pagar\n3️⃣ Vaciar carrito`);
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
        await msg.reply(`🗑️ Carrito vaciado. Escribe HOLA`); return;
      }
    }
    if (cart.paso === 'preguntar_observacion') {
      let obs = textoOriginal;
      if (['no','n','ninguna'].includes(texto)) obs = 'Ninguna';
      cart.observacion = obs;
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      try {
        const qr = MessageMedia.fromFilePath('./qr-nequi.png');
        await client.sendMessage(num, qr, {caption: `💖 Total a pagar: $${total}\n💖 NEQUI: 3023790715 - MARIA PARRA\n\n📝 Obs: ${obs}\n\nEnvía comprobante aquí 🤍`});
      } catch (e) {
        await msg.reply(`💖 Total a pagar: $${total}\n💖 NEQUI: 3023790715 - MARIA PARRA\n📝 Obs: ${obs}\n\nEnvía comprobante aquí 🤍`);
      }
      cart.paso = 'esperando_comprobante';
      carritos[num] = cart;
      return;
    }
    if (cart.paso === 'esperando_comprobante') {
      const total = cart.items.reduce((s,i)=>s+i.total,0);
      const factura = generarFactura({
        items: cart.items,
        total,
        observacion: cart.observacion,
        vendedora: cart.vendedora,
        metodoPago: 'NEQUI',
        cliente: num.replace('@c.us','')
      });
      await msg.reply(factura);
      try {
        const destino = numeroVinculado || client.info.wid._serialized;
        await client.sendMessage(destino, `🔔 NUEVO PEDIDO\n\n${factura}\nDe: ${num}`);
      } catch(e){}
      if (global.db?.productos) {
        for (let item of cart.items) {
          let p = global.db.productos.find(pr => pr.nombre === item.nombre);
          if (p) {
            let s = p.stock; if(s===undefined||s===null) s=100;
            p.stock = s - item.cantidad;
          }
        }
      }
      carritos[num] = { items: [], paso: 'inicio', observacion: '', vendedora: cart.vendedora };
      return;
    }
    if (cart.paso === 'esperando_nombre_asesor') {
      await msg.reply(`🤍 Gracias ${textoOriginal}, un asesor te contactará pronto.`);
      try {
        const destino = numeroVinculado || client.info.wid._serialized;
        await client.sendMessage(destino, `🔔 Cliente pide asesor: ${textoOriginal} - ${num}`);
      } catch(e){}
      carritos[num] = { items: [], paso: 'inicio', observacion: '' };
      return;
    }
  } catch (e) {
    console.log('❌ ERROR mensaje', e.message, e.stack);
  }
});

console.log('⏳ Inicializando WhatsApp...');
await client.initialize();

} catch(err) {
  console.log('❌ ERROR FATAL BOT', err);
  global.botStatus = 'ERROR: ' + err.message;
}
})();
