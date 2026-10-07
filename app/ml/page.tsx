import Link from "next/link";
import styles from "./ml.module.css";

const capabilities = [
  { title: "Prepare datasets", description: "Organize experimental measurements before training and comparison." },
  { title: "Build models", description: "Create regression workflows for engineering and scientific data." },
  { title: "Evaluate results", description: "Compare predictions, errors, and observed values through clear plots." },
];

export default function MachineLearningPage() {
  return <div className={styles.page}>
    <section className={styles.hero}>
      <span className={styles.eyebrow}>Machine learning</span>
      <h1>Explore data-driven engineering workflows.</h1>
      <p>Prepare datasets, develop predictive models, and turn model output into clear scientific visualizations.</p>
      <div className={styles.actions}><Link className={styles.primary} href="/linear/two-axis">Open plotting tools</Link><Link className={styles.secondary} href="/">Back to home</Link></div>
    </section>
    <section className={styles.capabilities} aria-labelledby="ml-capabilities">
      <div className={styles.sectionIntro}><span>ML workspace</span><h2 id="ml-capabilities">A foundation for model-based analysis</h2></div>
      <div className={styles.cards}>{capabilities.map((capability,index) => <article key={capability.title}><span className={styles.number}>0{index+1}</span><h3>{capability.title}</h3><p>{capability.description}</p></article>)}</div>
    </section>
  </div>;
}