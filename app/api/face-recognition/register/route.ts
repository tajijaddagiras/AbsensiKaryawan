import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/face-recognition/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, face_descriptor } = body;

    if (!employee_id || !face_descriptor) {
      return NextResponse.json(
        { success: false, error: 'employee_id and face_descriptor are required' },
        { status: 400 }
      );
    }

    // Convert face descriptor to JSON string
    const faceDescriptorString = JSON.stringify(face_descriptor);

    // Create unique file name
    const fileName = `face_${employee_id}_${Date.now()}.json`;
    const filePath = `face-encodings/${fileName}`;

    // Update employee record with face encoding path
    const employee = await prisma.employee.update({
      where: { id: employee_id },
      data: { faceEncodingPath: filePath },
    });

    // TODO: Save face descriptor to storage if needed

    return NextResponse.json({ 
      success: true,
      data: employee,
      message: 'Face registered successfully',
      face_encoding_path: filePath
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
