"use client";

import { useEffect, useState } from "react";

export function Preloader() {
  const [hidden, setHidden] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setHidden(true);
    }, 800);

    const unmountTimer = setTimeout(() => {
      setUnmounted(true);
    }, 1300); // 800ms + 500ms for fade-out transition

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (unmounted) return null;

  return (
    <div className={`preloader${hidden ? " hidden" : ""}`}>
      <div className="preloader-spinner" />
    </div>
  );
}
