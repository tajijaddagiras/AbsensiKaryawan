import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/employees/[id] - Get employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: employee
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { full_name, email, phone, department, position, is_active, face_encoding_path } = body;

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and is unique
    if (email) {
      const emailExists = await prisma.employee.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        fullName: full_name,
        email,
        phone,
        department,
        position,
        isActive: is_active,
        faceEncodingPath: face_encoding_path,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: employee
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/employees/[id] - Toggle Status (Activate/Deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const isActivating = action === 'activate';
    const newStatus = isActivating;

    console.log(`=== ${isActivating ? 'ACTIVATE' : 'DEACTIVATE'} EMPLOYEE START ===`);
    console.log(`${isActivating ? 'Activating' : 'Deactivating'} employee:`, existing.fullName, existing.email);

    // Update is_active status
    await prisma.employee.update({
      where: { id },
      data: { isActive: newStatus },
    });

    console.log(`✓ Employee ${isActivating ? 'activated' : 'deactivated'}`);

    // Also update user account status
    if (existing.userId) {
      await prisma.user.update({
        where: { id: existing.userId },
        data: { isActive: newStatus },
      });
      console.log(`✓ User account ${isActivating ? 'activated' : 'deactivated'}`);
    }

    console.log('=== STATUS TOGGLE COMPLETE ===');

    return NextResponse.json({ 
      success: true,
      message: `Employee ${isActivating ? 'activated' : 'deactivated'} successfully`,
      data: { 
        id, 
        name: existing.fullName,
        email: existing.email,
        is_active: newStatus
      }
    });
  } catch (error: any) {
    console.error('PATCH employee error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to toggle employee status' },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] - HARD DELETE - Permanently remove from database
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if employee exists
    const existing = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        fullName: true,
        email: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    console.log('=== HARD DELETE START ===');
    console.log('Deleting employee:', existing.fullName, existing.email);

    // CRITICAL: Delete user first (CASCADE will auto-delete employee and attendance)
    if (existing.userId) {
      await prisma.user.delete({
        where: { id: existing.userId },
      });
      console.log('✓ User deleted (CASCADE will delete employee & attendance)');
    } else {
      // If no user_id, delete employee directly (attendance will CASCADE)
      await prisma.employee.delete({
        where: { id },
      });
      console.log('✓ Employee deleted (CASCADE will delete attendance)');
    }

    // Verify complete deletion
    const checkEmp = await prisma.employee.findFirst({
      where: { email: existing.email },
    });

    const checkUser = await prisma.user.findFirst({
      where: { email: existing.email },
    });

    console.log('✓ Verification - Employee exists:', !!checkEmp);
    console.log('✓ Verification - User exists:', !!checkUser);
    console.log('=== HARD DELETE COMPLETE ===');

    return NextResponse.json({ 
      success: true,
      message: 'Employee permanently deleted from database',
      data: { 
        id, 
        name: existing.fullName,
        email: existing.email
      }
    });
  } catch (error: any) {
    console.error('DELETE employee error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
