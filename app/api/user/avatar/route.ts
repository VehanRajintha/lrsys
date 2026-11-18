import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { getServerSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createSessionToken } from '@/lib/cryptoUtils';
import { findUserById, updateUser } from '@/lib/userDb';

export const dynamic = 'force-dynamic';

const DATA_AVATARS_DIR = path.join(process.cwd(), 'data', 'avatars');
const PUBLIC_AVATARS_DIR = path.join(process.cwd(), 'public', 'avatars');

// Ensure both directories exist
[DATA_AVATARS_DIR, PUBLIC_AVATARS_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err: any) {
    console.warn(`[Avatar Dir Init ${dir}]:`, err.message);
  }
});

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
    const dataDestinationPath = path.join(DATA_AVATARS_DIR, filename);
    const publicDestinationPath = path.join(PUBLIC_AVATARS_DIR, filename);

    // Save processed webp buffer
    const processedBuffer = await sharp(inputBuffer)
      .resize(320, 320, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 90 })
      .toBuffer();

    // 1. Write to data/avatars (persistent on VPS across builds/restarts)
    fs.writeFileSync(dataDestinationPath, processedBuffer);

    // 2. Also write to public/avatars if available
    try {
      fs.writeFileSync(publicDestinationPath, processedBuffer);
    } catch {}

    // Clean up previous custom avatar file for this user from both directories
    const user = await findUserById(session.id);
    if (user?.avatarUrl && user.avatarUrl.includes('avatar_')) {
      const cleanUrl = user.avatarUrl.split('?')[0];
      const oldFilename = path.basename(cleanUrl);
      [DATA_AVATARS_DIR, PUBLIC_AVATARS_DIR].forEach((dir) => {
        const oldPath = path.join(dir, oldFilename);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch {}
        }
      });
    }

    const avatarUrl = `/avatars/${filename}?t=${Date.now()}`;
    const updated = await updateUser(session.id, { avatarUrl });

    // Re-issue session cookie with updated avatarUrl
    if (updated) {
      try {
        const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
        const newSessionToken = createSessionToken({
          id: updated.id,
          email: updated.email,
          username: updated.username,
          fullName: updated.fullName,
          role: updated.role,
          avatarUrl: updated.avatarUrl,
          exp
        });

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, newSessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60
        });
      } catch (cookieErr) {
        console.warn('[Avatar Cookie Refresh Error]:', cookieErr);
      }
    }

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
    if (user?.avatarUrl && user.avatarUrl.includes('avatar_')) {
      const cleanUrl = user.avatarUrl.split('?')[0];
      const oldFilename = path.basename(cleanUrl);
      [DATA_AVATARS_DIR, PUBLIC_AVATARS_DIR].forEach((dir) => {
        const oldPath = path.join(dir, oldFilename);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch {}
        }
      });
    }

    const updated = await updateUser(session.id, { avatarUrl: null });

    // Refresh session cookie without avatar
    if (updated) {
      try {
        const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
        const newSessionToken = createSessionToken({
          id: updated.id,
          email: updated.email,
          username: updated.username,
          fullName: updated.fullName,
          role: updated.role,
          avatarUrl: null,
          exp
        });

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, newSessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture removed.',
      user: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
