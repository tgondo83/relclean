import { useState, useEffect } from "react";

export const LOGO_KEY = "companyLogo";

/**
 * Reads and writes the company logo (base64 data URL) from localStorage.
 * Any component using this hook will re-render automatically when the logo
 * is updated anywhere in the app thanks to the "logo:updated" custom event.
 */
export const useLogo = () => {
  const [logo, setLogoState] = useState<string>(
    () => localStorage.getItem(LOGO_KEY) || ""
  );

  useEffect(() => {
    const sync = () => setLogoState(localStorage.getItem(LOGO_KEY) || "");
    window.addEventListener("logo:updated", sync);
    return () => window.removeEventListener("logo:updated", sync);
  }, []);

  const saveLogo = (dataUrl: string) => {
    localStorage.setItem(LOGO_KEY, dataUrl);
    setLogoState(dataUrl);
    window.dispatchEvent(new CustomEvent("logo:updated"));
  };

  const removeLogo = () => {
    localStorage.removeItem(LOGO_KEY);
    setLogoState("");
    window.dispatchEvent(new CustomEvent("logo:updated"));
  };

  return { logo, saveLogo, removeLogo };
};
