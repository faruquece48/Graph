"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./plot.module.css";
import GraphLibraryTransfer from "./graph-library-transfer";
import ColorPicker from "./color-picker";
import CollapsiblePanel from "./collapsible-panel";

import { automaticAxes, axisScale } from "./axis-scale";
import { placePointLabels } from "./point-labels";

type DataSet = { name: string; rows: string[][] };
type Series = { name: string; rows: string[][]; datasets?: DataSet[]; plot?: "left" | "right" | "both" };
const sample: Series[] = [
  { name: "Depth = 1 m", rows: [[303,301.41,1.59],[308,304.77,3.23],[313,308.05,4.95],[318,311.08,6.92]] },
  { name: "Depth = 2 m", rows: [[303,301.29,1.71],[308,304.45,3.55],[313,307.67,5.33],[318,310.79,7.21]] },
  { name: "Depth = 3 m", rows: [[303,301.2,1.8],[308,304.12,3.88],[313,307.45,5.55],[318,310.26,7.74]] },
].map(s => ({ ...s, rows: s.rows.map(r => r.map(String)) }));
const defaults = ["Outlet Temperature vs Inlet Temperature", "Inlet Temperature (K)", "Outlet Temperature (K)", "Temperature Drop (K)"];
const comfortableColors = ["#4e79a7","#f28e2b","#59a14f","#b07aa1","#e15759","#76b7b2","#edc948","#ff9da7"];
const legacyDefaultColors = ["#087abd","#ff7f0e","#229f29"];
type Symbol = "circle" | "square" | "triangle" | "diamond" | "cross" | "none";
const seriesSymbols: Symbol[] = ["circle","square","triangle","diamond","cross"];
const appearanceDefaults = comfortableColors.slice(0,3).map((color,i) => ({ pointColor: color, lineColor: color, symbol: seriesSymbols[i], lineStyle: "solid" }));
function withDistinctSymbols(items: typeof appearanceDefaults) {
  const updated=items.map((item,index) => {
    const legacy=legacyDefaultColors[index];
    return legacy && item.pointColor.toLowerCase() === legacy && item.lineColor.toLowerCase() === legacy ? {...item,pointColor:comfortableColors[index],lineColor:comfortableColors[index]} : item;
  });
  if (updated.length < 2 || !updated.every(item => item.symbol === updated[0].symbol)) return updated;
  return updated.map((item,index) => ({...item,symbol:seriesSymbols[index%seriesSymbols.length]}));
}
const fontDefaults = { title: 28, axis: 23, values: 17, legend: 18 };
const fontOptions = [8,10,12,14,16,17,18,20,22,23,24,26,28,30,32,36,40];
function dataSets(s: Series): DataSet[] { return s.datasets ?? [{name:"Material 1",rows:s.rows}]; }
const legacyStorageKey = "graph.three-axis.v1";
const threeAxisListKey = "graph.three-axis.list.v1";
type SavedPlot = {
  version: number; series: typeof sample; labels: string[]; showTitles: boolean[]; showPointValues?: boolean;
  fonts: typeof fontDefaults; appearance: typeof appearanceDefaults;
  legendPosition: string; axisSettings: typeof automaticAxes; cardNumber?: string;
};
function isSavedPlot(value: unknown): value is SavedPlot {
  if (!value || typeof value !== "object") return false;
  const s = value as SavedPlot;
  return s.version === 1 && Array.isArray(s.series) && s.series.length >= 0 && s.series.every(v =>
    v && (v.datasets === undefined || (Array.isArray(v.datasets) && v.datasets.length > 0 && v.datasets.every(d => d && typeof d.name === "string" && Array.isArray(d.rows) && d.rows.length > 0 && d.rows.every(r => Array.isArray(r) && r.length === 3 && r.every(c => typeof c === "string"))))) && typeof v.name === "string" && (v.plot === undefined || ["left","right","both"].includes(v.plot)) && Array.isArray(v.rows) && v.rows.length > 0 && v.rows.every(r => Array.isArray(r) && r.length === 3 && r.every(c => typeof c === "string"))) &&
    Array.isArray(s.labels) && s.labels.length === 4 && s.labels.every(v => typeof v === "string") &&
    Array.isArray(s.showTitles) && s.showTitles.length === 4 && s.showTitles.every(v => typeof v === "boolean") &&
    (s.showPointValues === undefined || typeof s.showPointValues === "boolean") &&
    !!s.fonts && Object.keys(fontDefaults).every(key => fontOptions.includes(s.fonts[key as keyof typeof fontDefaults])) &&
    Array.isArray(s.appearance) && s.appearance.length === s.series.length && s.appearance.every(a => a &&
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

function ThreeAxisEditor({graphId,index,onDelete}:{graphId:string;index:number;onDelete:()=>void}) {
  const storageKey = graphId === "primary" ? legacyStorageKey : "graph.three-axis."+graphId+".v1";
  const [open,setOpen] = useState(true);
  const [cardNumber,setCardNumber] = useState(String(index+1));
  const [series,setSeries] = useState(sample);
  const [worksheetError,setWorksheetError] = useState("");
  function changeDataset(si: number, di: number, change: (d: DataSet) => DataSet) {
    setSeries(series.map((s,i) => i === si ? {...s,datasets:dataSets(s).map((d,j) => j === di ? change(d) : d)} : s));
  }
  function updateWorksheet(si: number, di: number, ri: number, ci: number, value: string) {
    changeDataset(si,di,d => {const rows=d.rows.map(r => [...r]);while(rows.length<=ri)rows.push(["","",""]);rows[ri][ci]=value;return {...d,rows};});
  }
  function pasteWorksheet(text: string, si: number, di: number, startRow: number, startColumn: number) {
    try {
      const incoming=text.replace(/\r\n?/g,"\n").replace(/\n+$/,"").split("\n").map(line => line.split("\t").map(v => v.trim()));
      if(incoming.length > 1000) throw new Error("Paste up to 1,000 rows at a time.");
      if(incoming.some(r => r.length+startColumn > 3)) throw new Error("Paste three columns: X, left Y, and right Y.");
      if(incoming.some(r => r.some(v => v !== "" && !Number.isFinite(Number(v))))) throw new Error("Copy numeric cells without headings.");
      changeDataset(si,di,d => {const rows=d.rows.map(r => [...r]);incoming.forEach((r,ri) => {while(rows.length<=startRow+ri)rows.push(["","",""]);r.forEach((v,ci) => {rows[startRow+ri][startColumn+ci]=v;});});return {...d,rows};});setWorksheetError("");
    } catch(error) {setWorksheetError(error instanceof Error ? error.message : "Could not paste cells.");}
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
          setSeries(saved.series.map(s => ({...s,plot:"left"}))); setLabels(saved.labels); setShowTitles(saved.showTitles);
          setShowPointValues(saved.showPointValues ?? false);
          setFonts(saved.fonts); setAppearance(withDistinctSymbols(saved.appearance)); setLegendPosition(saved.legendPosition); setAxisSettings(saved.axisSettings);
          if (saved.cardNumber !== undefined) setCardNumber(saved.cardNumber);
          setSaveMessage("Saved data and chart settings restored.");
        }
      } catch {
        setSaveMessage("Could not restore saved data. You can still edit your chart.");
      }
      setStorageReady(true);
    });
    return () => { active = false; };
  }, [storageKey]);
  useEffect(() => {
    function collect(event: Event) {
      const entries=(event as CustomEvent<Record<string,unknown>>).detail;
      entries[storageKey]={version:1,series,labels,showTitles,appearance,axisSettings,fonts,showPointValues,legendPosition,cardNumber};
    }
    window.addEventListener("graph-collect-backup",collect);
    return () => window.removeEventListener("graph-collect-backup",collect);
  },[series,labels,showTitles,appearance,axisSettings,fonts,showPointValues,legendPosition,cardNumber,storageKey]);
  function saveInBrowser() {
    try {
      const saved: SavedPlot = { version: 1, series, labels, showTitles, showPointValues, fonts, appearance, legendPosition, axisSettings, cardNumber };
      localStorage.setItem(storageKey, JSON.stringify(saved));
      setSaveMessage("");
    } catch {
      setSaveMessage("Could not save. Browser storage may be disabled or full.");
    }
  }
  function clearAllData() {
    setSeries(series.map(s => ({...s,rows:s.rows.map(() => ["","",""]),datasets:s.datasets?.map(d => ({...d,rows:d.rows.map(() => ["","",""])}))})));
    setWorksheetError("");setDownloadError("");setSaveMessage("");
  }
  function exportData() {
    const saved: SavedPlot = { version: 1, series, labels, showTitles, showPointValues, fonts, appearance, legendPosition, axisSettings, cardNumber };
    const url = URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)], {type:"application/json"}));
    const link = document.createElement("a");
    link.href=url; link.download="graph-data.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async function importData(file: File) {
    try {
      if (file.size > 10*1024*1024) throw new Error("Choose a data file smaller than 10 MB.");
      const saved: unknown = JSON.parse(await file.text());
      if (!isSavedPlot(saved)) throw new Error("This file is not a supported Graph data export.");
      const restored = saved.series.map(s => ({...s,plot:"left" as const}));
      // Persist the imported data so it also survives reloading this browser.
      const imported = {...saved,series:restored};
      let persisted = true;
      try { localStorage.setItem(storageKey,JSON.stringify(imported)); } catch { persisted=false; }
      setSeries(restored); setLabels(saved.labels); setShowTitles(saved.showTitles);
      setShowPointValues(saved.showPointValues ?? false); setFonts(saved.fonts);
      setAppearance(withDistinctSymbols(saved.appearance)); setLegendPosition(saved.legendPosition); setAxisSettings(saved.axisSettings); setCardNumber(saved.cardNumber ?? String(index+1));
      setWorksheetError(""); setDownloadError("");
      setSaveMessage(persisted ? "Data and settings imported and saved in this browser." : "Data imported. Browser storage is unavailable, so it could not be saved locally.");
    } catch(error) {
      setSaveMessage(error instanceof Error ? error.message : "Could not import this file.");
    }
  }
  function addSeries() {
    const index = series.length;
    const color = comfortableColors[index%comfortableColors.length];
    setSeries([...series,{name:`Series ${index+1}`,plot:"left",rows:[["","",""]]}]);
    setAppearance([...appearance,{pointColor:color,lineColor:color,symbol:(["circle","square","triangle","diamond","cross"] as Symbol[])[index%5],lineStyle:"solid"}]);
    }
  function removeSeries(index: number) {
    setSeries(series.filter((_,i) => i !== index));
    setAppearance(appearance.filter((_,i) => i !== index));
    }
  const materials = [...new Map(series.flatMap(s => dataSets(s).map(d => [d.name.trim().toLowerCase(),d.name.trim()] as const))).values()];
  function materialDash(name: string) {
    const index=materials.findIndex(m => m.toLowerCase() === name.trim().toLowerCase());
    return [undefined,"10 6","2 5","12 5 2 5","5 4","16 5 5 5"][index%6];
  }
  const legendEntries = [
    ...series.map((s,i) => ({name:s.name,index:i,material:false})),
    ...(materials.length > 1 ? materials.map(name => ({name,index:0,material:true})) : [])
  ];
  const svg = useRef<SVGSVGElement>(null);
  const legendSpacing = Math.max(29,fonts.legend+12);
  const legendRows = Math.max(1,Math.min(legendEntries.length,Math.floor(396/legendSpacing)));
  const legendColumns = Math.max(1,Math.ceil(legendEntries.length/legendRows));
  const legendColumnWidth = Math.max(220,...legendEntries.map(s => 80+s.name.length*fonts.legend*.62));
  const legendWidth = legendColumnWidth*legendColumns;
  const legendHeight = legendSpacing*legendRows+12;
  const legendX = legendPosition.endsWith("right") ? 888-legendWidth : 112;
  const legendY = legendPosition.startsWith("bottom") ? 538-legendHeight : 142;
  function updateAppearance(index: number, key: keyof typeof appearanceDefaults[number], value: string) {
    setAppearance(appearance.map((a,i) => i === index ? { ...a, [key]: value } : a));
  }
  const validCell = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));
  const valid = series.length > 0 && series.every(s => s.name.trim() && dataSets(s).every(d => d.name.trim() && d.rows.every(r => r.every(v => !v.trim()) || (validCell(r[0]) && (s.plot === "right" ? validCell(r[2]) : s.plot === "both" ? validCell(r[1]) && validCell(r[2]) : validCell(r[1]))))));
  const plottedDatasets = series.flatMap((s,si) => dataSets(s).map(d => ({si,name:d.name,points:d.rows.filter(r => validCell(r[0]) && (s.plot === "right" ? validCell(r[2]) : validCell(r[1]))).map(r => r.map(v => Number(v || 0))).sort((a,b) => a[0]-b[0])})));
  const points = series.map((_,si) => plottedDatasets.filter(d => d.si === si).flatMap(d => d.points));
  const all = points.flat();
  const scales = axisSettings.map((settings,i) => {
    const values = i === 0 ? all.map(r => r[0]) : points.flatMap(ps => ps.map(r => r[i]));
    return axisScale(values,settings);
  });
  const [xScale,yScale,dropScale] = scales;
  const axesValid = scales.every(scale => !scale.error);
  const px = (x: number) => 100+(x-xScale.min)/(xScale.max-xScale.min)*800;
  const pr = (y: number) => 550-(y-dropScale.min)/(dropScale.max-dropScale.min)*420;
  const py = (y: number) => 550-(y-yScale.min)/(yScale.max-yScale.min)*420;
  const leftTitleX = 88-Math.max(...yScale.ticks.map(n => String(n).length))*fonts.values*.65-16-fonts.axis/2;
  const rightTitleX = 913+Math.max(...dropScale.ticks.map(n => String(n).length))*fonts.values*.65+16+fonts.axis/2;
  const xTitleY = 566+fonts.values+16+fonts.axis;
  const viewLeft = Math.min(-20,leftTitleX-fonts.axis);
  const viewRight = Math.max(1020,rightTitleX+fonts.axis);
  const viewBottom = Math.max(670,xTitleY+fonts.axis);
  const chartTitleY = 130-16-fonts.title*.25;
  const viewTop = showTitles[0] && labels[0].trim() ? chartTitleY-fonts.title-8 : 110;
  const pointLabels = placePointLabels(points.flatMap((ps,si) => ps.filter(r => r[0] >= xScale.min && r[0] <= xScale.max && (series[si].plot === "right" ? r[2] >= dropScale.min && r[2] <= dropScale.max : r[1] >= yScale.min && r[1] <= yScale.max)).map((r,i) => ({ x: px(r[0]), y: series[si].plot === "right" ? pr(r[2]) : py(r[1]), text: r[2].toFixed(2), key: `${si}-${i}`, series: si }))), fonts.values, [{ x: legendX, y: legendY, width: legendWidth, height: legendHeight }]);
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
  return <div>

    <button className={styles.card} aria-expanded={open} aria-controls={"plot-editor-"+graphId} onClick={() => setOpen(!open)}><span className={styles.icon}>↗</span><span><strong>{"Three-axis plot "+(cardNumber.trim() || String(index+1))}</strong><small>One X axis, two Y axes, and labeled data points.</small></span><span className={styles.action}>{open ? "Close editor −" : "Open editor +"}</span></button>
    {open && <div id={"plot-editor-"+graphId}>
      <CollapsiblePanel title="Plot configuration" header={<div className={styles.sectionHeading}><div><h2>Plot configuration</h2><p>Name your chart and all three axes.</p></div><button onClick={() => {setSeries(sample);setLabels(defaults);setShowTitles([true,true,true,true]);setShowPointValues(false);setFonts(fontDefaults);setAppearance(appearanceDefaults);setAxisSettings(automaticAxes);setLegendPosition("top-left");setCardNumber(String(index+1));}}>Reset example</button></div>}><div className={styles.fields}><div><label htmlFor={"three-axis-card-"+graphId}>Card number</label><div className={styles.titleInputRow}><input id={"three-axis-card-"+graphId} value={cardNumber} onChange={e => setCardNumber(e.target.value)}/></div></div>{["Chart title","X axis · horizontal","Y axis · left","Y axis · right / point labels"].map((label,i) => <div key={i}><label htmlFor={`plot-title-${i}`}>{label}</label><div className={styles.titleInputRow}><input className={styles.titleCheckbox} type="checkbox" aria-label={`Show ${label}`} checked={showTitles[i]} onChange={e => setShowTitles(showTitles.map((v,j) => j === i ? e.target.checked : v))}/><input id={`plot-title-${i}`} value={labels[i]} onChange={e => setLabels(labels.map((v,j) => j === i ? e.target.value : v))}/></div></div>)}</div></CollapsiblePanel>
      <CollapsiblePanel title="Axis scale" header={<div className={styles.sectionHeading}><div><h2>Axis scale</h2><p>Leave a field blank for automatic scaling. Use whole numbers.</p></div><button onClick={() => setAxisSettings(automaticAxes)}>Reset scales</button></div>}>
        <div className={styles.appearanceGrid}>{axisSettings.map((settings,i) => <fieldset key={i}><legend>{["X axis","Left Y axis","Right Y axis"][i]}</legend><div className={styles.scaleControls}>{([["min","Minimum"],["max","Maximum"],["interval","Interval gap"]] as const).map(([key,label]) => <label key={key}>{label}<input type="number" step="1" min={key === "interval" ? 1 : undefined} value={settings[key]} placeholder={String(scales[i][key])} aria-invalid={!!scales[i].error} onChange={e => setAxisSettings(axisSettings.map((v,j) => j === i ? {...v,[key]:e.target.value} : v))}/></label>)}</div>{scales[i].error && <p className={styles.error} role="status">{scales[i].error}</p>}</fieldset>)}</div>
      </CollapsiblePanel>
      <CollapsiblePanel title="Chart appearance" header={<div className={styles.sectionHeading}><h2>Chart appearance</h2><label className={styles.pointValuesToggle}><input type="checkbox" checked={showPointValues} onChange={e => setShowPointValues(e.target.checked)}/>Show point values</label></div>}>
        <div className={styles.fontControls}><label>Legend position<select value={legendPosition} onChange={e => setLegendPosition(e.target.value)}><option value="top-left">Top left</option><option value="top-right">Top right</option><option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option></select></label>{([["title","Chart title"],["axis","Axis titles"],["values","Values"],["legend","Legend"]] as const).map(([key,label]) => <label key={key}>{label} font size<select value={fonts[key]} onChange={e => setFonts({...fonts,[key]:Number(e.target.value)})}>{fontOptions.map(size => <option key={size} value={size}>{size} px</option>)}</select></label>)}</div>
        <div className={styles.appearanceGrid}>{appearance.map((a,i) => <fieldset key={i}><legend>{series[i].name || `Series ${i+1}`}</legend><div className={styles.styleControls}>
          <ColorPicker label="Series color" value={a.lineColor} onChange={color => setAppearance(appearance.map((v,j) => j === i ? {...v,pointColor:color,lineColor:color} : v))}/>

          <label>Point symbol<select value={a.symbol} onChange={e => updateAppearance(i,"symbol",e.target.value)}>{["circle","square","triangle","diamond","cross","none"].map(v => <option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
          <label>Line style<select value={a.lineStyle} onChange={e => updateAppearance(i,"lineStyle",e.target.value)}>{["solid","dashed","dotted","none"].map(v => <option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
        </div></fieldset>)}</div>
      </CollapsiblePanel>
      <CollapsiblePanel title="Axis data" header={<div className={`${styles.sectionHeading} ${styles.axisDataHeading}`}><div><h2>Axis data</h2><p>Add material datasets under each legend series. Every dataset has independent X, left Y, and right Y values.</p></div><div className={styles.downloadActions}><button onClick={addSeries}>+ Add series</button></div></div>}>
        <div className={styles.seriesGrid}>{series.map((s,si) => <div className={styles.materialSeries} key={si}><div className={styles.materialHeader}><span className={styles.materialDot} style={{background:appearance[si].lineColor}}/><input aria-label={`Legend series ${si+1}`} value={s.name} onChange={e => setSeries(series.map((v,i) => i === si ? {...v,name:e.target.value} : v))}/><button className={styles.add} onClick={() => setSeries(series.map((v,i) => i === si ? {...v,datasets:[...dataSets(v),{name:`Material ${dataSets(v).length+1}`,rows:Array.from({length:dataSets(v)[0].rows.length},() => ["","",""])}]} : v))}>+ Add dataset</button><button className={styles.deleteSeries} onClick={() => removeSeries(si)}>Delete series</button></div><div className={styles.datasetGrid}>{dataSets(s).map((d,di) => <div key={di} className={styles.datasetCard}><div className={styles.materialHeader}><input aria-label={`${s.name} dataset ${di+1} material`} value={d.name} onChange={e => changeDataset(si,di,d => ({...d,name:e.target.value}))}/><button className={styles.deleteSeries} disabled={dataSets(s).length === 1} onClick={() => setSeries(series.map((v,i) => i === si ? {...v,datasets:dataSets(v).filter((_,j) => j !== di)} : v))}>Delete dataset</button></div><div className={styles.worksheetScroll}><table className={styles.datasetTable}><thead><tr>{labels.slice(1).map((label,i) => <th key={i}>{label}</th>)}<th aria-label="Delete row"/></tr></thead><tbody>{d.rows.map((r,ri) => <tr key={ri}>{r.map((value,ci) => <td key={ci}><input type="number" step="any" value={value} aria-label={`${s.name}, ${d.name}, row ${ri+1}, ${["X","Left Y","Right Y"][ci]}`} onChange={e => updateWorksheet(si,di,ri,ci,e.target.value)} onPaste={e => {const text=e.clipboardData.getData("text/plain");if(text.includes("\t") || /[\r\n]/.test(text)){e.preventDefault();pasteWorksheet(text,si,di,ri,ci);}}}/></td>)}<td><button className={styles.remove} disabled={d.rows.length === 1} aria-label={`Delete row ${ri+1} from ${d.name}`} onClick={() => changeDataset(si,di,d => ({...d,rows:d.rows.filter((_,j) => j !== ri)}))}>&times;</button></td></tr>)}</tbody></table></div><div className={styles.worksheetFooter}><button className={styles.add} onClick={() => changeDataset(si,di,d => ({...d,rows:[...d.rows,["","",""]]}))}>+ Add row</button></div><label className={styles.excelPaste}>Paste from Excel<textarea rows={2} value="" placeholder="Click here and paste 3 numeric columns" aria-label={`Paste Excel data into ${s.name}, ${d.name}`} onChange={() => {}} onPaste={e => {e.preventDefault();pasteWorksheet(e.clipboardData.getData("text/plain"),si,di,0,0);}}/></label></div>)}</div></div>)}</div>
        <p className={styles.datasetHint}>Paste three numeric Excel columns into a dataset. Colors and symbols identify series. Line patterns identify materials; matching material names share a pattern.</p>
        {worksheetError && <p className={styles.error} role="alert">{worksheetError}</p>}
        {!valid && <p className={styles.error} role="status">Complete both X and Y values for each data row. Empty rows are ignored.</p>}
      </CollapsiblePanel>
      <div className={styles.saveArea}><div className={styles.transferActions}><button className={styles.clearDataButton} onClick={clearAllData}>Clear all data</button><button className={styles.saveButton} disabled={!storageReady} onClick={saveInBrowser} title="Save data and chart settings in this browser">Save</button><button className={styles.saveButton} disabled={!storageReady} onClick={exportData}>Export data</button><label className={styles.importButton}>Import data<input type="file" accept=".json,application/json" disabled={!storageReady} onChange={e => {const file=e.target.files?.[0];if(file) void importData(file);e.target.value="";}}/></label><button className={styles.clearDataButton} onClick={() => {if(window.confirm("Delete this graph and its saved browser data?")){localStorage.removeItem(storageKey);onDelete();}}}>Delete graph</button></div>{saveMessage && <p className={styles.saveStatus} role="status">{saveMessage}</p>}</div>
      <CollapsiblePanel title="Plot preview" header={<div className={styles.sectionHeading}><div><h2>Plot preview</h2></div><div className={styles.downloadActions}><label className={styles.formatLabel}>File format<select value={exportFormat} disabled={imageDownloading} onChange={e => setExportFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="svg">SVG</option></select></label><button className={styles.primary} disabled={!valid || !axesValid || imageDownloading} onClick={downloadImage}>{imageDownloading ? "Preparing..." : "Download"}</button></div></div>}>{downloadError && <p className={styles.error} role="alert">{downloadError}</p>}
        <div className={styles.chart}><svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox={`${viewLeft} ${viewTop} ${viewRight-viewLeft} ${viewBottom-viewTop}`} role="img" aria-labelledby={"chart-title-"+graphId+" chart-description-"+graphId} style={{fontFamily:"Times New Roman, Times, serif"}}><title id={"chart-title-"+graphId}>{showTitles[0] && labels[0].trim() ? labels[0] : "Three-axis plot"}</title><desc id={"chart-description-"+graphId}>{labels[1]} versus {labels[2]}, with {labels[3]} on the right axis. {series.map((s,i) => `${s.name}: ${points[i].map(r => r.join(', ')).join('; ')}`).join('. ')}</desc><rect x={viewLeft} y={viewTop} width={viewRight-viewLeft} height={viewBottom-viewTop} fill="white"/><defs><clipPath id={"plot-area-"+graphId}><rect x="100" y="130" width="800" height="420"/></clipPath></defs>{showTitles[0] && <text x="500" y={chartTitleY} textAnchor="middle" fontSize={fonts.title}>{labels[0]}</text>}
          {yScale.ticks.map(y => <g key={y}><text x="88" y={py(y)} dominantBaseline="middle" textAnchor="end" fontSize={fonts.values}>{y}</text></g>)}
          {xScale.ticks.map(x => <g key={x}><text x={px(x)} y={566+fonts.values} textAnchor="middle" fontSize={fonts.values}>{x}</text></g>)}
          {dropScale.ticks.map(d => <text key={d} x="913" y={550-(d-dropScale.min)/(dropScale.max-dropScale.min)*420} dominantBaseline="middle" fontSize={fonts.values}>{d}</text>)}
          <rect x="100" y="130" width="800" height="420" fill="none" stroke="#222" strokeWidth="1.5"/>
          {plottedDatasets.map(({points:ps,si,name},datasetIndex) => <g key={datasetIndex} clipPath={"url(#plot-area-"+graphId+")"}>{[1].map(column => { const positionY = column === 2 ? pr : py; return <g key={column}><polyline points={ps.map(r => `${px(r[0])},${positionY(r[column])}`).join(' ')} fill="none" stroke={appearance[si].lineColor} strokeWidth="3" strokeDasharray={materials.length > 1 ? materialDash(name) : dash(appearance[si].lineStyle)} visibility={appearance[si].lineStyle === "none" ? "hidden" : "visible"}/>{ps.map((r,i) => <g key={i} fill={appearance[si].lineColor} color={appearance[si].lineColor}>{marker(appearance[si].symbol,px(r[0]),positionY(r[column]))}</g>)}</g>; })}</g>)}
          {showPointValues && pointLabels.map(label => <line key={`connector-${label.key}`} x1={label.connectorStartX} y1={label.connectorStartY} x2={label.connectorX} y2={label.connectorY} stroke={appearance[label.series].lineColor} strokeOpacity=".65" strokeWidth="1"/>)}
          {showPointValues && pointLabels.map(label => <text key={label.key} x={label.labelX} y={label.labelY} textAnchor="middle" fontSize={fonts.values} fill="#171717" stroke="white" strokeWidth="3" paintOrder="stroke">{label.text}</text>)}
          {legendEntries.length > 0 && <g transform={`translate(${legendX-112} ${legendY-142})`}><rect x="112" y="142" width={legendWidth} height={legendHeight} rx="4" fill="white" fillOpacity=".94" stroke="#ddd"/>{legendEntries.map((s,i) => <g key={i} transform={`translate(${Math.floor(i/legendRows)*legendColumnWidth} ${-Math.floor(i/legendRows)*legendRows*legendSpacing})`}><line x1="125" x2="162" y1={160+i*legendSpacing+fonts.legend/3} y2={160+i*legendSpacing+fonts.legend/3} stroke={s.material ? "#334155" : appearance[s.index].lineColor} strokeWidth="3" strokeDasharray={s.material ? materialDash(s.name) : dash(appearance[s.index].lineStyle)} visibility={!s.material && appearance[s.index].lineStyle === "none" ? "hidden" : "visible"}/>{!s.material && <g fill={appearance[s.index].lineColor} color={appearance[s.index].lineColor}>{marker(appearance[s.index].symbol,143,160+i*legendSpacing+fonts.legend/3)}</g>}<text x="176" y={160+i*legendSpacing+fonts.legend/3} dominantBaseline="middle" fontSize={fonts.legend}>{s.name}</text></g>)}</g>}
          {showTitles[1] && <text x="500" y={xTitleY} textAnchor="middle" fontSize={fonts.axis}>{labels[1]}</text>}{showTitles[2] && <text transform={`translate(${leftTitleX} 340) rotate(-90)`} textAnchor="middle" fontSize={fonts.axis}>{labels[2]}</text>}{showTitles[3] && <text transform={`translate(${rightTitleX} 340) rotate(-90)`} textAnchor="middle" fontSize={fonts.axis}>{labels[3]}</text>}
        </svg></div>
      </CollapsiblePanel>
    </div>}
  </div>;
}


export default function ThreeAxisPlot() {
  const [graphIds,setGraphIds] = useState(["primary"]);
  const [listReady,setListReady] = useState(false);
  useEffect(() => {
    let active=true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw=localStorage.getItem(threeAxisListKey);
        if (raw) {
          const saved: unknown=JSON.parse(raw);
          if (Array.isArray(saved) && saved.every(id => typeof id === "string")) setGraphIds(saved);
        }
      } catch { /* Keep the default graph when the saved list is unavailable. */ }
      setListReady(true);
    });
    return () => { active=false; };
  },[]);
  useEffect(() => { if (listReady) localStorage.setItem(threeAxisListKey,JSON.stringify(graphIds)); },[graphIds,listReady]);
  function addGraph() { setGraphIds(ids => [...ids,"graph-"+Date.now()+"-"+Math.random().toString(36).slice(2)]); }
  function deleteGraph(id: string) { setGraphIds(ids => ids.filter(value => value !== id)); }
  return <div className={styles.workspace}><GraphLibraryTransfer/>{graphIds.map((id,index) => <ThreeAxisEditor key={id} graphId={id} index={index} onDelete={() => deleteGraph(id)}/>)}<div className={styles.saveArea}><button className={styles.saveButton} onClick={addGraph}>+ Add another graph</button></div></div>;
}
