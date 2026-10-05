"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./plot.module.css";

const themes = [
  ["#ffffff", "#f2f2f2", "#d9d9d9", "#bfbfbf", "#a6a6a6", "#808080"],
  ["#000000", "#808080", "#595959", "#404040", "#262626", "#0d0d0d"],
  ["#e7e6e6", "#d0cece", "#aeaaaa", "#757171", "#3b3838", "#181717"],
  ["#44546a", "#d6dce4", "#adb9ca", "#8497b0", "#323f4f", "#222a35"],
  ["#5b9bd5", "#deebf7", "#bdd7ee", "#9dc3e6", "#2f75b5", "#1f4e78"],
  ["#ed7d31", "#fce4d6", "#f8cbad", "#f4b183", "#c55a11", "#843c0c"],
  ["#a5a5a5", "#ededed", "#dbdbdb", "#c9c9c9", "#7b7b7b", "#525252"],
  ["#ffc000", "#fff2cc", "#ffe699", "#ffd966", "#bf9000", "#7f6000"],
  ["#4472c4", "#d9e2f3", "#b4c6e7", "#8ea9db", "#305496", "#203864"],
  ["#70ad47", "#e2efda", "#c6e0b4", "#a9d18e", "#548235", "#375623"],
];
const standard = ["#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"];

export default function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  function swatch(color: string, key: string) {
    return <button key={key} type="button" className={styles.swatch} style={{ backgroundColor: color }} aria-label={`${label}: ${color}`} title={color} aria-pressed={value.toLowerCase() === color} onClick={() => { onChange(color); setOpen(false); }} />;
  }
  return <div ref={pickerRef} className={styles.colorPicker} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
    <button type="button" className={styles.colorTrigger} aria-expanded={open} onClick={() => setOpen(!open)}><span>{label}</span><span className={styles.colorPreview} style={{ backgroundColor: value }}/><span aria-hidden="true">▾</span></button>
    {open && <div className={styles.palette} role="group" aria-label={`${label} palette`}>
      <strong>Theme Colors</strong>
      <div className={styles.themeColors}>{themes.map((column,i) => <div key={i}>{column.map((color,j) => swatch(color, `${i}-${j}`))}</div>)}</div>
      <strong>Standard Colors</strong><div className={styles.standardColors}>{standard.map(color => swatch(color,color))}</div>
      <label className={styles.customColor}>More colors<input type="color" value={value} onChange={e => onChange(e.target.value)}/></label>
    </div>}
  </div>;
}
