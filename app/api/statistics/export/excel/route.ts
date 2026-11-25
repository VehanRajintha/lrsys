import { NextRequest, NextResponse } from 'next/server';
import * as db from '@/lib/db';
import { DateBasis } from '@/lib/dateUtils';
import { DatePreset, PieMode, TrajectoryViewMode } from '@/lib/statisticsAnalytics';
import { generateStatisticsExcel } from '@/lib/statisticsExcelGenerator';

export const dynamic = 'force-dynamic';

const VALID_PRESETS: Set<DatePreset> = new Set(['today', '7d', '14d', '30d', 'month', 'all']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const basisParam = searchParams.get('basis') === 'customs' ? 'customs' : 'created';
    const rawPreset = (searchParams.get('preset') || 'all') as DatePreset;
    const preset: DatePreset = VALID_PRESETS.has(rawPreset) ? rawPreset : 'all';
    const startDate = searchParams.get('startDate')?.trim() || undefined;
    const endDate = searchParams.get('endDate')?.trim() || undefined;
    const trajectoryMode: TrajectoryViewMode =
      searchParams.get('trajectoryMode') === 'cumulative' ? 'cumulative' : 'velocity';
    const pieMode: PieMode = searchParams.get('pieMode') === 'fidelity' ? 'fidelity' : 'commodity';

    const records = await db.getFreshRecords();
    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: 'No declaration records available to export.' },
        { status: 400 }
      );
    }

    const buffer = await generateStatisticsExcel({
      records,
      dateBasis: basisParam as DateBasis,
      activePreset: preset,
      customStartDate: startDate,
      customEndDate: endDate,
      trajectoryMode,
      pieMode,
    });

    const dateTag =
      startDate && endDate
        ? `${startDate}_to_${endDate}`
        : new Date().toISOString().slice(0, 10);
    const filename = `CusDec_Statistics_Report_${dateTag}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Statistics Excel Export Error:', err);
    return NextResponse.json(
      { error: `Statistics Excel export failed: ${err.message}` },
      { status: 500 }
    );
  }
}
