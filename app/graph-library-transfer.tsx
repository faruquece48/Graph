"use client";

import { useState } from "react";
import styles from "./plot.module.css";

const allowedKey = (key: string) => /^graph\.(two|three)-axis\.(?:list|[a-zA-Z0-9-]+)\.v1$/.test(key) || key === "graph.three-axis.v1";
export default function GraphLibraryTransfer() {
  const [message,setMessage] = useState("");
  function exportLibrary() {
    try {
      const entries: Record<string, unknown> = {};
      for(let i=0;i<localStorage.length;i++) { const key=localStorage.key(i); if(key && allowedKey(key)) entries[key]=JSON.parse(localStorage.getItem(key)!); }
      // Mounted editors contribute current values, including edits not yet saved.
      window.dispatchEvent(new CustomEvent("graph-collect-backup",{detail:entries}));
      const url=URL.createObjectURL(new Blob([JSON.stringify({format:"graph-library",version:1,entries},null,2)],{type:"application/json"}));
      const link=document.createElement("a");link.href=url;link.download="all-graphs.json";link.click();setTimeout(() => URL.revokeObjectURL(url),1000);
      setMessage("All graph data exported.");
    } catch { setMessage("Could not export graphs. Browser storage may be unavailable."); }
  }
  async function importLibrary(file: File) {
    try {
      if(file.size>20*1024*1024) throw new Error("Choose a file smaller than 20 MB.");
      const backup=JSON.parse(await file.text());
      if(backup?.format!=="graph-library" || backup.version!==1 || !backup.entries || typeof backup.entries!=="object" || Array.isArray(backup.entries)) throw new Error("Choose an All graphs export file.");
      const entries=Object.entries(backup.entries);
      if(!entries.length) throw new Error("This backup contains no graphs.");
      for(const [key,value] of entries) {
        if(!allowedKey(key)) throw new Error("Unsupported data in the backup.");
        if(key.includes(".list.")) {
          if(!Array.isArray(value) || !value.every(id => typeof id==="string" && /^[a-zA-Z0-9-]+$/.test(id))) throw new Error("Invalid graph list.");
        } else {
          const g=value as Record<string,unknown>;
          const count=key.includes("two-axis")?2:3;
          if(!g || g.version!==1 || !Array.isArray(g.series) || !Array.isArray(g.labels) || g.labels.length!==count+1 || !g.labels.every(v => typeof v==="string") || !Array.isArray(g.showTitles) || g.showTitles.length!==count+1 || !g.showTitles.every(v=>typeof v==="boolean") || !Array.isArray(g.appearance) || g.appearance.length!==g.series.length || !Array.isArray(g.axisSettings) || g.axisSettings.length!==count || !g.fonts) throw new Error("Invalid graph settings.");
          for(const s of g.series) {
            if(!s || typeof s.name!=="string") throw new Error("Invalid series.");
            const datasets=s.datasets ?? [{name:"Material",rows:s.rows}];
            if(!Array.isArray(datasets) || !datasets.length || !datasets.every(d => d && typeof d.name==="string" && Array.isArray(d.rows) && d.rows.length && d.rows.every((r: unknown) => Array.isArray(r) && r.length===count && r.every(v => typeof v==="string")))) throw new Error("Invalid dataset values.");
          }
        }
      }
      if(!window.confirm("Import this backup and replace the graph library saved in this browser?")) return;
      const previous: Record<string,string>={};
      for(let i=0;i<localStorage.length;i++) {const key=localStorage.key(i);if(key && allowedKey(key))previous[key]=localStorage.getItem(key)!;}
      try {
        Object.keys(previous).forEach(key=>localStorage.removeItem(key));
        entries.forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));
      } catch(error) {
        entries.forEach(([key])=>localStorage.removeItem(key));
        Object.entries(previous).forEach(([key,value])=>localStorage.setItem(key,value));
        throw error;
      }
      window.location.reload();
    } catch(error) {setMessage(error instanceof Error ? error.message : "Could not import the backup.");}
  }
  return <div className={styles.saveArea}><div className={styles.transferActions}><button className={styles.saveButton} onClick={exportLibrary}>Export all graphs</button><label className={styles.importButton}>Import all graphs<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void importLibrary(file);e.target.value="";}}/></label></div>{message && <p className={styles.saveStatus} role="status">{message}</p>}</div>;
}
