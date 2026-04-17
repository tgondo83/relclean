import { useEffect } from "react";

const BASE_TITLE = "RelClean";

/**
 * Sets the document title for the current page.
 * Resets to the base title on unmount.
 *
 * @param pageTitle — e.g. "Orders" → rendered as "Orders | RelClean"
 */
export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [pageTitle]);
}
