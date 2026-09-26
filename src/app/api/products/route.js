import { NextResponse } from 'next/server';
import { db, ensureDatabase, serialize } from '@/lib/db';
import { optionsResponse, withCors } from '@/lib/cors';

export const runtime = 'nodejs';
const fields = ['name','category','quantityAmount','quantityUnit','minQty','purchaseDate','manufactureDate','shelfLifeMonths','expiryDate','location','barcode','estimated','status','isPackaged','labelData'];
function clean(input) {
  const out = {};
  for (const field of fields) {
    if (input[field] !== undefined) out[field] = ['minQty','quantityAmount','shelfLifeMonths'].includes(field) ? Number(input[field] || 0) : ['estimated','isPackaged'].includes(field) ? Number(Boolean(input[field])) : String(input[field] ?? '');
  }
  return out;
}
const selectProduct = 'SELECT id,name,category,quantityAmount,quantityUnit,minQty,purchaseDate,manufactureDate,shelfLifeMonths,expiryDate,location,barcode,estimated,status,isPackaged,labelData,createdAt FROM products';
async function getProducts() {
  try { await ensureDatabase(); const result = await db.execute(`${selectProduct} ORDER BY name COLLATE NOCASE`); return NextResponse.json(result.rows.map(serialize)); }
  catch { return NextResponse.json({ error: 'Inventory database is unavailable.' }, { status: 503 }); }
}
export async function GET() { return withCors(await getProducts()); }
async function createProduct(request) {
  try {
    await ensureDatabase(); const input = await request.json();
    const values = clean(input);
    if (!values.name?.trim() || !values.category || !(values.quantityAmount > 0) || !values.quantityUnit?.trim()) return NextResponse.json({ error: 'Name, category, quantity, and unit are required.' }, { status: 400 });
    const id = crypto.randomUUID();
    const columns = ['id', ...Object.keys(values)];
    const args = [id, ...Object.values(values)];
    await db.execute({ sql: `INSERT INTO products (${columns.map(c => `"${c}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`, args });
    const result = await db.execute({ sql: `${selectProduct} WHERE id=?`, args: [id] });
    return NextResponse.json(serialize(result.rows[0]), { status: 201 });
  } catch { return NextResponse.json({ error: 'Could not save product.' }, { status: 500 }); }
}
export async function POST(request) { return withCors(await createProduct(request)); }
export function OPTIONS() { return optionsResponse(); }
