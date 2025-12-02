import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/office-locations
export async function GET(request: NextRequest) {
  try {
    const locations = await prisma.officeLocation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Transform to snake_case
    const data = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius: loc.radius,
      is_active: loc.isActive,
      created_at: loc.createdAt,
      updated_at: loc.updatedAt,
    }));

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

// POST /api/office-locations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, latitude, longitude, radius } = body;

    if (!name || !latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: 'name, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const location = await prisma.officeLocation.create({
      data: {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseInt(radius) : 100,
        isActive: true,
      },
    });

    // Transform to snake_case
    const data = {
      id: location.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      radius: location.radius,
      is_active: location.isActive,
      created_at: location.createdAt,
      updated_at: location.updatedAt,
    };

    return NextResponse.json({ 
      success: true, 
      data 
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
