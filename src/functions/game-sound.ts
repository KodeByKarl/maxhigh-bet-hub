/** Client-safe RPC for the general game sound setting. Writes are Super Admin only (enforced server-side). */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { operationIdentity } from "@/lib/operation-identity";

export const getGameSoundSettingFn = createServerFn({ method: "GET" }).handler(async () => {
  const { readGameSoundSetting } = await import("../server/game-sound.server");
  return readGameSoundSetting();
});

const saveSchema = z.object({
  volumePercent: z.number().int().min(0).max(100),
  muted: z.boolean(),
});

export const superSaveGameSoundSettingFn = createServerFn({ method: "POST" })
  .middleware([operationIdentity])
  .validator(saveSchema)
  .handler(async ({ data }) => {
    const { saveGameSoundSetting } = await import("../server/game-sound.server");
    return saveGameSoundSetting(data);
  });
