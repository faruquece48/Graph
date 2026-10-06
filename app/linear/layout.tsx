import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./linear.module.css";

export default function LinearLayout({children}:{children:ReactNode}) {
  return <section className={styles.shell}>
    <div className={styles.subnavWrap}><nav className={styles.subnav} aria-label="Linear graph navigation"><span>Linear graph</span><Link href="/linear/two-axis">Two axis</Link><Link href="/linear/three-axis">Three axis</Link></nav></div>
    {children}
  </section>;
}
