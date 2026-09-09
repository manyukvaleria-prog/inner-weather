import { useEffect, useState } from "react";
import {
  FALLBACK_PALETTE,
  sampleCover,
  type CoverPalette,
} from "./coverPalette";

export function useCoverPalette(url: string | null): CoverPalette {
  const [palette, setPalette] = useState<CoverPalette>(FALLBACK_PALETTE);

  useEffect(() => {
    if (!url) {
      setPalette(FALLBACK_PALETTE);
      return;
    }
    let live = true;
    void sampleCover(url).then((next) => {
      if (live) setPalette(next);
    });
    return () => {
      live = false;
    };
  }, [url]);

  return palette;
}
