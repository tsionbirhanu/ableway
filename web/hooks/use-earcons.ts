"use client";

import { useCallback } from "react";
import { earcons } from "@/lib/audio/earcons";
import { EarconType } from "@/types/voice";

export function useEarcons() {
  const play = useCallback((type: EarconType) => {
    earcons.play(type);
  }, []);

  return { play };
}
