"use client";
import React, { useEffect, useState, useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

// Array konstanta di level modul: `useTransform` membuat ulang MotionValue-nya
// ketika input berupa array/objek baru, jadi scaleDimensions() yang mengembalikan
// array fresh tiap render membuat transform melompat tiap render.
const SCALE_MOBILE: [number, number] = [0.7, 0.9];
const SCALE_DESKTOP: [number, number] = [1.05, 1];

const MOBILE_QUERY = "(max-width: 768px)";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Offset default `["start start", "end end"]`: progress 1 tercapai saat bagian
    // bawah container sejajar dengan bagian bawah viewport — selalu terjangkau
    // sebelum footer. Offset yang "lebih pendek" (mis. "end start") justru
    // membuat progress tidak pernah sampai 1 karena footer terlalu pendek.
    offset: ["start start", "end end"],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Lazy inicial dari matchMedia, bukan state default `false`, supaya first
    // paint langsung memakai skala yang benar di perangkat mobile.
    const mq = window.matchMedia(MOBILE_QUERY);
    const checkMobile = () => setIsMobile(mq.matches);
    checkMobile();
    mq.addEventListener("change", checkMobile);
    return () => {
      mq.removeEventListener("change", checkMobile);
    };
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    isMobile ? SCALE_MOBILE : SCALE_DESKTOP,
  );
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[50rem] md:h-[72rem] flex items-center justify-center relative p-2 md:p-20"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-20 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-12 mx-auto h-[28rem] md:h-[36rem] w-full border-4 border-[var(--color-slate)] p-2 md:p-6 bg-[var(--color-obsidian)] rounded-[30px] shadow-2xl"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-[var(--bg-elevated)] p-2 md:p-4">
        {children}
      </div>
    </motion.div>
  );
};
