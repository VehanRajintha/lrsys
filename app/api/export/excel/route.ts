import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { generateCusDecExcel } from '@/lib/excelGenerator';
import { parseRecordDate, formatLongDateDisplay } from '@/lib/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date')?.trim();
    const filterParam = searchParams.get('filter')?.trim();

    let records = db.getRecords();
    if (records.length === 0) {
      return new NextResponse('No records available to export.', { status: 400 });
    }

    let dateLabel: string | undefined;

    // Filter by specific day if requested (e.g. 2026-11-16)
    if (dateParam && dateParam.toUpperCase() !== 'ALL') {
      records = records.filter(r => {
        const recDate = parseRecordDate(r, 'created');
        return recDate === dateParam || (r.createdAt && r.createdAt.startsWith(dateParam));
      });
      dateLabel = formatLongDateDisplay(dateParam);
    }

    // Filter by tab status if requested (e.g. NEEDS_REVIEW, VERIFIED, CORRECTED)
    if (filterParam && filterParam.toUpperCase() !== 'ALL') {
      records = records.filter(r => r.status === filterParam);
    }

    if (records.length === 0) {
      return new NextResponse(`No records found for the selected date (${dateParam || 'specified criteria'}).`, { status: 404 });
    }

    const buffer = await generateCusDecExcel(records, dateLabel);

    // Dynamic clean filename reflecting the target date or all days
    const filename = dateParam && dateParam.toUpperCase() !== 'ALL'
      ? `CusDec_Report_${dateParam.replace(/-/g, '')}.xlsx`
      : `CusDec_Extracted_Report_All_Days_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (err: any) {
    console.error('Excel Export Error:', err);
    return NextResponse.json({ error: `Excel generation failed: ${err.message}` }, { status: 500 });
  }
}
