import styles from "./HomeHeroBridge.module.css";

const ARCH = { start: [20, 220], c1: [90, 70], c2: [270, 70], end: [340, 220] };
const ARCH_PATH = `M${ARCH.start} C ${ARCH.c1}, ${ARCH.c2}, ${ARCH.end}`;
const DECK_Y = ARCH.start[1];

function archPoint(t) {
  const u = 1 - t;
  const axis = (i) =>
    u ** 3 * ARCH.start[i] +
    3 * u ** 2 * t * ARCH.c1[i] +
    3 * u * t ** 2 * ARCH.c2[i] +
    t ** 3 * ARCH.end[i];
  return [axis(0), axis(1)];
}

const HANGERS = Array.from({ length: 9 }, (_, index) => archPoint((index + 1) / 10));

const CATEGORIES = [
  { label: "Government", mark: "GV", className: styles.cardGov },
  { label: "Banking & Finance", mark: "BK", className: styles.cardBank },
  { label: "NGO & Development", mark: "NG", className: styles.cardNgo },
];

/**
 * Decorative five-second homepage hero animation: talent crossing the Daraja
 * ("bridge") to opportunity. Pure CSS, server-rendered, hidden from assistive
 * technology and disabled for visitors who prefer reduced motion.
 */
export default function HomeHeroBridge() {
  return (
    <div className={styles.bridge} aria-hidden="true">
      <svg className={styles.svg} viewBox="0 0 360 260" focusable="false">
        <path className={styles.deck} d={`M${ARCH.start} H${ARCH.end[0]}`} pathLength="1" />
        <path className={styles.arch} d={ARCH_PATH} pathLength="1" />
        <g className={styles.hangers}>
          {HANGERS.map(([x, y], index) => (
            <line
              key={x}
              x1={x}
              x2={x}
              y1={y}
              y2={DECK_Y}
              style={{ animationDelay: `${1 + index * 0.05}s` }}
            />
          ))}
        </g>
        <circle className={`${styles.node} ${styles.nodeStart}`} cx={ARCH.start[0]} cy={DECK_Y} r="7" />
        <circle className={styles.pulse} cx={ARCH.end[0]} cy={DECK_Y} r="7" />
        <circle className={`${styles.node} ${styles.nodeEnd}`} cx={ARCH.end[0]} cy={DECK_Y} r="7" />
        <circle className={`${styles.traveller} ${styles.travellerOne}`} r="5" style={{ offsetPath: `path("${ARCH_PATH}")` }} />
        <circle className={`${styles.traveller} ${styles.travellerTwo}`} r="4" style={{ offsetPath: `path("${ARCH_PATH}")` }} />
      </svg>

      <span className={`${styles.label} ${styles.labelStart}`}>Talent</span>
      <span className={`${styles.label} ${styles.labelEnd}`}>Opportunity</span>

      {CATEGORIES.map((category) => (
        <span key={category.label} className={`${styles.card} ${category.className}`}>
          <b>{category.mark}</b>
          {category.label}
        </span>
      ))}
    </div>
  );
}
