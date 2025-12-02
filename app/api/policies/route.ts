import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/policies
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    const data = await prisma.policy.findMany({
      where,
      orderBy: { category: 'asc' },
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

// POST /api/policies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, policy_data } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'title, description, and category are required' },
        { status: 400 }
      );
    }

    if (!['attendance', 'leave', 'general'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'category must be "attendance", "leave", or "general"' },
        { status: 400 }
      );
    }

    const data = await prisma.policy.create({
      data: {
        title,
        description,
        category,
        policyData: policy_data || null,
        isActive: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Policy created successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/policies
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, category, policy_data, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) {
      if (!['attendance', 'leave', 'general'].includes(category)) {
        return NextResponse.json(
          { success: false, error: 'category must be "attendance", "leave", or "general"' },
          { status: 400 }
        );
      }
      updateData.category = category;
    }
    if (policy_data !== undefined) updateData.policyData = policy_data;
    if (is_active !== undefined) updateData.isActive = is_active;

    const data = await prisma.policy.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Policy updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/policies
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

    await prisma.policy.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
