import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function calculateEuclideanDistance(descriptor1: number[], descriptor2: number[]): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptors must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

function distanceToSimilarity(distance: number): number {
  const maxDistance = 1.0;
  const similarity = Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100));
  return Math.round(similarity * 100) / 100;
}

// POST /api/face-recognition/verify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { face_descriptor, employee_id } = body;

    if (!face_descriptor) {
      return NextResponse.json(
        { success: false, error: 'face_descriptor is required' },
        { status: 400 }
      );
    }

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
      return NextResponse.json(
        { success: false, error: 'face_descriptor must be an array of 128 numbers' },
        { status: 400 }
      );
    }

    // Get employee with face encoding
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: { faceEncodingPath: true, fullName: true },
    });

    if (!employee) {
      console.error('❌ Employee not found');
      return NextResponse.json(
        { success: false, error: 'Employee not found or no face registered' },
        { status: 404 }
      );
    }

    if (!employee.faceEncodingPath) {
      return NextResponse.json(
        { success: false, error: 'No face encoding found for this employee. Please register your face first.' },
        { status: 404 }
      );
    }

    console.log('🔍 Verifying face for employee:', employee.fullName);
    console.log('📁 Face encoding path:', employee.faceEncodingPath);

    // NOTE: In production, you would load the stored descriptor from storage
    // For now, this is a placeholder - you'll need to implement storage integration
    // const storedDescriptor = await loadFromStorage(employee.faceEncodingPath);
    
    // Placeholder: assuming face encoding is stored as JSON string in the path field itself
    // In a real implementation, you'd fetch from Supabase Storage or file system
    return NextResponse.json(
      { success: false, error: 'Face verification storage not yet implemented. Please implement storage integration.' },
      { status: 501 }
    );

    // The code below would be used once storage is implemented:
    /*
    const distance = calculateEuclideanDistance(face_descriptor, storedDescriptor);
    const similarity = distanceToSimilarity(distance);

    const settings = await prisma.systemSetting.findUnique({
      where: { settingKey: 'face_recognition_threshold' },
    });

    const match_threshold = settings?.settingValue ? parseInt(settings.settingValue) : 80;
    const match = similarity >= match_threshold;

    return NextResponse.json({ 
      success: true,
      match,
      similarity: similarity,
      threshold: match_threshold,
      distance: distance,
      message: match 
        ? `Face verified successfully! Similarity: ${similarity}%`
        : `Face verification failed. Similarity: ${similarity}% (required: ${match_threshold}%)`
    });
    */
  } catch (error: any) {
    console.error('❌ Error in face verification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Face verification failed' },
      { status: 500 }
    );
  }
}
