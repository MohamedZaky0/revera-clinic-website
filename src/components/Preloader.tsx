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
      <div className="preloader-inner" aria-hidden={hidden}>
        <svg className="arc arc1" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="110" cy="110" r="90" strokeWidth="3" strokeDasharray="280 400" transform="rotate(-20 110 110)" />
        </svg>
        <svg className="arc arc2" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="60" strokeWidth="2" strokeDasharray="160 400" transform="rotate(10 80 80)" />
        </svg>
        <img src="/images/main_logo.png" alt="logo" className="preloader-logo" />
      </div>
    </div>
  );
}
