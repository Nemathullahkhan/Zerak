import { useCallback, useRef } from "react";

export function useSectionScroll() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setSectionRef = useCallback((key: string) => {
    return (el: HTMLElement | null) => {
      sectionRefs.current[key] = el;
    };
  }, []);

  const scrollToSection = useCallback((key: string) => {
    const el = sectionRefs.current[key];
    if (!el) return;

    const navbarHeight = 56; // h-14 = 56px
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - navbarHeight;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }, []);

  return { setSectionRef, scrollToSection };
}

