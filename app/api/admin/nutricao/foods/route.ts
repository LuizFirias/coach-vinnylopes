import { NextRequest, NextResponse } from 'next/server';
import { searchFoods } from '@/lib/nutrition/foods';
import { NutritionFoodCategory } from '@/lib/nutrition/types';
import { getAuthenticatedCoach } from '@/lib/auth/getAuthenticatedCoach';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCoach(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const category = (searchParams.get('category') as NutritionFoodCategory) || undefined;

    const foods = await searchFoods(q, category, auth.userId);
    return NextResponse.json({ foods });
  } catch (error: any) {
    console.error('[foods GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
