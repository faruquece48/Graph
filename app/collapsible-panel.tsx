"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./plot.module.css";

export default function CollapsiblePanel({ title, header, children }: { title: string; header: ReactNode; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  return <section className={`${styles.panel} ${styles.collapsiblePanel} ${expanded ? "" : styles.collapsedPanel}`}>
    {header}
    <button type="button" className={styles.panelToggle} aria-label={`${expanded ? "Minimize" : "Expand"} ${title}`} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>{expanded ? "Minimize −" : "Expand +"}</button>
    <div id={id} hidden={!expanded}>{children}</div>
  </section>;
}
