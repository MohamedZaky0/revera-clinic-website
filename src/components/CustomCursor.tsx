"use client";

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const onMouseMove = (e: MouseEvent) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    };

    const isH1 = (element: Element | null) => Boolean(element && element.closest("h1"));
    const isH2 = (element: Element | null) => Boolean(element && element.closest("h2"));

    const isClickable = (element: Element | null) =>
      Boolean(
        element &&
          element.closest(
            "a, button, input, textarea, select, label, summary, [role='button'], [role='link'], [tabindex]:not([tabindex='-1'])"
          )
      );

    const shouldGrow = (element: Element | null) =>
      Boolean(isH1(element) || isH2(element) || isClickable(element));

    const updateCursorState = (element: Element | null) => {
      const grow = shouldGrow(element);
      const xray = isH2(element);
      const mirror = isH1(element);
      cursor.classList.toggle("cursor-grow", grow);
      cursor.classList.toggle("cursor-xray", xray);
      cursor.classList.toggle("cursor-mirror", mirror);
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      updateCursorState(target);
    };

    const onMouseOut = (e: MouseEvent) => {
      const relatedTarget = (e as MouseEvent & { relatedTarget: EventTarget | null }).relatedTarget;
      const relatedElement = relatedTarget instanceof Element ? relatedTarget : null;
      updateCursorState(relatedElement);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, []);

  return <div ref={cursorRef} className="cb-cursor" aria-hidden />;
}
