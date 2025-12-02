import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/attendance/history - Get attendance history with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee_id = searchParams.get('employee_id');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const startMonth = searchParams.get('startMonth');
    const startYear = searchParams.get('startYear');
    const endMonth = searchParams.get('endMonth');
    const endYear = searchParams.get('endYear');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (employee_id) {
      where.employeeId = employee_id;
    }

    // Filter by single month/year
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      const startDateUTC = Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0) - (7 * 60 * 60 * 1000);
      const endDateUTC = Date.UTC(yearNum, monthNum, 1, 0, 0, 0, 0) - (7 * 60 * 60 * 1000);
      
      where.checkInTime = {
        gte: new Date(startDateUTC),
        lt: new Date(endDateUTC),
      };
    }
    // Filter by month range
    else if (startMonth && startYear && endMonth && endYear) {
      const startMonthNum = parseInt(startMonth);
      const startYearNum = parseInt(startYear);
      const endMonthNum = parseInt(endMonth);
      const endYearNum = parseInt(endYear);
      
      const startDateUTC = Date.UTC(startYearNum, startMonthNum - 1, 1, 0, 0, 0, 0) - (7 * 60 * 60 * 1000);
      const endDateUTC = Date.UTC(endYearNum, endMonthNum, 1, 0, 0, 0, 0) - (7 * 60 * 60 * 1000);
      
      where.checkInTime = {
        gte: new Date(startDateUTC),
        lt: new Date(endDateUTC),
      };
    }
    // Filter by date range
    else if (startDate && endDate) {
      where.checkInTime = {
        gte: new Date(startDate),
        lt: new Date(endDate),
      };
    }

    const data = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkInTime: 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Flatten the data
    const flattenedData = data.map((attendance: any) => {
      const { user, ...employeeData } = attendance.employee;
      return {
        ...attendance,
        employee: {
          ...employeeData,
          avatar_url: user?.avatarUrl || null,
        },
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: flattenedData 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
