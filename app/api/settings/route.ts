import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

function maskApiKey(key?: string): string {
  if (!key || key.trim().length <= 6) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 10) return '••••••••';
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Sign-in required.' }, { status: 401 });
  }

  await db.initSupabaseSync();
  const settings = db.getSettings();

  // Mask all API keys so raw credentials are never leaked in network traffic
  const safeSettings = {
    ...settings,
    geminiApiKey: maskApiKey(settings.geminiApiKey),
    geminiBackupApiKey: maskApiKey(settings.geminiBackupApiKey),
    geminiApiKey3: maskApiKey(settings.geminiApiKey3),
    customApiKey: maskApiKey(settings.customApiKey)
  };

  return NextResponse.json(safeSettings);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized. Sign-in required.' }, { status: 401 });
  }

  if (session.role !== 'DEV') {
    return NextResponse.json(
      { error: 'Forbidden: Modifying system and AI settings requires Developer / Super Admin privileges.' },
      { status: 403 }
    );
  }

  const updates = await request.json();

  // If masked bullets are submitted back, preserve the existing unmasked secret keys
  if (updates.geminiApiKey && updates.geminiApiKey.includes('••••')) {
    delete updates.geminiApiKey;
  }
  if (updates.geminiBackupApiKey && updates.geminiBackupApiKey.includes('••••')) {
    delete updates.geminiBackupApiKey;
  }
  if (updates.geminiApiKey3 && updates.geminiApiKey3.includes('••••')) {
    delete updates.geminiApiKey3;
  }
  if (updates.customApiKey && updates.customApiKey.includes('••••')) {
    delete updates.customApiKey;
  }

  const updated = db.updateSettings(updates);

  return NextResponse.json({
    message: 'Settings saved',
    settings: {
      ...updated,
      geminiApiKey: maskApiKey(updated.geminiApiKey),
      geminiBackupApiKey: maskApiKey(updated.geminiBackupApiKey),
      geminiApiKey3: maskApiKey(updated.geminiApiKey3),
      customApiKey: maskApiKey(updated.customApiKey)
    }
  });
}
