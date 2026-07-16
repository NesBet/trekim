import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

async function main() {
  const Password = process.env.ADMIN_PASSWORD;
  if (!Password) throw new Error("ADMIN_PASSWORD environment variable is required");
  const hashedPassword = await bcrypt.hash(Password, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@trekim.co.ke" },
    update: {},
    create: {
      name: "Trekim Admin",
      email: "admin@trekim.co.ke",
      phone: "+254794249775",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const salesperson = await prisma.user.upsert({
    where: { email: "sales@trekim.co.ke" },
    update: {},
    create: {
      name: "Sales Person",
      email: "sales@trekim.co.ke",
      phone: "+254794249775",
      password: hashedPassword,
      role: Role.SALESPERSON,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@trekim.com" },
    update: {},
    create: {
      name: "Customer One",
      email: "customer@trekim.com",
      phone: "+254700000002",
      password: hashedPassword,
      role: Role.CUSTOMER,
    },
  });

  const products = [
    {
      name: "Tusker Lager",
      description:
        "Kenya's favorite premium lager beer. Smooth and refreshing.",
      price: 250,
      category: "Beer",
      stock: 200,
      image: "/images/products/tusker.jpeg",
    },
    {
      name: "White Cap Lager",
      description: "Classic Kenyan lager with a crisp, clean taste.",
      price: 230,
      category: "Beer",
      stock: 150,
      image: "/images/products/whitecap.jpg",
    },
    {
      name: "Johnnie Walker Black Label",
      description: "Premium blended Scotch whisky with rich, smooth character.",
      price: 3500,
      category: "Whisky",
      stock: 50,
      image: "/images/products/johnnie-black.jpg",
    },
    {
      name: "Jameson Irish Whiskey",
      description: "Smooth triple-distilled Irish whiskey.",
      price: 2800,
      category: "Whisky",
      stock: 40,
      image: "/images/products/jameson.jpg",
    },
    {
      name: "Smirnoff Vodka 750ml",
      description: "Triple-distilled premium vodka, smooth and pure.",
      price: 1500,
      category: "Vodka",
      stock: 80,
      image: "/images/products/smirnoff.jpg",
    },
    {
      name: "Chivas Regal 12yr",
      description: "Luxurious blended Scotch whisky aged 12 years.",
      price: 4000,
      category: "Whisky",
      stock: 30,
      image: "/images/products/chivas.jpg",
    },
    {
      name: "Baileys Irish Cream",
      description:
        "Creamy liqueur with a perfect blend of Irish whiskey and cream.",
      price: 2200,
      category: "Liqueur",
      stock: 45,
      image: "/images/products/baileys.jpg",
    },
    {
      name: "Heineken",
      description: "Premium international lager beer.",
      price: 280,
      category: "Beer",
      stock: 180,
      image: "/images/products/heineken.jpg",
    },
    {
      name: "Captain Morgan Spiced Rum",
      description: "Caribbean spiced rum with a smooth, rich flavor.",
      price: 1800,
      category: "Rum",
      stock: 60,
      image: "/images/products/captain-morgan.jpg",
    },
    {
      name: "Cîroc Vodka",
      description: "Ultra-premium vodka distilled from fine French grapes.",
      price: 3200,
      category: "Vodka",
      stock: 25,
      image: "/images/products/ciroc.jpg",
    },
    {
      name: "Guinness Foreign Extra",
      description: "Rich, dark stout with a distinctive, bold flavor.",
      price: 300,
      category: "Beer",
      stock: 160,
      image: "/images/products/guinness.jpg",
    },
    {
      name: "Jägermeister",
      description: "German herbal digestif with a complex blend of 56 herbs.",
      price: 2000,
      category: "Liqueur",
      stock: 35,
      image: "/images/products/jager.jpg",
    },
    {
      name: "Glenfiddich 12yr",
      description: "Single malt Scotch whisky aged 12 years.",
      price: 5500,
      category: "Whisky",
      stock: 20,
      image: "/images/products/glenfiddich.jpg",
    },
    {
      name: "Absolut Vodka",
      description: "Swedish premium vodka known for its purity.",
      price: 1600,
      category: "Vodka",
      stock: 70,
      image: "/images/products/absolut.jpg",
    },
    {
      name: "Amarula Cream",
      description: "African cream liqueur made with the marula fruit.",
      price: 1800,
      category: "Liqueur",
      stock: 40,
      image: "/images/products/amarula.jpg",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: product.name.toLowerCase().replace(/\s+/g, "-"),
        ...product,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
