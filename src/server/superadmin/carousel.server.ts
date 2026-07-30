import { eq, asc } from "drizzle-orm";
import { getDb } from "../db/client";
import { carouselSlides, type CarouselSlide } from "../db/schema";
import { newId } from "../session";
import { writeAuditLog } from "../admin/audit.server";
import { requirePermission } from "../auth/rbac.server";

export type CreateCarouselSlideInput = {
  badge?: string;
  title: string;
  headline: string;
  sub?: string;
  cta?: string;
  linkUrl?: string;
  imageUrl: string;
  sortOrder?: number;
  enabled?: "yes" | "no";
};

export type UpdateCarouselSlideInput = {
  id: string;
  badge?: string;
  title?: string;
  headline?: string;
  sub?: string;
  cta?: string;
  linkUrl?: string;
  imageUrl?: string;
  sortOrder?: number;
  enabled?: "yes" | "no";
};

export async function listCarouselSlides(opts?: { includeDisabled?: boolean }): Promise<CarouselSlide[]> {
  const db = getDb();
  const includeDisabled = opts?.includeDisabled ?? false;

  const query = includeDisabled
    ? db.select().from(carouselSlides).orderBy(asc(carouselSlides.sortOrder))
    : db
        .select()
        .from(carouselSlides)
        .where(eq(carouselSlides.enabled, "yes"))
        .orderBy(asc(carouselSlides.sortOrder));

  return query;
}

export async function createCarouselSlide(input: CreateCarouselSlideInput): Promise<CarouselSlide> {
  const actor = await requirePermission("PROMOTION_MANAGE");
  const db = getDb();
  const id = newId();

  const newSlide = {
    id,
    badge: input.badge?.trim() || "Promo",
    title: input.title.trim(),
    headline: input.headline.trim(),
    sub: input.sub?.trim() || null,
    cta: input.cta?.trim() || "Claim Now",
    linkUrl: input.linkUrl?.trim() || null,
    imageUrl: input.imageUrl.trim(),
    sortOrder: input.sortOrder ?? 0,
    enabled: input.enabled ?? "yes",
  };

  await db.insert(carouselSlides).values(newSlide);

  await writeAuditLog({
    actor,
    action: "carousel.create",
    summary: `Created carousel slide '${newSlide.title}'`,
    targetType: "carousel_slide",
    targetId: id,
    meta: { title: newSlide.title, imageUrl: newSlide.imageUrl },
  });

  const [created] = await db.select().from(carouselSlides).where(eq(carouselSlides.id, id)).limit(1);
  return created!;
}

export async function updateCarouselSlide(input: UpdateCarouselSlideInput): Promise<CarouselSlide> {
  const actor = await requirePermission("PROMOTION_MANAGE");
  const db = getDb();

  const [existing] = await db.select().from(carouselSlides).where(eq(carouselSlides.id, input.id)).limit(1);
  if (!existing) {
    throw new Error("Carousel slide not found");
  }

  const updates: Partial<CarouselSlide> = {};
  if (input.badge !== undefined) updates.badge = input.badge.trim() || "Promo";
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.headline !== undefined) updates.headline = input.headline.trim();
  if (input.sub !== undefined) updates.sub = input.sub.trim() || null;
  if (input.cta !== undefined) updates.cta = input.cta.trim() || "Claim Now";
  if (input.linkUrl !== undefined) updates.linkUrl = input.linkUrl.trim() || null;
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl.trim();
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.enabled !== undefined) updates.enabled = input.enabled;

  await db.update(carouselSlides).set(updates).where(eq(carouselSlides.id, input.id));

  await writeAuditLog({
    actor,
    action: "carousel.update",
    summary: `Updated carousel slide '${existing.title}'`,
    targetType: "carousel_slide",
    targetId: input.id,
    meta: { updates },
  });

  const [updated] = await db.select().from(carouselSlides).where(eq(carouselSlides.id, input.id)).limit(1);
  return updated!;
}

export async function deleteCarouselSlide(id: string): Promise<{ ok: boolean; id: string }> {
  const actor = await requirePermission("PROMOTION_MANAGE");
  const db = getDb();

  const [existing] = await db.select().from(carouselSlides).where(eq(carouselSlides.id, id)).limit(1);
  if (!existing) {
    throw new Error("Carousel slide not found");
  }

  await db.delete(carouselSlides).where(eq(carouselSlides.id, id));

  await writeAuditLog({
    actor,
    action: "carousel.delete",
    summary: `Deleted carousel slide '${existing.title}'`,
    targetType: "carousel_slide",
    targetId: id,
  });

  return { ok: true, id };
}

export async function reorderCarouselSlides(items: { id: string; sortOrder: number }[]): Promise<{ ok: boolean }> {
  const actor = await requirePermission("PROMOTION_MANAGE");
  const db = getDb();

  for (const item of items) {
    await db.update(carouselSlides).set({ sortOrder: item.sortOrder }).where(eq(carouselSlides.id, item.id));
  }

  await writeAuditLog({
    actor,
    action: "carousel.reorder",
    summary: `Reordered ${items.length} carousel slides`,
    targetType: "carousel_slide",
    targetId: "batch",
    meta: { itemCount: items.length },
  });

  return { ok: true };
}
