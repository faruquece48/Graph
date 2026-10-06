"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./plot.module.css";
import GraphLibraryTransfer from "./graph-library-transfer";
import ColorPicker from "./color-picker";
import CollapsiblePanel from "./collapsible-panel";
import type { AxisSettings } from "./axis-scale";

type Symbol = "circle" | "square" | "triangle" | "diamond" | "none";
type DataSet = { name: string; rows: string[][] };
type Series = { name: string; datasets: DataSet[] };
type Appearance = { pointColor: string; lineColor: string; symbol: Symbol; lineStyle: "solid" | "dashed" | "dotted" | "none" };
type LegendPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type SavedGraph = { version:1; series:Series[]; labels:string[]; showTitles:boolean[]; appearance:Appearance[]; axisSettings:AxisSettings[]; fonts:{title:number;axis:number;values:number;legend:number}; showPointValues:boolean; legendPosition?:LegendPosition; cardNumber?:string };
const graphListKey = "graph.two-axis.list.v1";
function isSavedGraph(value: unknown): value is SavedGraph {
  if (!value || typeof value !== "object") return false;
  const saved=value as SavedGraph;
  return saved.version === 1 && Array.isArray(saved.series) && saved.series.length > 0 && Array.isArray(saved.labels) && saved.labels.length === 3 && Array.isArray(saved.showTitles) && saved.showTitles.length === 3 && Array.isArray(saved.appearance) && saved.appearance.length === saved.series.length && Array.isArray(saved.axisSettings) && saved.axisSettings.length === 2 && !!saved.fonts && typeof saved.showPointValues === "boolean";
}

const sample: Series[] = [
  { name: "Depth = 1 m", datasets: [{ name:"Material 1", rows:[[303,301.41],[308,304.77],[313,308.05],[318,311.08]].map(r => r.map(String)) }] },
  { name: "Depth = 2 m", datasets: [{ name:"Material 1", rows:[[303,301.29],[308,304.45],[313,307.67],[318,310.79]].map(r => r.map(String)) }] },
  { name: "Depth = 3 m", datasets: [{ name:"Material 1", rows:[[303,301.2],[308,304.12],[313,307.45],[318,310.26]].map(r => r.map(String)) }] },
];
const defaultSymbols: Symbol[] = ["circle","square","triangle","diamond"];
const comfortableColors = ["#4e79a7","#f28e2b","#59a14f","#b07aa1","#e15759","#76b7b2","#edc948","#ff9da7"];
const legacyDefaultColors = ["#5b9bd5","#ed7d31","#a5a5a5"];
const initialAppearance: Appearance[] = comfortableColors.slice(0,3).map((color,index) => ({pointColor:color,lineColor:color,symbol:defaultSymbols[index],lineStyle:"solid"}));
const initialAxes: AxisSettings[] = [{ min:"300", max:"318", interval:"6" },{ min:"300", max:"312", interval:"4" }];
const fontOptions = [10,12,14,16,18,20,22,24,26,28,30,32,36,40];
const initialFonts = { title:26, axis:24, values:18, legend:20 };

function withDistinctSymbols(items: Appearance[]) {
  const updated=items.map((item,index) => {
    const legacy=legacyDefaultColors[index];
    return legacy && item.pointColor.toLowerCase() === legacy && item.lineColor.toLowerCase() === legacy ? {...item,pointColor:comfortableColors[index],lineColor:comfortableColors[index]} : item;
  });
  if (updated.length < 2 || !updated.every(item => item.symbol === updated[0].symbol)) return updated;
  return updated.map((item,index) => ({...item,symbol:defaultSymbols[index%defaultSymbols.length]}));
}

