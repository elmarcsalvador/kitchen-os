import { NextResponse } from 'next/server';
import { optionsResponse, withCors } from '@/lib/cors';

export const runtime = 'nodejs';

function nutrient(source, keys, unit) {
  for (const key of keys) {
    if(source?.[key]===undefined||source?.[key]===null||source?.[key]==='')continue;
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return { value, unit };
  }
  return null;
}

function categoryFrom(tags=[]) {
  const value=tags.join(' ').toLowerCase();
  if(/dairy|milk|cheese|yogurt/.test(value))return 'Dairy';
  if(/frozen/.test(value))return 'Frozen';
  if(/sauce|condiment|ketchup|mustard/.test(value))return 'Condiments';
  if(/bread|bakery/.test(value))return 'Bakery';
  if(/fruit|vegetable|produce/.test(value))return 'Produce';
  if(/rice|pasta|cereal|grain|pantry|oil/.test(value))return 'Pantry';
  return 'Other';
}

async function lookup(request) {
  const barcode=new URL(request.url).searchParams.get('barcode')?.trim()||'';
  if(!/^\d{8,14}$/.test(barcode))return NextResponse.json({error:'Enter a valid product barcode.'},{status:400});
  try{
    const url=`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,quantity,ingredients_text,allergens,categories_tags,nutriments`;
    const response=await fetch(url,{headers:{'User-Agent':'KitchenOS/1.0 (packaged product lookup)'},next:{revalidate:3600}});
    if(!response.ok)throw new Error('Product database request failed');
    const result=await response.json();
    const product=result.status===1?result.product:null;
    if(!product?.product_name)return NextResponse.json({error:'No packaged product found for that barcode.'},{status:404});
    const n=product.nutriments||{};
    const nutrition={
      basis:'per 100 g / 100 ml',
      energy:nutrient(n,['energy-kcal_100g'],'kcal'),
      energyKj:nutrient(n,['energy-kj_100g'],'kJ'),
      fat:nutrient(n,['fat_100g'],'g'),
      saturatedFat:nutrient(n,['saturated-fat_100g'],'g'),
      carbohydrates:nutrient(n,['carbohydrates_100g'],'g'),
      sugars:nutrient(n,['sugars_100g'],'g'),
      fiber:nutrient(n,['fiber_100g'],'g'),
      protein:nutrient(n,['proteins_100g'],'g'),
      salt:nutrient(n,['salt_100g'],'g'),
      sodium:nutrient(n,['sodium_100g'],'g')
    };
    return NextResponse.json({
      name:String(product.product_name).trim(),
      category:categoryFrom(product.categories_tags||[]),
      isPackaged:true,
      labelData:{source:'Open Food Facts',brand:product.brands||'',packageSize:product.quantity||'',ingredients:product.ingredients_text||'',allergens:product.allergens||'',nutrition}
    });
  }catch{
    return NextResponse.json({error:'The packaged product database is temporarily unavailable.'},{status:502});
  }
}

export async function GET(request){return withCors(await lookup(request));}
export function OPTIONS(){return optionsResponse();}
