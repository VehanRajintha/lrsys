import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { verifyAndConsumeOtp, updatePasswordWithVerifiedOtp, findUserById } from '@/lib/userDb';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const { otp, newPassword } = body;

    if (!otp || !newPassword) {
      return NextResponse.json({ error: 'Both OTP code and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const isValidOtp = await verifyAndConsumeOtp(session.id, otp.trim());
    if (!isValidOtp) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP passcode. Please request a fresh one.' },
        { status: 400 }
      );
    }

    const updated = await updatePasswordWithVerifiedOtp(session.id, newPassword);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated. Your new credentials are now active.'
    });
  } catch (err: any) {
    console.error('[Confirm OTP Error]:', err);
    return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 500 });
  }
}

