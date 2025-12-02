import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/system-settings
export async function GET(request: NextRequest) {
  try {
    const data = await prisma.systemSetting.findMany({
      orderBy: { settingKey: 'asc' },
    });

    const settings: Record<string, any> = {};
    data?.forEach(setting => {
      settings[setting.settingKey] = {
        value: setting.settingValue,
        description: setting.description,
        id: setting.id
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: settings
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/system-settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { face_recognition_threshold, gps_accuracy_radius } = body;

    if (face_recognition_threshold !== undefined) {
      const threshold = parseInt(face_recognition_threshold);
      if (isNaN(threshold) || threshold < 50 || threshold > 100) {
        return NextResponse.json(
          { success: false, error: 'Face recognition threshold must be between 50-100%' },
          { status: 400 }
        );
      }

      await prisma.systemSetting.update({
        where: { settingKey: 'face_recognition_threshold' },
        data: { settingValue: threshold.toString() },
      });
    }

    if (gps_accuracy_radius !== undefined) {
      const radius = parseInt(gps_accuracy_radius);
      if (isNaN(radius) || radius < 10 || radius > 10000) {
        return NextResponse.json(
          { success: false, error: 'GPS radius must be between 10-10000 meters' },
          { status: 400 }
        );
      }

      await prisma.systemSetting.update({
        where: { settingKey: 'gps_accuracy_radius' },
        data: { settingValue: radius.toString() },
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
