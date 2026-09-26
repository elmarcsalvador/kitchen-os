import { NextResponse } from 'next/server';
import { db, ensureDatabase, serialize } from '@/lib/db';
import { optionsResponse, withCors } from '@/lib/cors';

export const runtime = 'nodejs';
const allowed = new Set(['name','category','quantityAmount','quantityUnit','minQty','purchaseDate','manufactureDate','shelfLifeMonths','expiryDate','location','barcode','estimated','status','isPackaged','labelData']);
const selectProduct = 'SELECT id,name,category,quantityAmount,quantityUnit,minQty,purchaseDate,manufactureDate,shelfLifeMonths,expiryDate,location,barcode,estimated,status,isPackaged,labelData,createdAt FROM products';
async function patchProduct(request, { params }) {
  try {
    await ensureDatabase(); const { id } = await params; const input = await request.json();
    const entries = Object.entries(input).filter(([key]) => allowed.has(key));
    if (!entries.length) return NextResponse.json({ error: 'No editable fields supplied.' }, { status: 400 });
    const args = entries.map(([key,value]) => ['estimated','isPackaged'].includes(key) ? Number(Boolean(value)) : ['minQty','quantityAmount','shelfLifeMonths'].includes(key) ? Number(value || 0) : String(value ?? ''));
    args.push(id);
    const result = await db.execute({ sql: `UPDATE products SET ${entries.map(([key]) => `"${key}"=?`).join(',')} WHERE id=?`, args });
    if (!Number(result.rowsAffected)) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const updated = await db.execute({ sql: `${selectProduct} WHERE id=?`, args: [id] });
    return NextResponse.json(serialize(updated.rows[0]));
  } catch { return NextResponse.json({ error: 'Could not update product.' }, { status: 500 }); }
}
export async function PATCH(request, context) { return withCors(await patchProduct(request, context)); }
async function deleteProduct(_request, { params }) {
  try { await ensureDatabase(); const { id } = await params; await db.execute({ sql: 'DELETE FROM products WHERE id=?', args: [id] }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Could not remove product.' }, { status: 500 }); }
}
export async function DELETE(request, context) { return withCors(await deleteProduct(request, context)); }
export function OPTIONS() { return optionsResponse(); }
