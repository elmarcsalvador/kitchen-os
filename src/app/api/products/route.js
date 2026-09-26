import { NextResponse } from 'next/server';
import { db, ensureDatabase, serialize } from '@/lib/db';

export const runtime = 'nodejs';
const fields = ['name','category','quantityAmount','quantityUnit','minQty','purchaseDate','expiryDate','location','barcode','estimated','status'];
function clean(input) {
  const out = {};
  for (const field of fields) {
    if (input[field] !== undefined) out[field] = field === 'minQty' || field === 'quantityAmount' ? Number(input[field] || 0) : field === 'estimated' ? Number(Boolean(input[field])) : String(input[field] ?? '');
  }
  return out;
}
const selectProduct = 'SELECT id,name,category,quantityAmount,quantityUnit,minQty,purchaseDate,expiryDate,location,barcode,estimated,status,createdAt FROM products';
export async function GET() {
  try { await ensureDatabase(); const result = await db.execute(`${selectProduct} ORDER BY name COLLATE NOCASE`); return NextResponse.json(result.rows.map(serialize)); }
  catch { return NextResponse.json({ error: 'Inventory database is unavailable.' }, { status: 503 }); }
}
export async function POST(request) {
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
