import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listCarouselSlidesFn = createServerFn({ method: "POST" })
  .validator(z.object({ includeDisabled: z.boolean().optional() }).optional())
  .handler(async ({ data }) => {
    const { listCarouselSlides } = await import("../server/superadmin/carousel.server");
    return listCarouselSlides(data);
  });

const createSlideSchema = z.object({
  badge: z.string().max(64).optional(),
  title: z.string().min(1).max(128),
  headline: z.string().min(1).max(128),
  sub: z.string().max(255).optional(),
  cta: z.string().max(64).optional(),
  linkUrl: z.string().max(512).optional(),
  imageUrl: z.string().min(1).max(512),
  sortOrder: z.number().int().optional(),
  enabled: z.enum(["yes", "no"]).optional(),
});

export const createCarouselSlideFn = createServerFn({ method: "POST" })
  .validator(createSlideSchema)
  .handler(async ({ data }) => {
    const { createCarouselSlide } = await import("../server/superadmin/carousel.server");
    return createCarouselSlide(data);
  });

const updateSlideSchema = z.object({
  id: z.string().uuid(),
  badge: z.string().max(64).optional(),
  title: z.string().min(1).max(128).optional(),
  headline: z.string().min(1).max(128).optional(),
  sub: z.string().max(255).optional(),
  cta: z.string().max(64).optional(),
  linkUrl: z.string().max(512).optional(),
  imageUrl: z.string().min(1).max(512).optional(),
  sortOrder: z.number().int().optional(),
  enabled: z.enum(["yes", "no"]).optional(),
});

export const updateCarouselSlideFn = createServerFn({ method: "POST" })
  .validator(updateSlideSchema)
  .handler(async ({ data }) => {
    const { updateCarouselSlide } = await import("../server/superadmin/carousel.server");
    return updateCarouselSlide(data);
  });

export const deleteCarouselSlideFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { deleteCarouselSlide } = await import("../server/superadmin/carousel.server");
    return deleteCarouselSlide(data.id);
  });

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
});

export const reorderCarouselSlidesFn = createServerFn({ method: "POST" })
  .validator(reorderSchema)
  .handler(async ({ data }) => {
    const { reorderCarouselSlides } = await import("../server/superadmin/carousel.server");
    return reorderCarouselSlides(data.items);
  });
