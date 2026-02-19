/* Seed users and recipes with explicit ownership for MVP auth. */
require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  const [alicePasswordHash, bobPasswordHash] = await Promise.all([
    hashPassword("Password123!"),
    hashPassword("Password123!"),
  ]);

  await prisma.ingredient.deleteMany();
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
