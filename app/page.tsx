import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return <div className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.eyebrow}>Scientific plotting workspace</div>
      <h1>Turn experimental data into publication-ready graphs.</h1>
      <p>Build precise linear plots, compare materials, control every axis, and export clean figures directly from your browser.</p>
      <div className={styles.actions}><Link className={styles.primary} href="/linear/two-axis">Create a linear graph</Link><Link className={styles.secondary} href="/linear/three-axis">Open three-axis tools</Link></div>
    </section>
    <section className={styles.graphChoices} aria-labelledby="graph-types">
      <div className={styles.sectionIntro}><span>Graph library</span><h2 id="graph-types">Choose a plotting format</h2></div>
      <div className={styles.cards}>
        <Link className={styles.choiceCard} href="/linear/two-axis"><div className={styles.cardIcon}><svg viewBox="0 0 64 48" aria-hidden="true"><path d="M5 3v40h54" fill="none"/><path d="m9 36 14-13 12 5 19-18" fill="none"/><circle cx="23" cy="23" r="2.5"/><circle cx="35" cy="28" r="2.5"/><circle cx="54" cy="10" r="2.5"/></svg></div><div><span className={styles.cardLabel}>Linear graph</span><h3>Two-axis plot</h3><p>Compare series and materials on one horizontal and one vertical scale.</p></div><span className={styles.arrow}>Open tool &#8594;</span></Link>
        <Link className={styles.choiceCard} href="/linear/three-axis"><div className={styles.cardIcon}><svg viewBox="0 0 64 48" aria-hidden="true"><path d="M5 3v40h54M59 3v40" fill="none"/><path d="m9 35 14-12 12 4 19-17" fill="none"/><path d="m9 39 14-6 12-10 19-5" fill="none" strokeDasharray="4 3"/></svg></div><div><span className={styles.cardLabel}>Linear graph</span><h3>Three-axis plot</h3><p>Plot one X scale with separate left and right Y-axis measurements.</p></div><span className={styles.arrow}>Open tool &#8594;</span></Link>
      </div>
    </section>
    <section className={styles.features}><div><strong>Independent datasets</strong><span>Organize multiple materials under every series.</span></div><div><strong>Precise controls</strong><span>Set axes, legends, symbols, colors, and typography.</span></div><div><strong>Browser-first workflow</strong><span>Save locally and export PNG, JPG, or SVG files.</span></div></section>
  </div>;
}
