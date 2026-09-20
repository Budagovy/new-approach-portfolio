"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { EASE, PROJECTS } from "@/lib/motion";

export interface Project {
  title: string;
  tag: string;
  image: string;
  href?: string | null;
}

export interface ProjectsData {
  label: { index: string; text: string };
  items: Project[];
}

/* The label fades in as the section enters; the cards then open one after
   another the first time enough of the grid is on screen: a gentle fade
   with a small rise, each starting a beat after the last, so the row
   reads left to right without ever hurrying. Timings in PROJECTS. */
const label: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
};
const list: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.1, staggerChildren: PROJECTS.stagger } },
};
const card: Variants = {
  hidden: { opacity: 0, y: PROJECTS.rise },
  shown: { opacity: 1, y: 0, transition: { duration: PROJECTS.duration, ease: EASE } },
};

/**
 * Selected projects: a plain grid of 2:3 images, title and tag under each,
 * per the Figma frame. Ordinary in-flow section. The only motion is the
 * cards opening one after another the first time they scroll into view;
 * under reduced motion they are simply there.
 */
export function Projects({ data }: { data: ProjectsData }) {
  const reduce = useReducedMotion();

  return (
    <section id="work" className="projects">
      <div className="page page-frame projects-body">
        <motion.span
          className="projects-label"
          variants={label}
          initial={reduce ? "shown" : "hidden"}
          whileInView="shown"
          viewport={{ once: true, amount: 1 }}
        >
          <span>{data.label.index}</span>
          <span>{data.label.text}</span>
        </motion.span>

        <motion.ol
          className="projects-grid"
          variants={list}
          initial={reduce ? "shown" : "hidden"}
          whileInView="shown"
          viewport={{ once: true, amount: PROJECTS.inView }}
        >
          {data.items.map((project) => {
            const inner = (
              <>
                <span className="project-media">
                  <img src={project.image} alt={project.title} width={440} height={660} loading="lazy" />
                </span>
                <span className="project-title">{project.title}</span>
                <span className="project-tag">{project.tag}</span>
              </>
            );
            return (
              <motion.li key={project.title} className="project-item" variants={card}>
                {project.href ? (
                  <a
                    className="project"
                    href={project.href}
                    target={project.href.startsWith("http") ? "_blank" : undefined}
                    rel={project.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="project">{inner}</div>
                )}
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
