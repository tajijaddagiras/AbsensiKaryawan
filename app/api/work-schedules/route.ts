import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/work-schedules
export async function GET(request: NextRequest) {
  try {
    const schedules = await prisma.workSchedule.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    // Transform to snake_case for frontend compatibility
    const data = schedules.map(schedule => ({
      id: schedule.id,
      day_of_week: schedule.dayOfWeek,
      day_name: schedule.dayName,
      start_time: schedule.startTime,
      on_time_end_time: schedule.onTimeEndTime,
      tolerance_start_time: schedule.toleranceStartTime,
      tolerance_end_time: schedule.toleranceEndTime,
      end_time: schedule.endTime,
      is_active: schedule.isActive,
      late_tolerance_minutes: schedule.lateToleranceMinutes,
      created_at: schedule.createdAt,
      updated_at: schedule.updatedAt,
    }));

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/work-schedules
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      start_time, 
      on_time_end_time, 
      tolerance_start_time, 
      tolerance_end_time, 
      end_time, 
      is_active, 
      late_tolerance_minutes 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (start_time !== undefined) updateData.startTime = start_time;
    if (on_time_end_time !== undefined) updateData.onTimeEndTime = on_time_end_time || null;
    if (tolerance_start_time !== undefined) updateData.toleranceStartTime = tolerance_start_time || null;
    if (tolerance_end_time !== undefined) updateData.toleranceEndTime = tolerance_end_time || null;
    if (end_time !== undefined) updateData.endTime = end_time;
    if (is_active !== undefined) updateData.isActive = is_active;
    if (late_tolerance_minutes !== undefined) updateData.lateToleranceMinutes = late_tolerance_minutes;

    const data = await prisma.workSchedule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Work schedule updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
