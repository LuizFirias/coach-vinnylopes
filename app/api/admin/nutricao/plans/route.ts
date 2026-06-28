import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plan, meals, id: existingPlanId } = body;

    if (!plan || !plan.student_id || !plan.name) {
      return NextResponse.json({ error: 'Missing required plan fields' }, { status: 400 });
    }

    const isTemplate = plan.status === 'template';

    if (!isTemplate && plan.student_id !== user.id) {
      // Verify coach has access to student
      const { data: relationship } = await supabaseAdmin
        .from('coach_alunos')
        .select('*')
        .eq('coach_id', user.id)
        .eq('aluno_id', plan.student_id)
        .single();

      if (!relationship) {
        return NextResponse.json(
          { error: 'Você não tem permissão para prescrever para este aluno' },
          { status: 403 }
        );
      }
    }

    let planId = existingPlanId;

    if (planId) {
      // Update existing plan
      const { error: updateError } = await supabaseAdmin
        .from('nutrition_plans')
        .update({
          name: plan.name,
          goal: plan.goal,
          notes: plan.notes,
          calories_target: plan.calories_target,
          protein_target: plan.protein_target,
          carbs_target: plan.carbs_target,
          fat_target: plan.fat_target,
          status: plan.status,
          start_date: plan.start_date || null,
          end_date: plan.end_date || null,
          updated_at: new Date().toISOString(),
          published_at: plan.status === 'active' ? new Date().toISOString() : null,
        })
        .eq('id', planId);

      if (updateError) throw updateError;
    } else {
      // Create new plan
      const { data: newPlan, error: insertError } = await supabaseAdmin
        .from('nutrition_plans')
        .insert({
          coach_id: user.id,
          student_id: plan.student_id,
          name: plan.name,
          goal: plan.goal,
          notes: plan.notes,
          calories_target: plan.calories_target,
          protein_target: plan.protein_target,
          carbs_target: plan.carbs_target,
          fat_target: plan.fat_target,
          status: plan.status,
          start_date: plan.start_date || null,
          end_date: plan.end_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: plan.status === 'active' ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      planId = newPlan.id;
    }

    // Archive previous plans if the current one is active
    if (plan.status === 'active') {
      await supabaseAdmin
        .from('nutrition_plans')
        .update({ status: 'archived' })
        .eq('student_id', plan.student_id)
        .eq('status', 'active')
        .neq('id', planId);
    }

    // Create or fetch default Day 1
    let dayId;
    const { data: existingDay } = await supabaseAdmin
      .from('nutrition_plan_days')
      .select('id')
      .eq('plan_id', planId)
      .eq('day_index', 1)
      .maybeSingle();

    if (existingDay) {
      dayId = existingDay.id;
    } else {
      const { data: newDay, error: dayError } = await supabaseAdmin
        .from('nutrition_plan_days')
        .insert({
          plan_id: planId,
          day_index: 1,
          label: 'Dia 1',
        })
        .select('id')
        .single();

      if (dayError) throw dayError;
      dayId = newDay.id;
    }

    // Wipe previous meals for the day to replace cleanly
    const { error: deleteMealsError } = await supabaseAdmin
      .from('nutrition_meals')
      .delete()
      .eq('plan_day_id', dayId);

    if (deleteMealsError) throw deleteMealsError;

    // Insert new meals structure sequentially
    if (meals && meals.length > 0) {
      for (const meal of meals) {
        const { data: newMeal, error: mealError } = await supabaseAdmin
          .from('nutrition_meals')
          .insert({
            plan_day_id: dayId,
            meal_type: meal.meal_type,
            title: meal.title,
            time_suggestion: meal.time_suggestion || null,
            notes: meal.notes || null,
            sort_order: meal.sort_order || 0,
          })
          .select('id')
          .single();

        if (mealError) throw mealError;

        if (meal.items && meal.items.length > 0) {
          for (const item of meal.items) {
            const { data: newItem, error: itemError } = await supabaseAdmin
              .from('nutrition_meal_items')
              .insert({
                meal_id: newMeal.id,
                food_id: item.food_id,
                quantity_grams: item.quantity_grams,
                portion_label: item.portion_label || null,
                notes: item.notes || null,
                sort_order: item.sort_order || 0,
              })
              .select('id')
              .single();

            if (itemError) throw itemError;

            if (item.substitutions && item.substitutions.length > 0) {
              const subsToInsert = item.substitutions.map((sub: any) => ({
                meal_item_id: newItem.id,
                substitute_food_id: sub.substitute_food_id,
                quantity_grams: sub.quantity_grams,
                portion_label: sub.portion_label || null,
                notes: sub.notes || null,
              }));

              const { error: subsError } = await supabaseAdmin
                .from('nutrition_substitutions')
                .insert(subsToInsert);

              if (subsError) throw subsError;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, planId });
  } catch (error: any) {
    console.error('[plans POST/PUT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
