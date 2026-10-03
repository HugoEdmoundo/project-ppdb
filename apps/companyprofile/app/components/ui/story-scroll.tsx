'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(' ');
}

export interface FlowSectionProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'aria-label'?: string;
}

export const FlowSection: React.FC<FlowSectionProps> = ({
  className,
  style = {},
  children,
  'aria-label': ariaLabel,
}) => (
  <section
    data-flow-section
    aria-label={ariaLabel}
    className={cx('sticky top-0 h-screen w-full overflow-hidden', className)}
  >
    <div
      data-flow-inner
      className={cx(
        'flow-art-container relative flex h-screen w-full flex-col justify-between gap-6 px-[4vw] pt-[clamp(2rem,8vw,4vw)] pb-[4vw]',
        'will-change-transform',
      )}
      style={{ transformOrigin: 'bottom left', ...style }}
    >
      {children}
    </div>
  </section>
);

export interface FlowArtProps {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const childCount = (children: React.ReactNode) => React.Children.count(children);

const FlowArt: React.FC<FlowArtProps> = ({
  children,
  className,
  'aria-label': ariaLabel = 'Story scroll',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useGSAP(
    () => {
      if (!containerRef.current || reducedMotion) return;

      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>('[data-flow-section]'),
      );
      if (sections.length === 0) return;

      const triggers: ScrollTrigger[] = [];

      // Assign z-index so cards visually stack (later = higher)
      sections.forEach((section, i) => {
        gsap.set(section, { zIndex: i + 1 });
      });

      sections.forEach((section, i) => {
        const inner = section.querySelector<HTMLElement>('.flow-art-container');
        if (!inner) return;

        // Cards 2, 3, 4 … start tilted and rotate flush as they enter
        if (i > 0) {
          gsap.set(inner, { rotation: 25, transformOrigin: 'bottom left' });
          const tween = gsap.to(inner, {
            rotation: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',  // animation starts when card enters viewport from bottom
              end: 'top top',       // finishes when card is fully covering the screen
              scrub: 1.2,           // slight lag makes it feel physical/natural
            },
          });
          if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
        }

        // Each card (except the last) is pinned in place until the container's
        // bottom hits the bottom of the viewport. This keeps them stacked in 
        // the background so they reveal correctly when scrolling back up.
        if (i < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: 'top top',         // pin when this card hits the top
              endTrigger: containerRef.current,
              end: 'bottom bottom',     // unpin only when the entire container finishes
              pin: true,
              pinSpacing: false,
              anticipatePin: 1,         // prevents scroll jump / jank on fast scroll
            }),
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((t) => t.kill());
      };
    },
    { scope: containerRef, dependencies: [childCount(children), reducedMotion] },
  );

  return (
    <main
      ref={containerRef}
      aria-label={ariaLabel}
      className={cx('w-full overflow-x-hidden', className)}
    >
      {children}
    </main>
  );
};

export default FlowArt;
