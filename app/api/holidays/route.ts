import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/holidays
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    const where: any = { isActive: true };

    if (date) {
      where.date = new Date(date);
    }

    const data = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
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

// POST /api/holidays
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, date, type, description } = body;

    if (!name || !date || !type) {
      return NextResponse.json(
        { success: false, error: 'name, date, and type are required' },
        { status: 400 }
      );
    }

    if (!['national', 'company'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be either "national" or "company"' },
        { status: 400 }
      );
    }

    const data = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        type,
        description: description || null,
        isActive: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Holiday created successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/holidays
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, date, type, description, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (date !== undefined) updateData.date = new Date(date);
    if (type !== undefined) {
      if (!['national', 'company'].includes(type)) {
        return NextResponse.json(
          { success: false, error: 'type must be either "national" or "company"' },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.isActive = is_active;

    const data = await prisma.holiday.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Holiday updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/holidays
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    await prisma.holiday.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
