import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/attendance/today - Get today's attendance
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee_id = searchParams.get('employee_id');

    const now = new Date();
    const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const jakartaParts = jakartaFormatter.formatToParts(now);
    const year = parseInt(jakartaParts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(jakartaParts.find(p => p.type === 'month')?.value || '0');
    const day = parseInt(jakartaParts.find(p => p.type === 'day')?.value || '0');
    
    const jakartaMidnightUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - (7 * 60 * 60 * 1000);
    const jakartaTomorrowMidnightUTC = jakartaMidnightUTC + (24 * 60 * 60 * 1000);
    
    const todayStart = new Date(jakartaMidnightUTC);
    const todayEnd = new Date(jakartaTomorrowMidnightUTC);

    const where: any = {
      checkInTime: {
        gte: todayStart,
        lt: todayEnd,
      },
    };

    if (employee_id) {
      where.employeeId = employee_id;
    }

    const data = await prisma.attendance.findMany({
      where,
      include: {
        employee: true,
      },
    });

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
