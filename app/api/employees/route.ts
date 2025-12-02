import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering (no cache)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/employees - Get all employees or filter by email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const showInactive = searchParams.get('showInactive') === 'true';

    const where: any = {};
    
    // Only show active employees by default
    if (!showInactive) {
      where.isActive = true;
    }
    
    if (email) {
      where.email = email;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Flatten the data structure to include avatar_url directly
    const flattenedData = employees.map((emp: any) => {
      const { user, ...employeeData } = emp;
      return {
        id: employeeData.id,
        user_id: employeeData.userId,
        employee_code: employeeData.employeeCode,
        full_name: employeeData.fullName,
        email: employeeData.email,
        phone: employeeData.phone,
        department: employeeData.department,
        position: employeeData.position,
        hire_date: employeeData.hireDate,
        is_active: employeeData.isActive,
        face_encoding_path: employeeData.faceEncodingPath,
        face_match_score: employeeData.faceMatchScore,
        created_at: employeeData.createdAt,
        updated_at: employeeData.updatedAt,
        avatar_url: user?.avatarUrl || null,
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

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, employee_code, full_name, email, phone, department, position, hire_date } = body;

    // Validate required fields
    if (!employee_code || !full_name || !email) {
      return NextResponse.json(
        { success: false, error: 'employee_code, full_name, and email are required' },
        { status: 400 }
      );
    }

    // Check if employee code already exists
    const existingCode = await prisma.employee.findUnique({
      where: { employeeCode: employee_code },
    });

    if (existingCode) {
      return NextResponse.json(
        { success: false, error: 'Employee code already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists in employees table
    const existingEmail = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Insert new employee
    const employee = await prisma.employee.create({
      data: {
        userId: user_id || null,
        employeeCode: employee_code,
        fullName: full_name,
        email,
        phone: phone || null,
        department: department || null,
        position: position || null,
        hireDate: hire_date ? new Date(hire_date) : null,
        isActive: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: employee
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

