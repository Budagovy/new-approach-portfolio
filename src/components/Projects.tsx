"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { EASE } from "@/lib/motion";

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

const list: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/**
 * Selected projects: a plain grid of 2:3 images, title and tag under each,
 * per the Figma frame. Ordinary in-flow section. The only motion is the
 * cards rising in, one after another, the first time they scroll into
 * view; under reduced motion they are simply there.
 */
export function Projects({ data }: { data: ProjectsData }) {
  const reduce = useReducedMotion();

  return (
    <section id="work" className="projects">
      <div className="page page-frame projects-body">
        <span className="projects-label">
          <span>{data.label.index}</span>
          <span>{data.label.text}</span>
        </span>

        <motion.ol
          className="projects-grid"
          variants={list}
          initial={reduce ? "shown" : "hidden"}
          whileInView="shown"
          viewport={{ once: true, amount: 0.2 }}
        >
          {data.items.map((project) => {
            const inner = (
              <>
                <span className="project-media">
                  <img src={project.image} alt={project.title} width={580} height={870} loading="lazy" />
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
