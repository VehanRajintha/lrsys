import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { findUserById, savePasswordOtp } from '@/lib/userDb';
import { verifyPassword, generateOtp } from '@/lib/cryptoUtils';
import { sendPasswordOtpEmail } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const user = await findUserById(session.id);
    if (!user) {
      return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { currentPassword } = body;

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to request an OTP.' }, { status: 400 });
    }

    const isValid = verifyPassword(currentPassword, user.passwordHash, user.salt);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = generateOtp();

    // Store in DB / Supabase with 10-minute validity
    await savePasswordOtp(user.id, user.email, otp, 10);

    // Send email via Brevo
    const brevoResult = await sendPasswordOtpEmail({
      toEmail: user.email,
      toName: user.fullName,
      otpCode: otp,
      minutesValid: 10
    });

    if (!brevoResult.delivered && !brevoResult.simulated) {
      return NextResponse.json({
        success: false,
        delivered: false,
        error: brevoResult.message || 'Brevo email delivery failed. Please check your Brevo account settings.',
        warning: brevoResult.warning
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      delivered: brevoResult.delivered,
      simulated: brevoResult.simulated,
      message: `A 6-digit OTP passcode has been dispatched to your registered address (${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}). Valid for 10 minutes.`,
      emailMasked: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    });
  } catch (err: any) {
    console.error('[Request OTP Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to dispatch OTP.' }, { status: 500 });
  }
}

