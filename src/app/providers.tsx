"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** OS의 '동작 줄이기' 설정을 framer-motion 전체에 적용 */
export default function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
