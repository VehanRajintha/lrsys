import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { getServerSession } from '@/lib/auth';
import { findUserById, updateUser } from '@/lib/userDb';

export const dynamic = 'force-dynamic';

const AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');

try {
  if (!fs.existsSync(AVATARS_DIR)) {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn('[Avatar Dir Init]:', err.message);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No image file uploaded.' }, { status: 400 });
    }

    // Limit avatar size to 10 MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Avatar image must be under 10 MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    // Process and optimize with sharp: 320x320 square crop, high quality webp
    const filename = `avatar_${session.id}_${Date.now()}.webp`;
    const destinationPath = path.join(AVATARS_DIR, filename);

    await sharp(inputBuffer)
      .resize(320, 320, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 90 })
      .toFile(destinationPath);

    // Remove any previous custom avatar file for this user
    const user = await findUserById(session.id);
    if (user?.avatarUrl && user.avatarUrl.startsWith('/avatars/avatar_')) {
      const oldFilename = path.basename(user.avatarUrl);
      const oldPath = path.join(AVATARS_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {}
      }
    }

    const avatarUrl = `/avatars/${filename}?t=${Date.now()}`;
    const updated = await updateUser(session.id, { avatarUrl });

    return NextResponse.json({
      success: true,
      message: 'Profile picture updated successfully.',
      avatarUrl,
      user: updated
    });
  } catch (err: any) {
    console.error('[Avatar Upload Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to process avatar.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const user = await findUserById(session.id);
    if (user?.avatarUrl && user.avatarUrl.startsWith('/avatars/avatar_')) {
      const oldFilename = path.basename(user.avatarUrl.split('?')[0]);
      const oldPath = path.join(AVATARS_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {}
      }
    }

    const updated = await updateUser(session.id, { avatarUrl: null });

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed.',
      user: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

