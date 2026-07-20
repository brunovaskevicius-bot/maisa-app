"use client";
import { useEffect, useState } from "react";

/** Detecta viewport mobile (≤900px, o mesmo breakpoint do shell).
 *  Retorna false no SSR/primeiro render e sincroniza após o mount.
 *  Use para telas que precisam de um layout mobile próprio (não só single-column). */
export function useIsMobile(query = "(max-width: 900px)"): boolean {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setIs(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return is;
}
