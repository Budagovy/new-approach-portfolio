"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "motion/react";
import { EASE, PROJECTS } from "@/lib/motion";

export interface Project {
  title: string;
  description: string;
  tag: string;
  image: string | null;
}

export interface ProjectsData {
  label: { index: string; text: string };
  items: Project[];
}

/** Where the pinned two-column layout can't fit; mirrors the CSS breakpoint. */
const FLOW_QUERY = "(max-width: 859px), (max-height: 699px)";

const entrance: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** One card on the drum: its angle and fade follow the drum's position. */
function DrumCard({ project, i, index }: { project: Project; i: number; index: MotionValue<number> }) {
  const transform = useTransform(index, (v) => {
    const angle = (v - i) * PROJECTS.step;
    return `rotateX(${angle}deg) translateZ(${PROJECTS.radius}px)`;
  });
  /* Full at the front, receding neighbours dimmed, anything two steps away
     nearly gone — the neighbours read as the flattened strips above and
     below, as in the reference. */
  const opacity = useTransform(index, (v) => {
    const d = Math.abs(v - i);
    return d < 1 ? 1 - d * 0.45 : Math.max(0, 0.55 - (d - 1) * 0.45);
  });
  return (
    <motion.div className="projects-card" style={{ transform, opacity }} aria-hidden="true">
      {project.image && <img src={project.image} alt="" />}
    </motion.div>
  );
}

function Copy({ project }: { project: Project }) {
  return (
    <>
      <h3 className="projects-title">{project.title}</h3>
      <p className="projects-desc">{project.description}</p>
      <span className="projects-tag">{project.tag}</span>
    </>
  );
}

/**
 * Pinned drum of project cards. The track is one viewport plus
 * `pinVhPerItem` per project; the stage sticks inside it. Scroll progress
 * picks a project (rounded, so one at a time — the reference steps per
 * wheel tick, this steps per stretch of scroll) and a spring carries the
 * drum there; each card's rotateX/translateZ and fade are read off that
 * one sprung value, so the active card sits flat at the front and its
 * neighbours tilt back above and below. The copy on the left crossfades
 * to the active project. Where two columns can't fit, or under reduced
 * motion, it unpins into a plain list.
 */
export function Projects({ data }: { data: ProjectsData }) {
  const reduce = useReducedMotion();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(FLOW_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const flowing = !!reduce || compact;

  const n = data.items.length;
  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });
  const target = useTransform(scrollYProgress, (v) => Math.round(Math.min(1, Math.max(0, v)) * (n - 1)));
  const index = useSpring(target, PROJECTS.spring);

  const [active, setActive] = useState(0);
  useMotionValueEvent(target, "change", (v) => setActive(v));

  const entered = useInView(stageRef, { once: true, amount: 0.3 });

  return (
    <section
      id="work"
      ref={trackRef}
      className="projects"
      style={{ "--projects-pin": 1 + (n - 1) * PROJECTS.pinVhPerItem } as CSSProperties}
    >
      <div ref={stageRef} className="projects-stage">
        <motion.div
          className="page page-frame projects-body"
          variants={entrance}
          initial="hidden"
          animate={entered ? "shown" : "hidden"}
        >
          <span className="projects-label">
            <span>{data.label.index}</span>
            <span>{data.label.text}</span>
          </span>

          {flowing ? (
            <ol className="projects-list">
              {data.items.map((p) => (
                <motion.li
                  key={p.title}
                  className="projects-item"
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <div className="projects-card projects-card--flat" aria-hidden="true">
                    {p.image && <img src={p.image} alt="" />}
                  </div>
                  <div className="projects-copy">
                    <Copy project={p} />
                  </div>
                </motion.li>
              ))}
            </ol>
          ) : (
            <div className="projects-grid">
              <motion.div className="projects-copy" variants={rise} aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={data.items[active].title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: PROJECTS.copyIn, ease: EASE } }}
                    exit={{ opacity: 0, y: -8, transition: { duration: PROJECTS.copyOut, ease: EASE } }}
                  >
                    <Copy project={data.items[active]} />
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <motion.div className="projects-drum-wrap" variants={rise}>
                <div className="projects-drum">
                  {data.items.map((p, i) => (
                    <DrumCard key={p.title} project={p} i={i} index={index} />
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
