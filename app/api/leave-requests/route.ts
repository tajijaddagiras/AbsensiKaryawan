import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - no caching for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');
    const date = searchParams.get('date'); // Filter for specific date (YYYY-MM-DD)

    const where: any = {};

    // Filter by employee_id if provided
    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Filter by user_id (get employee_id from user_id first)
    if (userId && !employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!employee) {
        return NextResponse.json({ 
          success: false, 
          message: 'Employee not found for this user' 
        }, { status: 404 });
      }

      where.employeeId = employee.id;
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by date if provided (check if date falls within start_date and end_date range)
    if (date) {
      const filterDate = new Date(date);
      where.startDate = { lte: filterDate };
      where.endDate = { gte: filterDate };
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
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
        reviewer: {
          select: {
            fullName: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Flatten the data structure
    const flattenedData = leaveRequests.map((request: any) => ({
      id: request.id,
      employee_id: request.employeeId,
      employee_name: request.employee?.fullName || 'Unknown',
      employee_code: request.employee?.employeeCode || '-',
      employee_email: request.employee?.email || '-',
      department: request.employee?.department || '-',
      position: request.employee?.position || '-',
      avatar_url: request.employee?.user?.avatarUrl || null,
      leave_type: request.leaveType,
      start_date: request.startDate,
      end_date: request.endDate,
      days: request.days,
      reason: request.reason,
      attachment_url: request.attachmentUrl,
      status: request.status,
      admin_notes: request.adminNotes,
      reviewed_by: request.reviewedBy,
      reviewed_by_name: request.reviewer?.fullName || null,
      reviewed_at: request.reviewedAt,
      created_at: request.createdAt,
      updated_at: request.updatedAt
    }));

    return NextResponse.json({ 
      success: true, 
      data: flattenedData 
    });

  } catch (error: any) {
    console.error('Error in GET /api/leave-requests:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      user_id,
      leave_type, 
      start_date, 
      end_date, 
      reason,
      attachment_url 
    } = body;

    // Validate required fields
    if (!user_id || !leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { status: 400 });
    }

    // Get employee_id from user_id
    const employee = await prisma.employee.findUnique({
      where: { userId: user_id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ 
        success: false, 
        message: 'Employee not found for this user' 
      }, { status: 404 });
    }

    // Calculate days
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const days = diffDays === 0 ? 1 : (diffDays > 0 ? diffDays : 1);

    // Insert leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: leave_type,
        startDate: startDateObj,
        endDate: endDateObj,
        days,
        reason,
        attachmentUrl: attachment_url || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Leave request submitted successfully',
      data: leaveRequest 
    });

  } catch (error: any) {
    console.error('Error in POST /api/leave-requests:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      id,
      status,
      admin_notes,
      reviewed_by 
    } = body;

    // Validate required fields
    if (!id || !status || !reviewed_by) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields (id, status, reviewed_by)' 
      }, { status: 400 });
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid status. Must be "approved" or "rejected"' 
      }, { status: 400 });
    }

    // Update leave request
    const leaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        adminNotes: admin_notes || null,
        reviewedBy: reviewed_by,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Leave request ${status} successfully`,
      data: leaveRequest 
    });

  } catch (error: any) {
    console.error('Error in PUT /api/leave-requests:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}
