import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "./useReducedMotion.js";

gsap.registerPlugin(ScrollTrigger);

/*
  Section reveals. Anything marked [data-reveal] fades and lifts into place when
  its section arrives; siblings inside the same [data-reveal-scope] stagger.

  Scopes nest: a section is a scope, and a card inside it can be one too. Each
  element is animated by its nearest enclosing scope only, so nothing is tweened
  twice.

  The hiding is done by a class this hook adds, not by a stylesheet rule that is
  always on. If the JavaScript never runs, the class is never added and every
  section is simply visible — the content is not trapped behind an animation.
*/
export function useReveal(rootRef, deps = []) {
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return undefined;

    const scopes = [...root.querySelectorAll("[data-reveal-scope]")];
    const belongsTo = (element, scope) => element.closest("[data-reveal-scope]") === scope;
    const loose = [...root.querySelectorAll("[data-reveal]")].filter(
      (element) => !element.closest("[data-reveal-scope]")
    );
    if (scopes.length === 0 && loose.length === 0) return undefined;

    root.classList.add("reveal-ready");

    const context = gsap.context(() => {
      const reveal = (targets, trigger) => {
        if (targets.length === 0) return;
        gsap.fromTo(
          targets,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.075,
            scrollTrigger: { trigger, start: "top 84%", once: true },
          }
        );
      };

      for (const scope of scopes) {
        const targets = [...scope.querySelectorAll("[data-reveal]")].filter((element) =>
          belongsTo(element, scope)
        );
        reveal(targets, scope);
      }
      reveal(loose, root);
    }, root);

    /* Images and the font swap both change the page height after the triggers are
       measured. One refresh once everything has settled keeps them honest. */
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const timer = window.setTimeout(refresh, 400);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", refresh);
      context.revert();
      root.classList.remove("reveal-ready");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);
}
