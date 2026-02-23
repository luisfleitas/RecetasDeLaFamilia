/* Seed users and recipes with explicit ownership for MVP auth. */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");
const { copyFile, mkdir } = require("node:fs/promises");
const { dirname, join } = require("node:path");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });
const uploadsRoot = process.env.IMAGE_STORAGE_LOCAL_ROOT
  ? join(process.cwd(), process.env.IMAGE_STORAGE_LOCAL_ROOT)
  : join(process.cwd(), "uploads");

async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

function makeKeyForRecipe(newRecipeId, keyTemplate) {
  return keyTemplate.replace(/^recipes\/\d+\//, `recipes/${newRecipeId}/`);
}

async function copyImageAsset(sourceKey, targetKey) {
  const sourcePath = join(uploadsRoot, sourceKey);
  const targetPath = join(uploadsRoot, targetKey);

  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
}

async function createRecipeWithSeededImages(createdByUserId, recipeSeed) {
  const recipe = await prisma.recipe.create({
    data: {
      title: recipeSeed.title,
      description: recipeSeed.description,
      stepsMarkdown: recipeSeed.stepsMarkdown,
      createdByUserId,
      ingredients: {
        create: recipeSeed.ingredients,
      },
    },
  });

  for (const image of recipeSeed.images) {
    const storageKey = makeKeyForRecipe(recipe.id, image.storageKeyTemplate);
    const thumbnailKey = makeKeyForRecipe(recipe.id, image.thumbnailKeyTemplate);

    await copyImageAsset(image.storageKeyTemplate, storageKey);
    await copyImageAsset(image.thumbnailKeyTemplate, thumbnailKey);

    await prisma.recipeImage.create({
      data: {
        recipeId: recipe.id,
        storageKey,
        thumbnailKey,
        originalFilename: image.originalFilename,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        width: image.width,
        height: image.height,
        position: image.position,
        isPrimary: image.isPrimary,
      },
    });
  }
}

async function main() {
  const [alicePasswordHash, bobPasswordHash] = await Promise.all([
    hashPassword("Password123!"),
    hashPassword("Password123!"),
  ]);

  await prisma.ingredient.deleteMany();
  await prisma.recipeImage.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        not: "legacy-owner@example.local",
      },
    },
  });

  const alice = await prisma.user.upsert({
    where: { username: "alice" },
    update: {
      firstName: "Alice",
      lastName: "Baker",
      email: "alice@example.com",
      passwordHash: alicePasswordHash,
    },
    create: {
      firstName: "Alice",
      lastName: "Baker",
      email: "alice@example.com",
      username: "alice",
      passwordHash: alicePasswordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { username: "bob" },
    update: {
      firstName: "Bob",
      lastName: "Cook",
      email: "bob@example.com",
      passwordHash: bobPasswordHash,
    },
    create: {
      firstName: "Bob",
      lastName: "Cook",
      email: "bob@example.com",
      username: "bob",
      passwordHash: bobPasswordHash,
    },
  });

  await prisma.recipe.create({
    data: {
      title: "Simple Tomato Pasta",
      description: "A quick weekday pasta.",
      stepsMarkdown: "1. Boil pasta.\n2. Heat sauce.\n3. Toss and serve.",
      createdByUserId: alice.id,
      ingredients: {
        create: [
          { name: "Pasta", qtyNum: 200, qtyDen: 1, unit: "g", position: 1, notes: null },
          { name: "Tomato sauce", qtyNum: 1, qtyDen: 1, unit: "cup", position: 2, notes: null },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      title: "Basic Pancakes",
      description: "Fluffy pancakes.",
      stepsMarkdown: "1. Mix ingredients.\n2. Cook on skillet.\n3. Flip once and serve.",
      createdByUserId: bob.id,
      ingredients: {
        create: [
          { name: "Flour", qtyNum: 1, qtyDen: 1, unit: "cup", position: 1, notes: null },
          { name: "Milk", qtyNum: 3, qtyDen: 4, unit: "cup", position: 2, notes: null },
        ],
      },
    },
  });

  const seededRecipeImages = [
    {
      title: "Beef Stir Fry",
      description: "Smoke test",
      stepsMarkdown: "Step 1",
      ingredients: [
        { name: "Salt", qtyNum: 1, qtyDen: 1, unit: "tsp", notes: null, position: 1 },
      ],
      images: [
        {
          storageKeyTemplate: "recipes/12/img_a10e70da-0e9a-4a1e-a6d6-450a9803a920.jpg",
          thumbnailKeyTemplate: "recipes/12/thumb_a10e70da-0e9a-4a1e-a6d6-450a9803a920.jpg",
          originalFilename:
            "hKV0nSHt5sJlLqFzWmNQUBmKsAOh73GiRRNvEBwvZHTkSAUhVi8FvnfdRSQXcdez2ibEH7uYlVpXKpN7aSHxIJB5Sgo2CLWjdQ7PDjdYWh4.jpeg",
          mimeType: "image/jpeg",
          sizeBytes: 642616,
          width: 1200,
          height: 800,
          position: 1,
          isPrimary: true,
        },
        {
          storageKeyTemplate: "recipes/12/img_e2f370d3-6c9a-436c-abdd-52e690dc21c6.jpg",
          thumbnailKeyTemplate: "recipes/12/thumb_e2f370d3-6c9a-436c-abdd-52e690dc21c6.jpg",
          originalFilename:
            "K_q7BjJEGfhQ1SR6ykV0dWmUZhKkp6837sQIbQCS8LkiOdP4ZZM8R0bAPPztWMnfd4-k43zL4y-OLyWE1hgPnSDt3eKmcY2F1VSdBF8oZFk.jpeg",
          mimeType: "image/jpeg",
          sizeBytes: 981095,
          width: 1200,
          height: 800,
          position: 2,
          isPrimary: false,
        },
        {
          storageKeyTemplate: "recipes/12/img_db13e226-f549-42e1-a203-e6963f7a310d.jpg",
          thumbnailKeyTemplate: "recipes/12/thumb_db13e226-f549-42e1-a203-e6963f7a310d.jpg",
          originalFilename:
            "JaYLKobqhqTwR52Xm7ZtlzB3Ww6YpoCwJkwx-qz882h3JLAWic6lJFnG8xhe-lISCwhvQy0bMrSli-IfHJ2HZFDA7gQvlRN2ZDXT8Xyh3KI.jpeg",
          mimeType: "image/jpeg",
          sizeBytes: 1295113,
          width: 1200,
          height: 800,
          position: 3,
          isPrimary: false,
        },
      ],
    },
    {
      title: "Spighetti bolognese",
      description: "Smoke test updated",
      stepsMarkdown: "Step 1 updated",
      ingredients: [
        { name: "Salt", qtyNum: 2, qtyDen: 1, unit: "tsp", notes: null, position: 1 },
        { name: "Ground Meat", qtyNum: 1, qtyDen: 1, unit: "pound", notes: null, position: 2 },
      ],
      images: [
        {
          storageKeyTemplate: "recipes/13/img_812713df-fbbf-499f-9562-6acbf7034e7e.jpg",
          thumbnailKeyTemplate: "recipes/13/thumb_812713df-fbbf-499f-9562-6acbf7034e7e.jpg",
          originalFilename:
            "K76_5uzSMM3nMhbKgCQKFpRUcpIk9PThTP_95uweZnMEpI4vGqyTnmJHGx3lXhN9-krkqXPy6IUMjlL_u_HJ_DTLyy00aymX4wAyMB9CTII.jpeg",
          mimeType: "image/jpeg",
          sizeBytes: 466582,
          width: 1200,
          height: 800,
          position: 1,
          isPrimary: true,
        },
        {
          storageKeyTemplate: "recipes/13/img_b2aab601-990d-4e77-acfc-b92d07831f44.jpg",
          thumbnailKeyTemplate: "recipes/13/thumb_b2aab601-990d-4e77-acfc-b92d07831f44.jpg",
          originalFilename:
            "MAC2312_overhead_newhybridbolognese_a672b598-9bcb-480a-acc0-d9c0f3f9a562.jpg.webp",
          mimeType: "image/jpeg",
          sizeBytes: 234962,
          width: 1200,
          height: 800,
          position: 2,
          isPrimary: false,
        },
        {
          storageKeyTemplate: "recipes/13/img_796105a7-7c66-4ace-9d42-32aa357967db.jpg",
          thumbnailKeyTemplate: "recipes/13/thumb_796105a7-7c66-4ace-9d42-32aa357967db.jpg",
          originalFilename: "SEO-spaghetti-bolognese-0101_1.webp",
          mimeType: "image/jpeg",
          sizeBytes: 84158,
          width: 1200,
          height: 800,
          position: 3,
          isPrimary: false,
        },
      ],
    },
    {
      title: "Chicken Tacos",
      description: "Should fail",
      stepsMarkdown: "Step 1",
      ingredients: [
        { name: "Salt", qtyNum: 1, qtyDen: 1, unit: "tsp", notes: null, position: 1 },
      ],
      images: [
        {
          storageKeyTemplate: "recipes/14/img_fb15029c-6ddc-4f6f-a8e9-792f5acebb1f.jpg",
          thumbnailKeyTemplate: "recipes/14/thumb_fb15029c-6ddc-4f6f-a8e9-792f5acebb1f.jpg",
          originalFilename: "15784109985e14a3f61f894.png",
          mimeType: "image/jpeg",
          sizeBytes: 800384,
          width: 1200,
          height: 800,
          position: 1,
          isPrimary: true,
        },
        {
          storageKeyTemplate: "recipes/14/img_f7db71e5-493b-4028-884b-2d537ee642b3.jpg",
          thumbnailKeyTemplate: "recipes/14/thumb_f7db71e5-493b-4028-884b-2d537ee642b3.jpg",
          originalFilename:
            "cpBVlOG5DC6QAkhxGCH1ojsHW4dBDSGdiHX1iFQTx7m5JNyKmZwY7Wjo_ueWfeAJC4pXKp1HLfxW6UT704TIa2JdhyfMYpS26l2QMtwG1Os.jpeg",
          mimeType: "image/jpeg",
          sizeBytes: 301358,
          width: 1200,
          height: 800,
          position: 2,
          isPrimary: false,
        },
        {
          storageKeyTemplate: "recipes/14/img_25b2979c-2eb7-47cd-9e73-ff851221d5ca.jpg",
          thumbnailKeyTemplate: "recipes/14/thumb_25b2979c-2eb7-47cd-9e73-ff851221d5ca.jpg",
          originalFilename:
            "ncc2cKlKFuBGzussCrsGSVEHT3Fpyov4wdaVwChUBIAq9STDTjYGnurqRU7dJ6nmY8h2YP_xoeElSxSQI_m1tISmsyUF_NoUeuEw59HAKfk.jpeg",
          mimeType: "image/jpeg",
          sizeBytes: 311670,
          width: 1200,
          height: 800,
          position: 3,
          isPrimary: false,
        },
      ],
    },
  ];

  for (const recipeSeed of seededRecipeImages) {
    await createRecipeWithSeededImages(alice.id, recipeSeed);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
