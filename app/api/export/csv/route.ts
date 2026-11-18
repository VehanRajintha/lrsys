import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { generateCusDecCsv } from '@/lib/excelGenerator';
import { parseRecordDate } from '@/lib/dateUtils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date')?.trim();
    const filterParam = searchParams.get('filter')?.trim();

    let records = db.getRecords();
    if (records.length === 0) {
      return new NextResponse('No records available to export.', { status: 400 });
    }

    // Filter by specific day if requested (e.g. 2026-11-16)
    if (dateParam && dateParam.toUpperCase() !== 'ALL') {
      records = records.filter(r => {
        const recDate = parseRecordDate(r, 'created');
        return recDate === dateParam || (r.createdAt && r.createdAt.startsWith(dateParam));
      });
    }

    // Filter by tab status if requested
    if (filterParam && filterParam.toUpperCase() !== 'ALL') {
      records = records.filter(r => r.status === filterParam);
    }

    if (records.length === 0) {
      return new NextResponse(`No records found for the selected date (${dateParam || 'specified criteria'}).`, { status: 404 });
    }

    const csvContent = generateCusDecCsv(records);
    const filename = dateParam && dateParam.toUpperCase() !== 'ALL'
      ? `CusDec_Export_${dateParam.replace(/-/g, '')}.csv`
      : `CusDec_Export_All_Days_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('CSV Export Error:', err);
    return NextResponse.json({ error: `CSV generation failed: ${err.message}` }, { status: 500 });
  }
}
