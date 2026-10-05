"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./plot.module.css";
import ColorPicker from "./color-picker";
import { applyExcelPaste, parseExcelPaste } from "./excel-paste";
import { automaticAxes, axisScale } from "./axis-scale";
import { placePointLabels } from "./point-labels";

const sample = [
  { name: "Depth = 1 m", rows: [[303,301.41,1.59],[308,304.77,3.23],[313,308.05,4.95],[318,311.08,6.92]] },
  { name: "Depth = 2 m", rows: [[303,301.29,1.71],[308,304.45,3.55],[313,307.67,5.33],[318,310.79,7.21]] },
  { name: "Depth = 3 m", rows: [[303,301.2,1.8],[308,304.12,3.88],[313,307.45,5.55],[318,310.26,7.74]] },
].map(s => ({ ...s, rows: s.rows.map(r => r.map(String)) }));
const defaults = ["Outlet Temperature vs Inlet Temperature", "Inlet Temperature (K)", "Outlet Temperature (K)", "Temperature Drop (K)"];
const colors = ["#087abd", "#ff7f0e", "#229f29"];
type Symbol = "circle" | "square" | "triangle" | "diamond" | "cross" | "none";
const appearanceDefaults = colors.map((color,i) => ({ pointColor: color, lineColor: color, symbol: (["circle","square","triangle"] as Symbol[])[i], lineStyle: "solid" }));
const fontDefaults = { title: 28, axis: 23, values: 17, legend: 18 };
const fontOptions = [8,10,12,14,16,17,18,20,22,23,24,26,28,30,32,36,40];
const storageKey = "graph.three-axis.v1";
type SavedPlot = {
  version: number; series: typeof sample; labels: string[]; showTitles: boolean[]; showPointValues?: boolean;
  fonts: typeof fontDefaults; appearance: typeof appearanceDefaults;
  legendPosition: string; axisSettings: typeof automaticAxes;
};
function isSavedPlot(value: unknown): value is SavedPlot {
  if (!value || typeof value !== "object") return false;
  const s = value as SavedPlot;
  return s.version === 1 && Array.isArray(s.series) && s.series.length === 3 && s.series.every(v =>
    v && typeof v.name === "string" && Array.isArray(v.rows) && v.rows.length > 0 && v.rows.every(r => Array.isArray(r) && r.length === 3 && r.every(c => typeof c === "string"))) &&
    Array.isArray(s.labels) && s.labels.length === 4 && s.labels.every(v => typeof v === "string") &&
    Array.isArray(s.showTitles) && s.showTitles.length === 4 && s.showTitles.every(v => typeof v === "boolean") &&
    (s.showPointValues === undefined || typeof s.showPointValues === "boolean") &&
    !!s.fonts && Object.keys(fontDefaults).every(key => fontOptions.includes(s.fonts[key as keyof typeof fontDefaults])) &&
    Array.isArray(s.appearance) && s.appearance.length === 3 && s.appearance.every(a => a &&
      /^#[0-9a-f]{6}$/i.test(a.pointColor) && /^#[0-9a-f]{6}$/i.test(a.lineColor) &&
      ["circle","square","triangle","diamond","cross","none"].includes(a.symbol) && ["solid","dashed","dotted","none"].includes(a.lineStyle)) &&
    ["top-left","top-right","bottom-left","bottom-right"].includes(s.legendPosition) &&
    Array.isArray(s.axisSettings) && s.axisSettings.length === 3 && s.axisSettings.every(a => a && [a.min,a.max,a.interval].every(v => typeof v === "string"));
}
function dash(style: string) { return style === "dashed" ? "10 6" : style === "dotted" ? "2 5" : undefined; }
function marker(symbol: Symbol, x: number, y: number) {
  switch (symbol) {
    case "circle": return <circle cx={x} cy={y} r="6"/>;
    case "square": return <rect x={x-6} y={y-6} width="12" height="12"/>;
    case "triangle": return <polygon points={`${x},${y-7} ${x-7},${y+6} ${x+7},${y+6}`}/>;
    case "diamond": return <polygon points={`${x},${y-8} ${x+7},${y} ${x},${y+8} ${x-7},${y}`}/>;
    case "cross": return <path d={`M ${x-6} ${y-6} L ${x+6} ${y+6} M ${x-6} ${y+6} L ${x+6} ${y-6}`} fill="none" stroke="currentColor" strokeWidth="3"/>;
    case "none": return null;
  }
}