function fourTickScale(values: number[], settings: AxisSettings) {
  const low = Math.min(...(values.length ? values : [0,1]));
  const high = Math.max(...(values.length ? values : [0,1]));
  let autoInterval = Math.max(1,Math.ceil((high-low)/3));
  let autoMin = Math.floor(low/autoInterval)*autoInterval;
  while (autoMin+autoInterval*3 < high) {
    autoInterval += 1;
    autoMin = Math.floor(low/autoInterval)*autoInterval;
  }
  const automatic = { min:autoMin, max:autoMin+autoInterval*3, interval:autoInterval };
  const supplied = [settings.min,settings.max,settings.interval].every(value => value.trim() !== "");
  if (!supplied) return {...automatic,ticks:Array.from({length:4},(_,i) => automatic.min+i*automatic.interval),error:""};
  const min=Number(settings.min), max=Number(settings.max), interval=Number(settings.interval);
  let error = "";
  if (![min,max,interval].every(Number.isSafeInteger)) error = "Use whole numbers for minimum, maximum, and interval.";
  else if (interval <= 0) error = "Interval must be greater than zero.";
  else if (max-min !== interval*3) error = "For four axis values, maximum must equal minimum + (3 x interval).";
  else if (min > low || max < high) error = "Expand the range so every plotted value is between the minimum and maximum.";
  const resolved = error ? automatic : {min,max,interval};
  return {...resolved,ticks:Array.from({length:4},(_,i) => resolved.min+i*resolved.interval),error};
}

function dash(style: Appearance["lineStyle"]) { return style === "dashed" ? "10 6" : style === "dotted" ? "2 5" : undefined; }
function marker(symbol: Symbol, x: number, y: number) {
  if (symbol === "circle") return <circle cx={x} cy={y} r="6"/>;
  if (symbol === "square") return <rect x={x-6} y={y-6} width="12" height="12"/>;
  if (symbol === "triangle") return <polygon points={x+","+(y-7)+" "+(x-7)+","+(y+6)+" "+(x+7)+","+(y+6)}/>;
  if (symbol === "diamond") return <polygon points={x+","+(y-8)+" "+(x+7)+","+y+" "+x+","+(y+8)+" "+(x-7)+","+y}/>;
  return null;
}

