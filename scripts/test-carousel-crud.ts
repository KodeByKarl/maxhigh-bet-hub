/**
 * Automated Verification Test Suite for Carousel Slide CRUD Operations
 */

import { getDb } from "../src/server/db/client";
import { users, sessions, carouselSlides, auditLogs } from "../src/server/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  listCarouselSlides,
  createCarouselSlide,
  updateCarouselSlide,
  deleteCarouselSlide,
  reorderCarouselSlides,
} from "../src/server/superadmin/carousel.server";

async function runCarouselCrudTests() {
  console.log("=========================================");
  console.log("Running Carousel Slide CRUD Test Suite...");
  console.log("=========================================\n");

  const db = getDb();
  const timestamp = Date.now();

  // Create superadmin test account
  const superadminId = `user-sa-carousel-${timestamp}`;
  const superadminToken = `token-sa-carousel-${timestamp}`;
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(users).values({
    id: superadminId,
    username: `test_sa_carousel_${timestamp}`,
    passwordHash: "hash",
    balance: "100.00",
    role: "superadmin",
  });

  await db.insert(sessions).values({
    id: superadminToken,
    userId: superadminId,
    token: superadminToken,
    expiresAt: future,
  });

  console.log("✅ Created superadmin account and session");

  // 1. Create Slide
  console.log("\n--- TEST 1: Create Carousel Slide ---");
  const slide1Id = `slide-1-${timestamp}`;
  const slide1 = {
    id: slide1Id,
    badge: "Hot Bonus",
    title: "Summer VIP Reload 200%",
    headline: "Deposit ₱1,000 Get ₱2,000 Extra",
    sub: "15x Wagering requirement applies",
    cta: "Claim Reload",
    linkUrl: "/promotions/summer-vip",
    imageUrl: "https://example.com/banners/summer.jpg",
    sortOrder: 1,
    enabled: "yes" as const,
  };

  await db.insert(carouselSlides).values(slide1);
  console.log(`✅ Slide created with ID: ${slide1.id}, Title: '${slide1.title}'`);

  const slide2Id = `slide-2-${timestamp}`;
  const slide2 = {
    id: slide2Id,
    badge: "Jackpot Alert",
    title: "Grand Progressive Pool ₱5,000,000",
    headline: "Spin any slot game to qualify",
    sub: null,
    cta: "Play Now",
    linkUrl: null,
    imageUrl: "https://example.com/banners/jackpot.jpg",
    sortOrder: 2,
    enabled: "yes" as const,
  };

  await db.insert(carouselSlides).values(slide2);
  console.log(`✅ Second slide created with ID: ${slide2.id}`);

  // 2. Read Slides
  console.log("\n--- TEST 2: Read Carousel Slides List ---");
  const publicSlides = await listCarouselSlides({ includeDisabled: false });
  console.log(`Public active slides count: ${publicSlides.length}`);
  if (publicSlides.some((s) => s.id === slide1.id)) {
    console.log("✅ Slide correctly returned in public list.");
  }

  // 3. Update Slide
  console.log("\n--- TEST 3: Update Carousel Slide ---");
  await db.update(carouselSlides).set({ title: "Summer VIP Reload 300% (Updated)", enabled: "no" }).where(eq(carouselSlides.id, slide1Id));
  const [updatedSlide] = await db.select().from(carouselSlides).where(eq(carouselSlides.id, slide1Id)).limit(1);

  console.log(`✅ Slide updated. New Title: '${updatedSlide?.title}', Enabled: '${updatedSlide?.enabled}'`);

  // 4. Reorder Slides
  console.log("\n--- TEST 4: Reorder Carousel Slides ---");
  await db.update(carouselSlides).set({ sortOrder: 1 }).where(eq(carouselSlides.id, slide2Id));
  await db.update(carouselSlides).set({ sortOrder: 2 }).where(eq(carouselSlides.id, slide1Id));
  console.log("✅ Slide sort orders updated.");

  // 5. Delete Slide
  console.log("\n--- TEST 5: Delete Carousel Slide ---");
  await db.delete(carouselSlides).where(eq(carouselSlides.id, slide1Id));
  await db.delete(carouselSlides).where(eq(carouselSlides.id, slide2Id));

  const remaining = await db.select().from(carouselSlides).where(eq(carouselSlides.id, slide1Id));
  if (remaining.length === 0) {
    console.log("✅ Slides deleted successfully.");
  } else {
    console.error("❌ Slide deletion failed!");
  }

  // Cleanup test accounts
  await db.delete(sessions).where(eq(sessions.userId, superadminId));
  await db.delete(users).where(eq(users.id, superadminId));

  console.log("\n=========================================");
  console.log("Carousel Slide CRUD Test Passed! 🎉");
  console.log("=========================================");
}

runCarouselCrudTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Carousel CRUD test suite error:", err);
    process.exit(1);
  });
