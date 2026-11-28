import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { parseRecordDate, formatLongDateDisplay } from '@/lib/dateUtils';
import { evaluateCusDecTallyFlag } from '@/lib/organizationRegistry';
import { generateFlaggedCusDecExcel } from '@/lib/flaggedExcelGenerator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date')?.trim();
    const filterParam = searchParams.get('filter')?.trim();
    const searchParam = searchParams.get('search')?.trim();
    const flagTierParam = searchParams.get('flagTier')?.trim();

    let records = await db.getFreshRecords();
    if (records.length === 0) {
      return NextResponse.json({ error: 'No declaration records available to export.' }, { status: 400 });
    }

    let dateLabel: string | undefined;
    if (dateParam && dateParam.toUpperCase() !== 'ALL') {
      records = records.filter((r) => {
        const recDate = parseRecordDate(r, 'created');
        return recDate === dateParam || (r.createdAt && r.createdAt.startsWith(dateParam));
      });
      dateLabel = formatLongDateDisplay(dateParam);
    }

    if (filterParam && filterParam.toUpperCase() !== 'ALL' && filterParam.toUpperCase() !== 'FLAGGED') {
      if (filterParam.toUpperCase() === 'DUPLICATES') {
        records = records.filter((r) => Boolean(r.isDuplicate));
      } else {
        records = records.filter((r) => r.status === filterParam);
      }
    }

    if (searchParam) {
      const tokens = searchParam.toLowerCase().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        records = records.filter((r) => {
          const corpus = `${r.greenStampNumber || ''} ${r.customsRefNumber || ''} ${r.consigneeName || ''} ${r.declarantName || ''} ${r.blNumber || ''} ${r.goodsDescription || ''} ${r.customsDate || ''} ${r.consigneeTIN || ''} ${r.declarantTIN || ''} ${r.filename || ''} ${r.originalName || ''}`.toLowerCase();
          return tokens.every((t) => corpus.includes(t));
        });
      }
    }

    // Strictly evaluate & retain ONLY Flagged entries (Consignee Matched OR Consignee + Declarant Matched)
    let flaggedRecords = records
      .map((r) => ({
        ...r,
        tallyFlag: r.tallyFlag || evaluateCusDecTallyFlag(r.consigneeName, r.declarantName),
      }))
      .filter((r) => r.tallyFlag?.isFlagged);

    if (
      flagTierParam === 'CONSIGNEE_ONLY' ||
      flagTierParam === 'CONSIGNEE_AND_DECLARANT'
    ) {
      flaggedRecords = flaggedRecords.filter(
        (r) => r.tallyFlag?.matchType === flagTierParam
      );
    }

    if (flaggedRecords.length === 0) {
      return NextResponse.json(
        {
          error: dateLabel
            ? `No flagged CusDec entries matched the Organization Registry for ${dateLabel}.`
            : 'No flagged CusDec entries matched the Organization Registry for the current filter.',
        },
        { status: 404 }
      );
    }

    const buffer = await generateFlaggedCusDecExcel(flaggedRecords, {
      dateLabel,
      searchLabel: searchParam || undefined,
    });

    const dateTag =
      dateParam && dateParam.toUpperCase() !== 'ALL'
        ? dateParam.replace(/-/g, '')
        : `All_Days_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const filename = `CusDec_Flagged_Tally_Report_${dateTag}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Flagged Excel Export Error:', err);
    return NextResponse.json(
      { error: `Flagged Excel export failed: ${err.message}` },
      { status: 500 }
    );
  }
}