function TwoAxisEditor({graphId,index,onDelete}:{graphId:string;index:number;onDelete:()=>void}) {
  const [open,setOpen] = useState(false);
  const [cardNumber,setCardNumber] = useState(String(index+1));
  const [series,setSeries] = useState<Series[]>(sample);
  const [labels,setLabels] = useState(["","Inlet Temperature (K)","Room Temperature (K)"]);
  const [showTitles,setShowTitles] = useState([false,true,true]);
  const [appearance,setAppearance] = useState<Appearance[]>(initialAppearance);
  const [axisSettings,setAxisSettings] = useState<AxisSettings[]>(initialAxes);
  const [fonts,setFonts] = useState(initialFonts);
  const [showPointValues,setShowPointValues] = useState(false);
  const [legendPosition,setLegendPosition] = useState<LegendPosition>("bottom-right");
  const [worksheetError,setWorksheetError] = useState("");
  const [exportFormat,setExportFormat] = useState("png");
  const [downloadError,setDownloadError] = useState("");
  const [storageReady,setStorageReady] = useState(false);
  const [saveMessage,setSaveMessage] = useState("");
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let active=true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw=localStorage.getItem("graph.two-axis."+graphId+".v1");
        if (raw) {
          const saved: unknown=JSON.parse(raw);
          if (!isSavedGraph(saved)) throw new Error("Invalid saved graph");
          setSeries(saved.series); setLabels(saved.labels); setShowTitles(saved.showTitles); setAppearance(withDistinctSymbols(saved.appearance));
          setAxisSettings(saved.axisSettings); setFonts(saved.fonts); setShowPointValues(saved.showPointValues);
          if (saved.legendPosition && ["top-left","top-right","bottom-left","bottom-right"].includes(saved.legendPosition)) setLegendPosition(saved.legendPosition);
          if (saved.cardNumber !== undefined) setCardNumber(saved.cardNumber);
          setSaveMessage("Saved graph restored from this browser.");
        }
      } catch { setSaveMessage("Could not restore this saved graph."); }
      setStorageReady(true);
    });
    return () => { active=false; };
  },[graphId]);

  const validCell = (value: string) => value.trim() !== "" && Number.isFinite(Number(value));
  const valid = series.length > 0 && series.every(s => s.name.trim() && s.datasets.length > 0 && s.datasets.every(d => d.name.trim() && d.rows.every(r => r.every(v => !v.trim()) || (validCell(r[0]) && validCell(r[1])))));
  const plottedDatasets = series.flatMap((s,si) => s.datasets.map(d => ({si,name:d.name,points:d.rows.filter(r => validCell(r[0]) && validCell(r[1])).map(r => r.map(Number)).sort((a,b) => a[0]-b[0])})));
  const allPoints = plottedDatasets.flatMap(d => d.points);
  const xScale = fourTickScale(allPoints.map(r => r[0]),axisSettings[0]);
  const yScale = fourTickScale(allPoints.map(r => r[1]),axisSettings[1]);
  const axesValid = !xScale.error && !yScale.error;
  const px = (x: number) => 130+(x-xScale.min)/(xScale.max-xScale.min)*720;
  const py = (y: number) => 535-(y-yScale.min)/(yScale.max-yScale.min)*485;
  const materials = [...new Map(series.flatMap(s => s.datasets.map(d => [d.name.trim().toLowerCase(),d.name.trim()] as const))).values()];
  const materialDash = (name: string) => [undefined,"10 6","2 5","12 5 2 5","5 4","16 5 5 5"][materials.findIndex(m => m.toLowerCase() === name.trim().toLowerCase())%6];
  const legendEntries = [...series.map((s,index) => ({name:s.name,index,material:false})),...(materials.length > 1 ? materials.map(name => ({name,index:0,material:true})) : [])];
  const legendSpacing = Math.max(24,fonts.legend+6);
  const legendRows = Math.max(1,Math.min(legendEntries.length,Math.floor(400/legendSpacing)));
  const legendColumns = Math.max(1,Math.ceil(legendEntries.length/legendRows));
  const legendBlockHeight = (Math.min(legendEntries.length,legendRows)-1)*legendSpacing;
  const legendStartY = legendPosition.startsWith("bottom") ? 517-legendBlockHeight : 68;

  function changeDataset(si: number, di: number, change: (dataset: DataSet) => DataSet) {
    setSeries(series.map((s,i) => i === si ? {...s,datasets:s.datasets.map((d,j) => j === di ? change(d) : d)} : s));
  }
  function updateRow(si: number, di: number, ri: number, ci: number, value: string) {
    changeDataset(si,di,d => ({...d,rows:d.rows.map((r,j) => j === ri ? r.map((v,k) => k === ci ? value : v) : r)}));
  }
  function pasteDataset(text: string, si: number, di: number) {
    try {
      const incoming=text.replace(/\r\n?/g,"\n").replace(/\n+$/,"").split("\n").map(line => line.split("\t").map(v => v.trim()));
      if(incoming.length > 1000) throw new Error("Paste up to 1,000 rows at a time.");
      if(incoming.some(r => r.length !== 2)) throw new Error("Paste exactly two columns: X and Y.");
      if(incoming.some(r => r.some(v => v !== "" && !Number.isFinite(Number(v))))) throw new Error("Copy numeric cells without headings.");
      changeDataset(si,di,d => ({...d,rows:incoming}));
      setWorksheetError("");
    } catch(error) { setWorksheetError(error instanceof Error ? error.message : "Could not paste these cells."); }
  }
  function addSeries() {
    const color = comfortableColors[series.length%comfortableColors.length];
    setSeries([...series,{name:"Series "+(series.length+1),datasets:[{name:"Material 1",rows:[["",""]]}]}]);
    setAppearance([...appearance,{pointColor:color,lineColor:color,symbol:defaultSymbols[series.length%defaultSymbols.length],lineStyle:"solid"}]);
  }
  function reset() {
    setSeries(sample); setLabels(["","Inlet Temperature (K)","Room Temperature (K)"]); setShowTitles([false,true,true]);
    setAppearance(initialAppearance); setAxisSettings(initialAxes); setFonts(initialFonts); setShowPointValues(false); setLegendPosition("bottom-right"); setCardNumber(String(index+1)); setWorksheetError(""); setDownloadError("");
  }
  useEffect(() => {
    function collect(event: Event) {
      const entries=(event as CustomEvent<Record<string,unknown>>).detail;
      entries["graph.two-axis."+graphId+".v1"]={version:1,series,labels,showTitles,appearance,axisSettings,fonts,showPointValues,legendPosition,cardNumber};
    }
    window.addEventListener("graph-collect-backup",collect);
    return () => window.removeEventListener("graph-collect-backup",collect);
  },[series,labels,showTitles,appearance,axisSettings,fonts,showPointValues,legendPosition,cardNumber,graphId]);
  function saveInBrowser() {
    try {
      const saved: SavedGraph={version:1,series,labels,showTitles,appearance,axisSettings,fonts,showPointValues,legendPosition,cardNumber};
      localStorage.setItem("graph.two-axis."+graphId+".v1",JSON.stringify(saved));
      setSaveMessage("Graph saved in this browser.");
    } catch { setSaveMessage("Could not save this graph. Browser storage may be unavailable."); }
  }
  function deleteGraph() {
    if (!window.confirm("Delete this graph and its saved browser data?")) return;
    localStorage.removeItem("graph.two-axis."+graphId+".v1");
    onDelete();
  }
  async function download() {
    if (!svg.current || !valid || !axesValid) return;
    const serialized = new XMLSerializer().serializeToString(svg.current);
    if (exportFormat === "svg") {
      const url = URL.createObjectURL(new Blob([serialized],{type:"image/svg+xml"}));
      const link = document.createElement("a"); link.href=url; link.download="two-axis-plot.svg"; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      return;
    }
    const sourceUrl = URL.createObjectURL(new Blob([serialized],{type:"image/svg+xml"}));
    try {
      const image = new Image(); image.src=sourceUrl; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width=2000; canvas.height=1300;
      const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable");
      context.fillStyle="white"; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(v => v ? resolve(v) : reject(new Error("Conversion failed")),exportFormat === "jpg" ? "image/jpeg" : "image/png",.95));
      const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download="two-axis-plot."+exportFormat; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
      setDownloadError("");
    } catch { setDownloadError("Could not download the chart image."); }
    finally { URL.revokeObjectURL(sourceUrl); }
  }

  return <>
    <button className={styles.card} aria-expanded={open} aria-controls={"two-axis-editor-"+graphId} onClick={() => setOpen(!open)}><span className={styles.icon}>&#8599;</span><span><strong>{"Two-axis plot "+(cardNumber.trim() || String(index+1))}</strong><small>One X axis, one Y axis, and independent data and settings.</small></span><span className={styles.action}>{open ? "Close editor -" : "Open editor +"}</span></button>
    {open && <div id={"two-axis-editor-"+graphId}>
      <CollapsiblePanel title="Two-axis plot configuration" header={<div className={styles.sectionHeading}><div><h2>Plot configuration</h2><p>Name this chart and its two axes.</p></div><button onClick={reset}>Reset example</button></div>}>
        <div className={styles.fields}><div><label htmlFor={"two-axis-card-"+graphId}>Card number</label><div className={styles.titleInputRow}><input id={"two-axis-card-"+graphId} value={cardNumber} onChange={e => setCardNumber(e.target.value)}/></div></div>{["Chart title","X axis - horizontal","Y axis - vertical"].map((label,i) => <div key={label}><label htmlFor={"two-axis-title-"+i}>{label}</label><div className={styles.titleInputRow}><input className={styles.titleCheckbox} type="checkbox" aria-label={"Show "+label} checked={showTitles[i]} onChange={e => setShowTitles(showTitles.map((v,j) => j === i ? e.target.checked : v))}/><input id={"two-axis-title-"+i} value={labels[i]} onChange={e => setLabels(labels.map((v,j) => j === i ? e.target.value : v))}/></div></div>)}</div>
      </CollapsiblePanel>
      <CollapsiblePanel title="Two-axis scale" header={<div className={styles.sectionHeading}><div><h2>Axis scale</h2><p>Each axis always shows four whole-number values. Set maximum = minimum + (3 x interval), and keep all plotted data inside the range.</p></div><button onClick={() => setAxisSettings(initialAxes)}>Reset scales</button></div>}>
        <div className={styles.appearanceGrid}>{axisSettings.map((settings,i) => <fieldset key={i}><legend>{i === 0 ? "X axis" : "Y axis"}</legend><div className={styles.scaleControls}>{([["min","Minimum"],["max","Maximum"],["interval","Interval gap"]] as const).map(([key,label]) => <label key={key}>{label}<input type="number" step="1" value={settings[key]} aria-invalid={!![xScale,yScale][i].error} onChange={e => setAxisSettings(axisSettings.map((a,j) => j === i ? {...a,[key]:e.target.value} : a))}/></label>)}</div>{[xScale,yScale][i].error && <p className={styles.error}>{[xScale,yScale][i].error}</p>}</fieldset>)}</div>
      </CollapsiblePanel>
      <CollapsiblePanel title="Two-axis appearance" header={<div className={styles.sectionHeading}><h2>Chart appearance</h2><label className={styles.pointValuesToggle}><input type="checkbox" checked={showPointValues} onChange={e => setShowPointValues(e.target.checked)}/>Show point values</label></div>}>
        <div className={styles.fontControls}><label>Legend position<select value={legendPosition} onChange={e => setLegendPosition(e.target.value as LegendPosition)}><option value="top-left">Upper left</option><option value="top-right">Upper right</option><option value="bottom-left">Lower left</option><option value="bottom-right">Lower right</option></select></label>{([["title","Chart title"],["axis","Axis titles"],["values","Values"],["legend","Legend"]] as const).map(([key,label]) => <label key={key}>{label} font size<select value={fonts[key]} onChange={e => setFonts({...fonts,[key]:Number(e.target.value)})}>{fontOptions.map(size => <option key={size}>{size}</option>)}</select></label>)}</div>
        <div className={styles.appearanceGrid}>{appearance.map((a,i) => <fieldset key={i}><legend>{series[i]?.name || "Series "+(i+1)}</legend><div className={styles.styleControls}><ColorPicker label="Series color" value={a.lineColor} onChange={color => setAppearance(appearance.map((v,j) => j === i ? {...v,pointColor:color,lineColor:color} : v))}/><label>Point symbol<select value={a.symbol} onChange={e => setAppearance(appearance.map((v,j) => j === i ? {...v,symbol:e.target.value as Symbol} : v))}>{["circle","square","triangle","diamond","none"].map(v => <option key={v}>{v}</option>)}</select></label><label>Line style<select value={a.lineStyle} onChange={e => setAppearance(appearance.map((v,j) => j === i ? {...v,lineStyle:e.target.value as Appearance["lineStyle"]} : v))}>{["solid","dashed","dotted","none"].map(v => <option key={v}>{v}</option>)}</select></label></div></fieldset>)}</div>
      </CollapsiblePanel>
      <CollapsiblePanel title="Two-axis data" header={<div className={styles.sectionHeading}><div><h2>Axis data</h2><p>Add material datasets under each legend series. Every dataset has independent X and Y values.</p></div><button onClick={addSeries}>+ Add series</button></div>}>
        <div className={styles.seriesGrid}>{series.map((s,si) => <div className={styles.materialSeries} key={si}><div className={styles.materialHeader}><span className={styles.materialDot} style={{background:appearance[si].lineColor}}/><input aria-label={"Legend series "+(si+1)} value={s.name} onChange={e => setSeries(series.map((v,i) => i === si ? {...v,name:e.target.value} : v))}/><button className={styles.add} onClick={() => setSeries(series.map((v,i) => i === si ? {...v,datasets:[...v.datasets,{name:"Material "+(v.datasets.length+1),rows:Array.from({length:v.datasets[0].rows.length},() => ["",""])}]} : v))}>+ Add dataset</button><button className={styles.deleteSeries} disabled={series.length === 1} onClick={() => {setSeries(series.filter((_,i) => i !== si));setAppearance(appearance.filter((_,i) => i !== si));}}>Delete series</button></div><div className={styles.datasetGrid}>{s.datasets.map((d,di) => <div key={di} className={styles.datasetCard}><div className={styles.materialHeader}><input aria-label={s.name+" dataset "+(di+1)+" material"} value={d.name} onChange={e => changeDataset(si,di,v => ({...v,name:e.target.value}))}/><button className={styles.deleteSeries} disabled={s.datasets.length === 1} onClick={() => setSeries(series.map((v,i) => i === si ? {...v,datasets:v.datasets.filter((_,j) => j !== di)} : v))}>Delete dataset</button></div><div className={styles.worksheetScroll}><table className={styles.datasetTable}><thead><tr><th>{labels[1] || "X"}</th><th>{labels[2] || "Y"}</th><th aria-label="Delete row"/></tr></thead><tbody>{d.rows.map((r,ri) => <tr key={ri}>{r.map((value,ci) => <td key={ci}><input type="number" step="any" value={value} aria-label={s.name+", "+d.name+", row "+(ri+1)+", "+(ci === 0 ? "X" : "Y")} onChange={e => updateRow(si,di,ri,ci,e.target.value)}/></td>)}<td><button className={styles.remove} disabled={d.rows.length === 1} aria-label={"Delete row "+(ri+1)+" from "+d.name} onClick={() => changeDataset(si,di,v => ({...v,rows:v.rows.filter((_,j) => j !== ri)}))}>x</button></td></tr>)}</tbody></table></div><div className={styles.worksheetFooter}><button className={styles.add} onClick={() => changeDataset(si,di,v => ({...v,rows:[...v.rows,["",""]]}))}>+ Add row</button></div><label className={styles.excelPaste}>Paste from Excel<textarea rows={2} value="" placeholder="Click here and paste 2 numeric columns" aria-label={"Paste Excel data into "+s.name+", "+d.name} onChange={() => {}} onPaste={e => {e.preventDefault();pasteDataset(e.clipboardData.getData("text/plain"),si,di);}}/></label></div>)}</div></div>)}</div>
        <p className={styles.datasetHint}>Paste two numeric Excel columns into a dataset. Colors and symbols identify series. Line patterns identify materials; matching material names share a pattern.</p>
        {worksheetError && <p className={styles.error} role="alert">{worksheetError}</p>}{!valid && <p className={styles.error}>Complete both X and Y values in each non-empty row.</p>}
      </CollapsiblePanel>
      <div className={styles.saveArea}><div className={styles.transferActions}><button className={styles.saveButton} disabled={!storageReady || !valid || !axesValid} onClick={saveInBrowser}>Save graph in browser</button><button className={styles.clearDataButton} onClick={deleteGraph}>Delete graph</button></div>{saveMessage && <p className={styles.saveStatus} role="status">{saveMessage}</p>}</div>
      <CollapsiblePanel title="Two-axis plot preview" header={<div className={styles.sectionHeading}><div><h2>Plot preview</h2><p>This preview and its download use only the two-axis editor data.</p></div><div className={styles.downloadActions}><label className={styles.formatLabel}>File format<select value={exportFormat} onChange={e => setExportFormat(e.target.value)}><option value="png">PNG</option><option value="jpg">JPG</option><option value="svg">SVG</option></select></label><button className={styles.primary} disabled={!valid || !axesValid} onClick={() => void download()}>Download</button></div></div>}>
        {downloadError && <p className={styles.error}>{downloadError}</p>}
        <div className={styles.chart}><svg ref={svg} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 650" role="img" aria-labelledby={"two-chart-title-"+graphId+" two-chart-description-"+graphId} style={{fontFamily:"Times New Roman, Times, serif"}}><title id={"two-chart-title-"+graphId}>{labels[0] || "Two-axis plot"}</title><desc id={"two-chart-description-"+graphId}>{labels[2]} versus {labels[1]}.</desc><rect width="1000" height="650" fill="white"/>
          {showTitles[0] && labels[0].trim() && <text x="500" y="34" textAnchor="middle" fontSize={fonts.title}>{labels[0]}</text>}
          <line x1="130" y1="50" x2="130" y2="535" stroke="#000000" strokeWidth="2"/><line x1="130" y1="535" x2="850" y2="535" stroke="#000000" strokeWidth="2"/>
          {xScale.ticks.map(x => <g key={x}><line x1={px(x)} y1="535" x2={px(x)} y2="542" stroke="#000000" strokeWidth="2"/><text x={px(x)} y="570" textAnchor="middle" fontSize={fonts.values}>{x}</text></g>)}
          {yScale.ticks.map(y => <g key={y}><line x1="123" y1={py(y)} x2="130" y2={py(y)} stroke="#000000" strokeWidth="2"/><text x="112" y={py(y)} textAnchor="end" dominantBaseline="middle" fontSize={fonts.values}>{y}</text></g>)}
          <defs><clipPath id={"two-independent-plot-area-"+graphId}><rect x="124" y="44" width="732" height="497"/></clipPath></defs>
          {plottedDatasets.map((dataset,index) => <g key={index} clipPath={"url(#two-independent-plot-area-"+graphId+")"}><polyline points={dataset.points.map(r => px(r[0])+","+py(r[1])).join(" ")} fill="none" stroke={appearance[dataset.si].lineColor} strokeWidth="3" strokeDasharray={materials.length > 1 ? materialDash(dataset.name) : dash(appearance[dataset.si].lineStyle)} visibility={appearance[dataset.si].lineStyle === "none" ? "hidden" : "visible"}/>{dataset.points.map((r,ri) => <g key={ri} fill={appearance[dataset.si].lineColor}>{marker(appearance[dataset.si].symbol,px(r[0]),py(r[1]))}{showPointValues && <text x={px(r[0])} y={py(r[1])-12} textAnchor="middle" fontSize={fonts.values-2} fill="#222">{r[1]}</text>}</g>)}</g>)}
          <g>{legendEntries.map((entry,i) => {const column=Math.floor(i/legendRows);const row=i%legendRows;const x=legendPosition.endsWith("right") ? 705-(legendColumns-1-column)*230 : 165+column*230;const y=legendStartY+row*legendSpacing;return <g key={(entry.material ? "material-" : "series-")+entry.name+i}><line x1={x} y1={y} x2={x+40} y2={y} stroke={entry.material ? "#334155" : appearance[entry.index].lineColor} strokeWidth="3" strokeDasharray={entry.material ? materialDash(entry.name) : dash(appearance[entry.index].lineStyle)}/>{!entry.material && <g fill={appearance[entry.index].lineColor}>{marker(appearance[entry.index].symbol,x+20,y)}</g>}<text x={x+50} y={y} dominantBaseline="middle" fontSize={fonts.legend}>{entry.name}</text></g>;})}</g>
          {showTitles[1] && <text x="490" y="615" textAnchor="middle" fontSize={fonts.axis}>{labels[1]}</text>}{showTitles[2] && <text transform="translate(43 292) rotate(-90)" textAnchor="middle" fontSize={fonts.axis}>{labels[2]}</text>}
        </svg></div>
      </CollapsiblePanel>
    </div>}
  </>;
}


export default function TwoAxisPlot() {
  const [graphIds,setGraphIds] = useState(["primary"]);
  const [listReady,setListReady] = useState(false);
  useEffect(() => {
    let active=true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw=localStorage.getItem(graphListKey);
        if (raw) {
          const saved: unknown=JSON.parse(raw);
          if (Array.isArray(saved) && saved.every(id => typeof id === "string")) setGraphIds(saved);
        }
      } catch { /* Keep the default graph when the saved list is unavailable. */ }
      setListReady(true);
    });
    return () => { active=false; };
  },[]);
  useEffect(() => { if (listReady) localStorage.setItem(graphListKey,JSON.stringify(graphIds)); },[graphIds,listReady]);
  function addGraph() { setGraphIds(ids => [...ids,"graph-"+Date.now()+"-"+Math.random().toString(36).slice(2)]); }
  function deleteGraph(id: string) { setGraphIds(ids => ids.filter(value => value !== id)); }
  return <><GraphLibraryTransfer/>{graphIds.map((id,index) => <TwoAxisEditor key={id} graphId={id} index={index} onDelete={() => deleteGraph(id)}/>)}<div className={styles.saveArea}><button className={styles.saveButton} onClick={addGraph}>+ Add another graph</button></div></>;
}
