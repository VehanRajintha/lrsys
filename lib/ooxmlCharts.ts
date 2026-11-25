import JSZip from 'jszip';

export type OoxmlChartType = 'line' | 'column' | 'bar' | 'pie' | 'doughnut';

export interface OoxmlChartSeries {
  name: string;
  nameFormula?: string;
  valuesFormula: string;
  values: number[];
  /** Hex color without '#' (e.g., '06B6D4') */
  color: string;
  /** Optional per-point colors (for pie/doughnut slices or colorful bars) */
  pointColors?: string[];
  smooth?: boolean;
}

export interface OoxmlChartAnchor {
  /** 0-indexed start column (B = 1) */
  fromCol: number;
  /** 0-indexed start row (Row 11 = 10) */
  fromRow: number;
  /** 0-indexed exclusive end column */
  toCol: number;
  /** 0-indexed exclusive end row */
  toRow: number;
  fromColOff?: number;
  fromRowOff?: number;
  toColOff?: number;
  toRowOff?: number;
}

export interface OoxmlChartSpec {
  /** 1-based worksheet XML index matching ExcelJS workbook order (1 = sheet1.xml) */
  sheetIndex: number;
  type: OoxmlChartType;
  title: string;
  anchor: OoxmlChartAnchor;
  categoriesFormula: string;
  categories: string[];
  series: OoxmlChartSeries[];
  legendPos?: 'b' | 'r' | 't' | 'l' | 'none';
  showValLabels?: boolean;
  showPercentLabels?: boolean;
  showCatNameLabels?: boolean;
  cardBorderColor?: string;
  cardFillColor?: string;
  plotFillColor?: string;
  holeSize?: number;
  numberFormat?: string;
}

