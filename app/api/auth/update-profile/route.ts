import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

async function updateProfileHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentEmail, newEmail, newUsername, username, currentPassword, newPassword, avatarUrl } = body;
    
    // Support both 'username' and 'newUsername' for backward compatibility
    const usernameToUpdate = newUsername || username;

    if (!currentEmail) {
      return NextResponse.json(
        { success: false, error: 'Current email is required' },
        { status: 400 }
      );
    }

    // Get user by current email
    const user = await prisma.user.findUnique({
      where: { email: currentEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Update username if provided and different
    if (usernameToUpdate && usernameToUpdate !== user.username) {
      // Check if new username is already taken
      const existingUser = await prisma.user.findFirst({
        where: {
          username: usernameToUpdate,
          id: { not: user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Username already taken' },
          { status: 409 }
        );
      }

      updateData.username = usernameToUpdate;
    }

    // Update email if provided and different
    if (newEmail && newEmail !== user.email) {
      // Check if new email is already taken
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: newEmail,
          id: { not: user.id },
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Email already taken' },
          { status: 409 }
        );
      }

      updateData.email = newEmail;
    }

    // Update avatar if provided
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedNewPassword;
    }

    // Update user
    await prisma.user.update({
      where: { email: currentEmail },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updatedUsername: usernameToUpdate || user.username,
      updatedEmail: newEmail || user.email
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Export handler for POST method (for backward compatibility)
export async function POST(request: NextRequest) {
  return updateProfileHandler(request);
}

// Export handler for PUT method
export async function PUT(request: NextRequest) {
  return updateProfileHandler(request);
}

