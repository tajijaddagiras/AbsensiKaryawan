import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/employees/[id]/face-encoding - Update face encoding path
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { faceEncoding, matchScore } = body;

    if (!faceEncoding) {
      return NextResponse.json(
        { success: false, error: 'faceEncoding is required' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      faceEncodingPath: faceEncoding,
    };

    // Add match score if provided (from training)
    if (matchScore !== undefined && matchScore !== null) {
      updateData.faceMatchScore = parseFloat(matchScore);
      console.log('💾 Saving face match score:', matchScore);
    }

    // Update face encoding and match score
    const employee = await prisma.employee.update({
      where: { id: resolvedParams.id },
      data: updateData,
    });

    console.log('✅ Face encoding and score saved successfully for employee:', employee.fullName);

    return NextResponse.json({ 
      success: true, 
      data: employee,
      message: 'Face encoding saved successfully'
    });
  } catch (error: any) {
    console.error('❌ Error saving face encoding:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