function escapeXml(str: string | number): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanHex(hex: string, fallback = '0EA5E9'): string {
  const cleaned = String(hex || '').replace(/^#/, '').trim().toUpperCase();
  return /^[0-9A-F]{6}$/.test(cleaned) ? cleaned : fallback;
}

function buildTextProps(fontSizeHundredths = 950, hexColor = '475569', bold = false): string {
  return `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${fontSizeHundredths}" b="${bold ? '1' : '0'}"><a:solidFill><a:srgbClr val="${cleanHex(hexColor)}"/></a:solidFill><a:latin typeface="Segoe UI"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;
}

function buildTitleXml(title: string): string {
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1250" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Segoe UI"/></a:defRPr></a:pPr><a:r><a:rPr lang="en-US" sz="1250" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Segoe UI"/></a:rPr><a:t>${escapeXml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>`;
}

function buildDataLabelsXml(opts: {
  showVal: boolean;
  showPercent?: boolean;
  showCatName?: boolean;
  showLeaderLines?: boolean;
  pos?: string;
  separator?: string;
  textColor?: string;
  fontSize?: number;
  bold?: boolean;
}): string {
  const {
    showVal,
    showPercent = false,
    showCatName = false,
    showLeaderLines = false,
    pos,
    separator,
    textColor = '1E293B',
    fontSize = 900,
    bold = true,
  } = opts;

  return `<c:dLbls>${buildTextProps(fontSize, textColor, bold)}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="${showVal ? '1' : '0'}"/><c:showCatName val="${showCatName ? '1' : '0'}"/><c:showSerName val="0"/><c:showPercent val="${showPercent ? '1' : '0'}"/><c:showBubbleSize val="0"/>${separator ? `<c:separator>${escapeXml(separator)}</c:separator>` : ''}${showLeaderLines ? '<c:showLeaderLines val="1"/>' : ''}</c:dLbls>`;
}

function buildSeriesTitleXml(series: OoxmlChartSeries): string {
  if (series.nameFormula) {
    return `<c:tx><c:strRef><c:f>${escapeXml(series.nameFormula)}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`;
  }
  return `<c:tx><c:v>${escapeXml(series.name)}</c:v></c:tx>`;
}

function buildCategoryRefXml(categoriesFormula: string, categories: string[]): string {
  const safeCats = categories.length > 0 ? categories : ['No Data'];
  const pts = safeCats
    .map((cat, idx) => `<c:pt idx="${idx}"><c:v>${escapeXml(cat)}</c:v></c:pt>`)
    .join('');
  return `<c:cat><c:strRef><c:f>${escapeXml(categoriesFormula)}</c:f><c:strCache><c:ptCount val="${safeCats.length}"/>${pts}</c:strCache></c:strRef></c:cat>`;
}

function buildValueRefXml(valuesFormula: string, values: number[]): string {
  const safeVals = values.length > 0 ? values : [0];
  const pts = safeVals
    .map((v, idx) => `<c:pt idx="${idx}"><c:v>${Number.isFinite(v) ? v : 0}</c:v></c:pt>`)
    .join('');
  return `<c:val><c:numRef><c:f>${escapeXml(valuesFormula)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${safeVals.length}"/>${pts}</c:numCache></c:numRef></c:val>`;
}

function buildLineChartXml(spec: OoxmlChartSpec, catAxId: number, valAxId: number): string {
  const showVal = spec.showValLabels ?? true;
  const seriesXml = spec.series
    .map((s, idx) => {
      const hex = cleanHex(s.color, 'F59E0B');
      const smooth = s.smooth ?? true;
      return `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/>${buildSeriesTitleXml(s)}<c:spPr><a:ln w="38100" cap="rnd"><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="8"/><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="25400"><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill></a:ln></c:spPr></c:marker>${buildDataLabelsXml({
        showVal,
        pos: 't',
        textColor: hex === 'F59E0B' ? 'B45309' : '0F172A',
        fontSize: 950,
        bold: true,
      })}${buildCategoryRefXml(spec.categoriesFormula, spec.categories)}${buildValueRefXml(s.valuesFormula, s.values)}<c:smooth val="${smooth ? '1' : '0'}"/></c:ser>`;
    })
    .join('');

  return `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${seriesXml}${buildDataLabelsXml({
    showVal,
    pos: 't',
    fontSize: 900,
    bold: true,
  })}<c:marker val="1"/><c:smooth val="1"/><c:axId val="${catAxId}"/><c:axId val="${valAxId}"/></c:lineChart>`;
}

function buildBarOrColumnChartXml(spec: OoxmlChartSpec, catAxId: number, valAxId: number): string {
  const isHorizontal = spec.type === 'bar';
  const showVal = spec.showValLabels ?? true;
  const singleMultiColor = spec.series.length === 1 && Array.isArray(spec.series[0].pointColors) && spec.series[0].pointColors.length > 0;

  const seriesXml = spec.series
    .map((s, idx) => {
      const baseHex = cleanHex(s.color, '0284C7');
      const ptsXml =
        Array.isArray(s.pointColors) && s.pointColors.length > 0
          ? s.pointColors
              .map(
                (ptHex, ptIdx) =>
                  `<c:dPt><c:idx val="${ptIdx}"/><c:spPr><a:solidFill><a:srgbClr val="${cleanHex(ptHex, baseHex)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>`
              )
              .join('')
          : '';

      return `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/>${buildSeriesTitleXml(s)}<c:spPr><a:solidFill><a:srgbClr val="${baseHex}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:invertIfNegative val="0"/>${ptsXml}${buildDataLabelsXml({
        showVal,
        pos: 'outEnd',
        textColor: '0F172A',
        fontSize: 950,
        bold: true,
      })}${buildCategoryRefXml(spec.categoriesFormula, spec.categories)}${buildValueRefXml(s.valuesFormula, s.values)}</c:ser>`;
    })
    .join('');

  return `<c:barChart><c:barDir val="${isHorizontal ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="${singleMultiColor ? '1' : '0'}"/>${seriesXml}${buildDataLabelsXml({
    showVal,
    pos: 'outEnd',
    fontSize: 900,
    bold: true,
  })}<c:gapWidth val="${isHorizontal ? '65' : '90'}"/><c:overlap val="0"/><c:axId val="${catAxId}"/><c:axId val="${valAxId}"/></c:barChart>`;
}

function buildPieOrDoughnutChartXml(spec: OoxmlChartSpec): string {
  const isDoughnut = spec.type === 'doughnut';
  const showVal = spec.showValLabels ?? false;
  const showPct = spec.showPercentLabels ?? true;
  const showCat = spec.showCatNameLabels ?? false;
  const palette = ['06B6D4', '0284C7', '6366F1', '8B5CF6', '10B981', 'F59E0B', 'EC4899', '64748B'];

  const seriesXml = spec.series
    .map((s, idx) => {
      const pointCount = Math.max(spec.categories.length, s.values.length);
      const ptsXml = Array.from({ length: pointCount })
        .map((_, ptIdx) => {
          const sliceHex = cleanHex(
            s.pointColors?.[ptIdx] || palette[ptIdx % palette.length],
            '06B6D4'
          );
          return `<c:dPt><c:idx val="${ptIdx}"/><c:spPr><a:solidFill><a:srgbClr val="${sliceHex}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`;
        })
        .join('');

      return `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/>${buildSeriesTitleXml(s)}${ptsXml}${buildDataLabelsXml({
        showVal,
        showPercent: showPct,
        showCatName: showCat,
        showLeaderLines: !isDoughnut,
        separator: '\n',
        textColor: '0F172A',
        fontSize: 850,
        bold: true,
      })}${buildCategoryRefXml(spec.categoriesFormula, spec.categories)}${buildValueRefXml(s.valuesFormula, s.values)}</c:ser>`;
    })
    .join('');

  if (isDoughnut) {
    const holeSize = Math.min(85, Math.max(35, spec.holeSize ?? 55));
    return `<c:doughnutChart><c:varyColors val="1"/>${seriesXml}${buildDataLabelsXml({
      showVal,
      showPercent: showPct,
      showCatName: showCat,
      fontSize: 850,
      bold: true,
    })}<c:firstSliceAng val="0"/><c:holeSize val="${holeSize}"/></c:doughnutChart>`;
  }

  return `<c:pieChart><c:varyColors val="1"/>${seriesXml}${buildDataLabelsXml({
    showVal,
    showPercent: showPct,
    showCatName: showCat,
    showLeaderLines: true,
    pos: 'bestFit',
    fontSize: 850,
    bold: true,
  })}<c:firstSliceAng val="0"/></c:pieChart>`;
}

function buildAxesXml(spec: OoxmlChartSpec, catAxId: number, valAxId: number): string {
  const isHorizontal = spec.type === 'bar';
  const catPos = isHorizontal ? 'l' : 'b';
  const valPos = isHorizontal ? 'b' : 'l';
  const catOrientation = isHorizontal ? 'maxMin' : 'minMax';
  const numFmt = escapeXml(spec.numberFormat || '#,##0');

  const catAx = `<c:catAx><c:axId val="${catAxId}"/><c:scaling><c:orientation val="${catOrientation}"/></c:scaling><c:delete val="0"/><c:axPos val="${catPos}"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></c:spPr>${buildTextProps(850, '475569', true)}<c:crossAx val="${valAxId}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx>`;

  const valAx = `<c:valAx><c:axId val="${valAxId}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${valPos}"/><c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${numFmt}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${buildTextProps(850, '64748B', false)}<c:crossAx val="${catAxId}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;

  return `${catAx}${valAx}`;
}

function buildChartXml(spec: OoxmlChartSpec): string {
  const catAxId = 100001;
  const valAxId = 100002;
  const isRadial = spec.type === 'pie' || spec.type === 'doughnut';

  let innerChartXml = '';
  if (spec.type === 'line') {
    innerChartXml = buildLineChartXml(spec, catAxId, valAxId) + buildAxesXml(spec, catAxId, valAxId);
  } else if (spec.type === 'bar' || spec.type === 'column') {
    innerChartXml = buildBarOrColumnChartXml(spec, catAxId, valAxId) + buildAxesXml(spec, catAxId, valAxId);
  } else {
    innerChartXml = buildPieOrDoughnutChartXml(spec);
  }

  const plotBg = spec.plotFillColor
    ? `<c:spPr><a:solidFill><a:srgbClr val="${cleanHex(spec.plotFillColor)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`
    : `<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>`;

  const legendPos = spec.legendPos ?? (isRadial || spec.series.length > 1 ? 'b' : 'none');
  const legendXml =
    legendPos === 'none'
      ? ''
      : `<c:legend><c:legendPos val="${legendPos}"/><c:layout/><c:overlay val="0"/>${buildTextProps(850, '334155', false)}</c:legend>`;

  const cardFill = cleanHex(spec.cardFillColor || 'FFFFFF');
  const cardBorder = cleanHex(spec.cardBorderColor || 'CBD5E1');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="en-US"/><c:roundedCorners val="1"/><c:chart>${buildTitleXml(spec.title)}<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${innerChartXml}${plotBg}</c:plotArea>${legendXml}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="${cardFill}"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="${cardBorder}"/></a:solidFill></a:ln></c:spPr>${buildTextProps(900, '334155', false)}</c:chartSpace>`;
}

function buildDrawingXml(
  charts: { spec: OoxmlChartSpec; rId: string; shapeId: number }[]
): string {
  const anchors = charts
    .map(({ spec, rId, shapeId }) => {
      const a = spec.anchor;
      return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${a.fromCol}</xdr:col><xdr:colOff>${a.fromColOff ?? 0}</xdr:colOff><xdr:row>${a.fromRow}</xdr:row><xdr:rowOff>${a.fromRowOff ?? 0}</xdr:rowOff></xdr:from><xdr:to><xdr:col>${a.toCol}</xdr:col><xdr:colOff>${a.toColOff ?? 0}</xdr:colOff><xdr:row>${a.toRow}</xdr:row><xdr:rowOff>${a.toRowOff ?? 0}</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${shapeId}" name="Chart ${shapeId}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rId}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`;
}

function insertDrawingRefIntoSheetXml(sheetXml: string, drawingRelId: string): string {
  const drawingTag = `<drawing r:id="${drawingRelId}"/>`;
  if (sheetXml.includes(drawingTag)) return sheetXml;

  // Enforce strict OOXML worksheet child element sequence
  const insertionTargets = ['<legacyDrawing', '<tableParts', '<extLst', '</worksheet>'];
  for (const marker of insertionTargets) {
    const idx = sheetXml.indexOf(marker);
    if (idx !== -1) {
      return sheetXml.slice(0, idx) + drawingTag + sheetXml.slice(idx);
    }
  }
  return sheetXml;
}

function upsertRelationship(relsXml: string | null, relTag: string, idCheck: string): string {
  if (!relsXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relTag}</Relationships>`;
  }
  if (relsXml.includes(idCheck)) return relsXml;
  return relsXml.replace('</Relationships>', `${relTag}</Relationships>`);
}

/**
 * Injects native interactive OOXML charts directly into an ExcelJS-generated .xlsx buffer.
 */
export async function injectOoxmlCharts(
  xlsxBuffer: Buffer,
  charts: OoxmlChartSpec[]
): Promise<Buffer> {
  if (!charts || charts.length === 0) return xlsxBuffer;

  const zip = await JSZip.loadAsync(xlsxBuffer);
  let contentTypesXml = await zip.file('[Content_Types].xml')?.async('string');
  if (!contentTypesXml) {
    throw new Error('Invalid XLSX package: missing [Content_Types].xml');
  }

  // Group charts by sheet index
  const bySheet = new Map<number, OoxmlChartSpec[]>();
  for (const chart of charts) {
    const list = bySheet.get(chart.sheetIndex) || [];
    list.push(chart);
    bySheet.set(chart.sheetIndex, list);
  }

  let globalChartIdx = 1;
  let globalDrawingIdx = 1;

  for (const [sheetIndex, sheetCharts] of bySheet.entries()) {
    const sheetPath = `xl/worksheets/sheet${sheetIndex}.xml`;
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) continue;

    const drawingNum = globalDrawingIdx++;
    const drawingPath = `xl/drawings/drawing${drawingNum}.xml`;
    const drawingRelPath = `xl/drawings/_rels/drawing${drawingNum}.xml.rels`;
    const sheetRelPath = `xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`;

    // Build chart XMLs and collect drawing entries
    const drawingEntries: { spec: OoxmlChartSpec; rId: string; shapeId: number }[] = [];
    const drawingRelTags: string[] = [];

    for (let i = 0; i < sheetCharts.length; i++) {
      const spec = sheetCharts[i];
      const chartNum = globalChartIdx++;
      const chartPath = `xl/charts/chart${chartNum}.xml`;
      const rId = `rIdChart${i + 1}`;
      const shapeId = 100 + chartNum;

      zip.file(chartPath, buildChartXml(spec));
      contentTypesXml = contentTypesXml.replace(
        '</Types>',
        `<Override PartName="/${chartPath}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`
      );

      drawingEntries.push({ spec, rId, shapeId });
      drawingRelTags.push(
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartNum}.xml"/>`
      );
    }

    // Write drawing XML & drawing rels
    zip.file(drawingPath, buildDrawingXml(drawingEntries));
    zip.file(
      drawingRelPath,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRelTags.join('')}</Relationships>`
    );

    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      `<Override PartName="/${drawingPath}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`
    );

    // Link sheet to drawing
    const existingSheetRel = await zip.file(sheetRelPath)?.async('string');
    const drawingRelId = `rIdDrawing${drawingNum}`;
    const updatedSheetRel = upsertRelationship(
      existingSheetRel || null,
      `<Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingNum}.xml"/>`,
      `Target="../drawings/drawing${drawingNum}.xml"`
    );
    zip.file(sheetRelPath, updatedSheetRel);

    // Insert <drawing r:id="..."/> tag into worksheet XML
    const sheetXml = await sheetFile.async('string');
    zip.file(sheetPath, insertDrawingRefIntoSheetXml(sheetXml, drawingRelId));
  }

  zip.file('[Content_Types].xml', contentTypesXml);

  const outUint8 = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return Buffer.from(outUint8);
}