export default function Page() {
  const [open,setOpen] = useState(true);
  const [series,setSeries] = useState(sample);
  const [pasteErrors,setPasteErrors] = useState(["", "", ""]);
  function pasteCells(text: string, seriesIndex: number, row: number, column: number, replace = false) {
    try {
      const incoming = parseExcelPaste(text);
      if (replace && incoming.some(cells => cells.length !== 3)) throw new Error("Copy exactly three numeric columns for this series.");
      const rows = applyExcelPaste(replace ? [] : series[seriesIndex].rows, incoming, row, column);
      setSeries(series.map((s,i) => i === seriesIndex ? {...s, rows} : s));
      setPasteErrors(pasteErrors.map((v,i) => i === seriesIndex ? "" : v));
    } catch (error) {
      setPasteErrors(pasteErrors.map((v,i) => i === seriesIndex ? (error instanceof Error ? error.message : "Could not paste cells.") : v));
    }
  }
  const [labels,setLabels] = useState(defaults);
  const [showTitles,setShowTitles] = useState([true,true,true,true]);
  const [showPointValues,setShowPointValues] = useState(false);
  const [fonts,setFonts] = useState(fontDefaults);
  const [appearance,setAppearance] = useState(appearanceDefaults);
  const [legendPosition,setLegendPosition] = useState("top-left");
  const [axisSettings,setAxisSettings] = useState(automaticAxes);
  const [storageReady,setStorageReady] = useState(false);
  const [saveMessage,setSaveMessage] = useState("");
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (!isSavedPlot(saved)) throw new Error("Invalid saved plot");
          setSeries(saved.series); setLabels(saved.labels); setShowTitles(saved.showTitles);
          setShowPointValues(saved.showPointValues ?? false);
          setFonts(saved.fonts); setAppearance(saved.appearance); setLegendPosition(saved.legendPosition); setAxisSettings(saved.axisSettings);
          setSaveMessage("Saved data and chart settings restored.");
        }
      } catch {
        setSaveMessage("Could not restore saved data. You can still edit your chart.");
      }
      setStorageReady(true);
    });
    return () => { active = false; };
  }, []);
  function saveInBrowser() {
    try {
      const saved: SavedPlot = { version: 1, series, labels, showTitles, showPointValues, fonts, appearance, legendPosition, axisSettings };
      localStorage.setItem(storageKey, JSON.stringify(saved));
      setSaveMessage("");
    } catch {
      setSaveMessage("Could not save. Browser storage may be disabled or full.");
    }
  }
  const svg = useRef<SVGSVGElement>(null);
  const legendSpacing = Math.max(29,fonts.legend+12);
  const legendWidth = Math.max(220,...series.map(s => 80+s.name.length*fonts.legend*.62));
  const legendHeight = legendSpacing*3+12;
  const legendX = legendPosition.endsWith("right") ? 888-legendWidth : 112;
  const legendY = legendPosition.startsWith("bottom") ? 538-legendHeight : 142;
  function updateAppearance(index: number, key: keyof typeof appearanceDefaults[number], value: string) {
    setAppearance(appearance.map((a,i) => i === index ? { ...a, [key]: value } : a));
  }
  const validRow = (r: string[]) => r.every(v => v.trim() !== "" && Number.isFinite(Number(v)));
  const valid = series.every(s => s.name.trim() && s.rows.every(validRow));
  const points = series.map(s => s.rows.filter(validRow).map(r => r.map(Number)).sort((a,b) => a[0]-b[0]));
  const all = points.flat();
  const scales = axisSettings.map((settings,i) => axisScale(all.map(r => r[i]),settings));
  const [xScale,yScale,dropScale] = scales;
  const axesValid = scales.every(scale => !scale.error);
  const px = (x: number) => 100+(x-xScale.min)/(xScale.max-xScale.min)*800;
  const py = (y: number) => 550-(y-yScale.min)/(yScale.max-yScale.min)*420;
  const leftTitleX = 88-Math.max(...yScale.ticks.map(n => String(n).length))*fonts.values*.65-16-fonts.axis/2;
  const rightTitleX = 913+Math.max(...dropScale.ticks.map(n => String(n).length))*fonts.values*.65+16+fonts.axis/2;
  const xTitleY = 566+fonts.values+16+fonts.axis;
  const viewLeft = Math.min(-20,leftTitleX-fonts.axis);
  const viewRight = Math.max(1020,rightTitleX+fonts.axis);
  const viewBottom = Math.max(670,xTitleY+fonts.axis);
  const chartTitleY = 130-16-fonts.title*.25;
  const viewTop = showTitles[0] && labels[0].trim() ? chartTitleY-fonts.title-8 : 110;
  const pointLabels = placePointLabels(points.flatMap((ps,si) => ps.filter(r => r[0] >= xScale.min && r[0] <= xScale.max && r[1] >= yScale.min && r[1] <= yScale.max).map((r,i) => ({ x: px(r[0]), y: py(r[1]), text: r[2].toFixed(2), key: `${si}-${i}`, series: si }))), fonts.values, [{ x: legendX, y: legendY, width: legendWidth, height: legendHeight }]);
  function download() {
    if (!svg.current) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg.current)],{type:"image/svg+xml"}));
    const a = document.createElement("a"); a.href = url; a.download = "three-axis-plot.svg"; a.click(); URL.revokeObjectURL(url);
  }
  const [exportFormat,setExportFormat] = useState("png");
  const [imageDownloading,setImageDownloading] = useState(false);
  const [downloadError,setDownloadError] = useState("");
  async function downloadImage() {
    if (!svg.current || imageDownloading) return;
    if (exportFormat === "svg") { setDownloadError(""); download(); return; }
    setImageDownloading(true);
    setDownloadError("");
    const sourceUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg.current)], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = Math.ceil((viewRight-viewLeft)*scale);
      canvas.height = Math.ceil((viewBottom-viewTop)*scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.fillStyle = "white";
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image conversion failed")), exportFormat === "jpg" ? "image/jpeg" : "image/png", .95));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `three-axis-plot.${exportFormat}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch {
      setDownloadError("Could not download the image. Please try again.");
    } finally {
      URL.revokeObjectURL(sourceUrl);
      setImageDownloading(false);
    }
  }
  return <div className={styles.workspace}>
    <button className={styles.card} aria-expanded={open} aria-controls="plot-editor" onClick={() => setOpen(!open)}><span className={styles.icon}>↗</span><span><strong>Three-axis plot</strong><small>One X axis, two Y axes, and labeled data points.</small></span><span className={styles.action}>{open ? "Close editor −" : "Open editor +"}</span></button>
    {open && <div id="plot-editor">
      <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>Plot configuration</h2><p>Name your chart and all three axes.</p></div><button onClick={() => {setSeries(sample);setLabels(defaults);setShowTitles([true,true,true,true]);setShowPointValues(false);setFonts(fontDefaults);setAppearance(appearanceDefaults);setAxisSettings(automaticAxes);setLegendPosition("top-left");}}>Reset example</button></div><div className={styles.fields}>{["Chart title","X axis · horizontal","Y axis · left","Y axis · right / point labels"].map((label,i) => <div key={i}><label htmlFor={`plot-title-${i}`}>{label}</label><div className={styles.titleInputRow}><input className={styles.titleCheckbox} type="checkbox" aria-label={`Show ${label}`} checked={showTitles[i]} onChange={e => setShowTitles(showTitles.map((v,j) => j === i ? e.target.checked : v))}/><input id={`plot-title-${i}`} value={labels[i]} onChange={e => setLabels(labels.map((v,j) => j === i ? e.target.value : v))}/></div></div>)}</div></section>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>Axis scale</h2><p>Leave a field blank for automatic scaling. Use whole numbers.</p></div><button onClick={() => setAxisSettings(automaticAxes)}>Reset scales</button></div>
        <div className={styles.appearanceGrid}>{axisSettings.map((settings,i) => <fieldset key={i}><legend>{["X axis","Left Y axis","Right Y axis"][i]}</legend><div className={styles.scaleControls}>{([["min","Minimum"],["max","Maximum"],["interval","Interval gap"]] as const).map(([key,label]) => <label key={key}>{label}<input type="number" step="1" min={key === "interval" ? 1 : undefined} value={settings[key]} placeholder={String(scales[i][key])} aria-invalid={!!scales[i].error} onChange={e => setAxisSettings(axisSettings.map((v,j) => j === i ? {...v,[key]:e.target.value} : v))}/></label>)}</div>{scales[i].error && <p className={styles.error} role="status">{scales[i].error}</p>}</fieldset>)}</div>
      </section>
      <section className={styles.panel}><div className={styles.sectionHeading}><h2>Chart appearance</h2><label className={styles.pointValuesToggle}><input type="checkbox" checked={showPointValues} onChange={e => setShowPointValues(e.target.checked)}/>Show point values</label></div>
        <div className={styles.fontControls}><label>Legend position<select value={legendPosition} onChange={e => setLegendPosition(e.target.value)}><option value="top-left">Top left</option><option value="top-right">Top right</option><option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option></select></label>{([["title","Chart title"],["axis","Axis titles"],["values","Values"],["legend","Legend"]] as const).map(([key,label]) => <label key={key}>{label} font size<select value={fonts[key]} onChange={e => setFonts({...fonts,[key]:Number(e.target.value)})}>{fontOptions.map(size => <option key={size} value={size}>{size} px</option>)}</select></label>)}</div>
        <div className={styles.appearanceGrid}>{appearance.map((a,i) => <fieldset key={i}><legend>{series[i].name || `Series ${i+1}`}</legend><div className={styles.styleControls}>
          <ColorPicker label="Point color" value={a.pointColor} onChange={color => updateAppearance(i,"pointColor",color)}/>
          <ColorPicker label="Line color" value={a.lineColor} onChange={color => updateAppearance(i,"lineColor",color)}/>
          <label>Point symbol<select value={a.symbol} onChange={e => updateAppearance(i,"symbol",e.target.value)}>{["circle","square","triangle","diamond","cross","none"].map(v => <option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
          <label>Line style<select value={a.lineStyle} onChange={e => updateAppearance(i,"lineStyle",e.target.value)}>{["solid","dashed","dotted","none"].map(v => <option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
        </div></fieldset>)}</div>
      </section>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>Axis data</h2><p>Enter three values per point. Each depth forms a separate line.</p></div><span>{all.length} points · 3 series</span></div>
        <div className={styles.seriesGrid}>{series.map((s,si) => <div className={styles.series} key={si}><label className={styles.seriesName}><span style={{background:appearance[si].pointColor}}/><input aria-label={`Series ${si+1} name`} value={s.name} onChange={e => setSeries(series.map((v,i) => i === si ? {...v,name:e.target.value} : v))}/></label><table><thead><tr>{labels.slice(1).map((l,i) => <th scope="col" key={i}>{l}</th>)}<th scope="col" aria-label="Remove row"/></tr></thead><tbody>{s.rows.map((r,ri) => <tr key={ri}>{r.map((v,ci) => <td key={ci}><input type="number" step="any" value={v} onPaste={e => { const text = e.clipboardData.getData("text/plain"); if (text.includes("\t") || /[\r\n]/.test(text)) { e.preventDefault(); pasteCells(text,si,ri,ci); } }} aria-label={`${s.name}, row ${ri+1}, ${labels[ci+1]}`} onChange={e => setSeries(series.map((s,i) => i === si ? {...s,rows:s.rows.map((r,j) => j === ri ? r.map((v,k) => k === ci ? e.target.value : v) : r)} : s))}/></td>)}<td><button className={styles.remove} aria-label={`Remove row ${ri+1} from ${s.name}`} disabled={s.rows.length === 1} onClick={() => setSeries(series.map((s,i) => i === si ? {...s,rows:s.rows.filter((_,j) => j !== ri)} : s))}>×</button></td></tr>)}</tbody></table><button className={styles.add} onClick={() => setSeries(series.map((s,i) => i === si ? {...s,rows:[...s.rows,["","",""]]} : s))}>+ Add row</button><label className={styles.excelPaste}>Paste from Excel<textarea rows={2} value="" placeholder="Click here and paste 3 numeric columns" aria-label={`Paste Excel data into ${s.name}`} onChange={() => {}} onPaste={e => { e.preventDefault(); pasteCells(e.clipboardData.getData("text/plain"),si,0,0,true); }}/></label>{pasteErrors[si] && <p className={styles.error} role="alert">{pasteErrors[si]}</p>}</div>)}</div>
        {!valid && <p className={styles.error} role="status">Enter a series name and a finite number in every cell to complete the plot.</p>}
      </section>
      <div className={styles.saveArea}><button className={styles.saveButton} disabled={!storageReady} onClick={saveInBrowser} title="Save data and chart settings in this browser">Save</button>{saveMessage && <p className={styles.saveStatus} role="status">{saveMessage}</p>}</div>
      <section className={styles.panel}><div className={styles.sectionHeading}><div><h2>Plot preview</h2></div><div className={styles.downloadActions}><label className={styles.formatLabel}>File format<select value={exportFormat} disabled={imageDownloading} onChange={e => setExportFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="svg">SVG</option></select></label><button className={styles.primary} disabled={!valid || !axesValid || imageDownloading} onClick={downloadImage}>{imageDownloading ? "Preparing?" : "Download ?"}</button></div></div>{downloadError && <p className={styles.error} role="alert">{downloadError}</p>}
        <div className={styles.chart}><svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox={`${viewLeft} ${viewTop} ${viewRight-viewLeft} ${viewBottom-viewTop}`} role="img" aria-labelledby="chart-title chart-description" style={{fontFamily:"Times New Roman, Times, serif"}}><title id="chart-title">{showTitles[0] && labels[0].trim() ? labels[0] : "Three-axis plot"}</title><desc id="chart-description">{labels[1]} versus {labels[2]}, with {labels[3]} on the right axis and as point labels. {series.map((s,i) => `${s.name}: ${points[i].map(r => r.join(', ')).join('; ')}`).join('. ')}</desc><rect x={viewLeft} y={viewTop} width={viewRight-viewLeft} height={viewBottom-viewTop} fill="white"/><defs><clipPath id="plot-area"><rect x="100" y="130" width="800" height="420"/></clipPath></defs>{showTitles[0] && <text x="500" y={chartTitleY} textAnchor="middle" fontSize={fonts.title}>{labels[0]}</text>}
          {yScale.ticks.map(y => <g key={y}><text x="88" y={py(y)} dominantBaseline="middle" textAnchor="end" fontSize={fonts.values}>{y}</text></g>)}
          {xScale.ticks.map(x => <g key={x}><text x={px(x)} y={566+fonts.values} textAnchor="middle" fontSize={fonts.values}>{x}</text></g>)}
          {dropScale.ticks.map(d => <text key={d} x="913" y={550-(d-dropScale.min)/(dropScale.max-dropScale.min)*420} dominantBaseline="middle" fontSize={fonts.values}>{d}</text>)}
          <rect x="100" y="130" width="800" height="420" fill="none" stroke="#222" strokeWidth="1.5"/>
          {points.map((ps,si) => <g key={si} clipPath="url(#plot-area)"><polyline points={ps.map(r => `${px(r[0])},${py(r[1])}`).join(' ')} fill="none" stroke={appearance[si].lineColor} strokeWidth="3" strokeDasharray={dash(appearance[si].lineStyle)} visibility={appearance[si].lineStyle === "none" ? "hidden" : "visible"}/>{ps.map((r,i) => <g key={i} fill={appearance[si].pointColor} color={appearance[si].pointColor}>{marker(appearance[si].symbol,px(r[0]),py(r[1]))}</g>)}</g>)}
          {showPointValues && pointLabels.map(label => <line key={`connector-${label.key}`} x1={label.connectorStartX} y1={label.connectorStartY} x2={label.connectorX} y2={label.connectorY} stroke={appearance[label.series].pointColor} strokeOpacity=".65" strokeWidth="1"/>)}
          {showPointValues && pointLabels.map(label => <text key={label.key} x={label.labelX} y={label.labelY} textAnchor="middle" fontSize={fonts.values} fill="#171717" stroke="white" strokeWidth="3" paintOrder="stroke">{label.text}</text>)}
          <g transform={`translate(${legendX-112} ${legendY-142})`}><rect x="112" y="142" width={legendWidth} height={legendHeight} rx="4" fill="white" fillOpacity=".94" stroke="#ddd"/>{series.map((s,i) => <g key={i}><line x1="125" x2="162" y1={160+i*legendSpacing+fonts.legend/3} y2={160+i*legendSpacing+fonts.legend/3} stroke={appearance[i].lineColor} strokeWidth="3" strokeDasharray={dash(appearance[i].lineStyle)} visibility={appearance[i].lineStyle === "none" ? "hidden" : "visible"}/><g fill={appearance[i].pointColor} color={appearance[i].pointColor}>{marker(appearance[i].symbol,143,160+i*legendSpacing+fonts.legend/3)}</g><text x="176" y={160+i*legendSpacing+fonts.legend/3} dominantBaseline="middle" fontSize={fonts.legend}>{s.name}</text></g>)}</g>
          {showTitles[1] && <text x="500" y={xTitleY} textAnchor="middle" fontSize={fonts.axis}>{labels[1]}</text>}{showTitles[2] && <text transform={`translate(${leftTitleX} 340) rotate(-90)`} textAnchor="middle" fontSize={fonts.axis}>{labels[2]}</text>}{showTitles[3] && <text transform={`translate(${rightTitleX} 340) rotate(-90)`} textAnchor="middle" fontSize={fonts.axis}>{labels[3]}</text>}
        </svg></div>
      </section>
    </div>}
  </div>;
}
