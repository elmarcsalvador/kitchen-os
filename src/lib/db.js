import { createClient } from '@libsql/client';

const options = { url: process.env.TURSO_DATABASE_URL || `file:${process.cwd()}/local.db` };
if (process.env.TURSO_AUTH_TOKEN) options.authToken = process.env.TURSO_AUTH_TOKEN;
export const db = createClient(options);

let setupPromise;
function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
const starterProducts = [
  ['Milk','Dairy',2,'cartons',1,0,4,'Fridge'],
  ['Cheddar cheese','Dairy',1,'pack',1,-2,14,'Fridge'],
  ['Tomatoes','Produce',8,'pieces',3,0,4,'Crisper drawer'],
  ['Spinach','Produce',1,'bag',2,-1,2,'Fridge'],
  ['Rice','Pantry',2,'kg',1,-6,359,'Dry storage'],
  ['Cooking oil','Pantry',1,'bottle',1,-11,354,'Dry storage'],
  ['Ketchup','Condiments',1,'bottle',1,-16,165,'Fridge'],
  ['Mixed vegetables','Frozen',2,'bags',1,-8,173,'Freezer'],
  ['Bread','Bakery',1,'loaf',1,-1,2,'Bread shelf'],
  ['Dish soap','Cleaning supplies',1,'bottle',1,-14,null,'Under sink']
];
export async function ensureDatabase() {
  if (process.env.NODE_ENV === 'production' && !process.env.TURSO_DATABASE_URL) throw new Error('Connect a Turso database before using the production app.');
  if (!setupPromise) setupPromise = (async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      quantityAmount REAL NOT NULL DEFAULT 0, quantityUnit TEXT NOT NULL DEFAULT 'unit',
      minQty REAL NOT NULL DEFAULT 1, purchaseDate TEXT NOT NULL DEFAULT '',
      expiryDate TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
      barcode TEXT NOT NULL DEFAULT '', estimated INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'In stock', isPackaged INTEGER NOT NULL DEFAULT 0,
      labelData TEXT NOT NULL DEFAULT '', manufactureDate TEXT NOT NULL DEFAULT '',
      shelfLifeMonths REAL NOT NULL DEFAULT 0, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    let columns = await db.execute('PRAGMA table_info(products)');
    let names = new Set(columns.rows.map(row => row.name));
    if (!names.has('quantityAmount')) {
      try { await db.execute("ALTER TABLE products ADD COLUMN quantityAmount REAL NOT NULL DEFAULT 0"); } catch {}
    }
    columns = await db.execute('PRAGMA table_info(products)');
    names = new Set(columns.rows.map(row => row.name));
    if (!names.has('quantityUnit')) {
      try { await db.execute("ALTER TABLE products ADD COLUMN quantityUnit TEXT NOT NULL DEFAULT 'unit'"); } catch {}
    }
    if (!names.has('isPackaged')) {
      try { await db.execute('ALTER TABLE products ADD COLUMN isPackaged INTEGER NOT NULL DEFAULT 0'); } catch {}
    }
    if (!names.has('labelData')) {
      try { await db.execute("ALTER TABLE products ADD COLUMN labelData TEXT NOT NULL DEFAULT ''"); } catch {}
    }
    columns = await db.execute('PRAGMA table_info(products)');
    names = new Set(columns.rows.map(row => row.name));
    if (!names.has('manufactureDate')) {
      try { await db.execute("ALTER TABLE products ADD COLUMN manufactureDate TEXT NOT NULL DEFAULT ''"); } catch {}
    }
    if (!names.has('shelfLifeMonths')) {
      try { await db.execute('ALTER TABLE products ADD COLUMN shelfLifeMonths REAL NOT NULL DEFAULT 0'); } catch {}
    }
    if (names.has('quantity')) {
      const oldRows = await db.execute('SELECT id,quantity FROM products WHERE quantityAmount=0');
      for (const row of oldRows.rows) {
        const match = String(row.quantity || '').trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
        if (match) await db.execute({ sql: 'UPDATE products SET quantityAmount=?,quantityUnit=? WHERE id=?', args: [Number(match[1]),match[2]||'unit',row.id] });
      }
    }
    await db.execute('CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode)');
    const count = await db.execute('SELECT COUNT(*) AS count FROM products');
    if (Number(count.rows[0].count) === 0) {
      for (const [name,category,quantityAmount,quantityUnit,minQty,purchaseOffset,expiryOffset,location] of starterProducts) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO products (id,name,category,quantityAmount,quantityUnit,minQty,purchaseDate,expiryDate,location,estimated,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          args: [`starter-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,name,category,quantityAmount,quantityUnit,minQty,dateOffset(purchaseOffset),expiryOffset === null ? '' : dateOffset(expiryOffset),location,['Tomatoes','Spinach','Bread'].includes(name) ? 1 : 0,name === 'Spinach' ? 'Low stock' : 'In stock']
        });
      }
    }
  })();
  return setupPromise;
}
export function serialize(row) {
  let labelData=null;
  if(row.isPackaged){try{labelData=JSON.parse(row.labelData||'{}')}catch{labelData={}}}
  return { ...row, quantityAmount:Number(row.quantityAmount), quantityUnit:row.quantityUnit||'unit', quantity:`${Number(row.quantityAmount)} ${row.quantityUnit||'unit'}`.trim(), minQty:Number(row.minQty), shelfLifeMonths:Number(row.shelfLifeMonths||0), estimated:Boolean(row.estimated), isPackaged:Boolean(row.isPackaged), labelData };
}
