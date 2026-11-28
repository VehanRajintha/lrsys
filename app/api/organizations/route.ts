import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import * as db from '@/lib/db';
import {
  evaluateCusDecTallyFlag,
  getOrganizationRegistryMeta,
  importOrganizationsFromBuffer,
  searchOrganizationRegistry,
} from '@/lib/organizationRegistry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CAN_MANAGE_ROLES = ['LRS', 'IC', 'APPRAISER', 'ASC', 'DC', 'DEV'];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '30', 10) || 30;

    const meta = getOrganizationRegistryMeta();
    const preview = searchOrganizationRegistry(query, limit);

    // Live summary against current declarations ledger
    const records = await db.getFreshRecords();
    let flaggedCount = 0;
    let bothMatchedCount = 0;
    let consigneeOnlyCount = 0;

    for (const r of records) {
      const flag = r.tallyFlag || evaluateCusDecTallyFlag(r.consigneeName, r.declarantName);
      if (flag.isFlagged) {
        flaggedCount++;
        if (flag.matchType === 'CONSIGNEE_AND_DECLARANT') {
          bothMatchedCount++;
        } else {
          consigneeOnlyCount++;
        }
      }
    }

    return NextResponse.json(
      {
        meta,
        preview,
        flaggedSummary: {
          totalRecords: records.length,
          flaggedCount,
          bothMatchedCount,
          consigneeOnlyCount,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Organizations Registry GET Error:', err);
    return NextResponse.json(
      { error: `Failed to inspect organization registry: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
    }
    if (!CAN_MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Updating the organization registry is restricted to authorized officers.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.name) {
      return NextResponse.json({ error: 'Please select an Excel (.xlsx/.xls) or CSV file.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const meta = await importOrganizationsFromBuffer(buffer, file.name);

    // Re-evaluate flags across all loaded declarations
    const records = await db.getFreshRecords();
    let flaggedCount = 0;
    let bothMatchedCount = 0;
    let consigneeOnlyCount = 0;

    for (const r of records) {
      const flag = evaluateCusDecTallyFlag(r.consigneeName, r.declarantName);
      if (flag.isFlagged) {
        flaggedCount++;
        if (flag.matchType === 'CONSIGNEE_AND_DECLARANT') bothMatchedCount++;
        else consigneeOnlyCount++;
      }
    }

    return NextResponse.json(
      {
        message: `Loaded ${meta.uniqueOrganizations.toLocaleString()} organizations (${meta.totalCertificates.toLocaleString()} certificates) from "${file.name}" into memory & local server storage.`,
        meta,
        preview: searchOrganizationRegistry('', 30),
        flaggedSummary: {
          totalRecords: records.length,
          flaggedCount,
          bothMatchedCount,
          consigneeOnlyCount,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Organizations Registry POST Error:', err);
    return NextResponse.json(
      { error: `Failed to import organization file: ${err.message}` },
      { status: 400 }
    );
  }
}
