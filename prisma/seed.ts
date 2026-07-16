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
      image: "https://greenspoon.co.ke/wp-content/uploads/2023/01/Greenspoon-1168.jpg",
    },
    {
      name: "White Cap Lager",
      description: "Classic Kenyan lager with a crisp, clean taste.",
      price: 230,
      category: "Beer",
      stock: 150,
      image: "https://greenspoon.co.ke/wp-content/uploads/2023/12/Greenspoon-1181-1400x906.jpg",
    },
    {
      name: "Johnnie Walker Black Label",
      description: "Premium blended Scotch whisky with rich, smooth character.",
      price: 3500,
      category: "Whisky",
      stock: 50,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQaa4tZ1xWQ8uBISHu7WweWinIa5iert2FEaNQ48LlkJinSOMVRIWV-UeM&s=10",
    },
    {
      name: "Jameson Irish Whiskey",
      description: "Smooth triple-distilled Irish whiskey.",
      price: 2800,
      category: "Whisky",
      stock: 40,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRLGI0wdWLOQzAYgb5j8029e_PVqF5FyfO-e1d84_qdJxdfgvWTUnf8Lyfz&s=10",
    },
    {
      name: "Smirnoff Vodka 750ml",
      description: "Triple-distilled premium vodka, smooth and pure.",
      price: 1500,
      category: "Vodka",
      stock: 80,
      image: "https://greenspoon.co.ke/wp-content/uploads/2022/07/Greenspoon-Kenya-Smirnoff-Vodka-2-1400x933.jpg",
    },
    {
      name: "Chivas Regal 12yr",
      description: "Luxurious blended Scotch whisky aged 12 years.",
      price: 4000,
      category: "Whisky",
      stock: 30,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQKbl5kLCA-VvwcReA8VN62zbjh0WQGqb40dUPQSb4m0tgk1jUfVsXemo&s=10",
    },
    {
      name: "Baileys Irish Cream",
      description:
        "Creamy liqueur with a perfect blend of Irish whiskey and cream.",
      price: 2200,
      category: "Liqueur",
      stock: 45,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxrKyy0bC9Mk0w9ln3Hvu4b5v0msBd9LKmDqLzL_4uzP3T9NZL2nPqy7Q&s=10",
    },
    {
      name: "Heineken",
      description: "Premium international lager beer.",
      price: 280,
      category: "Beer",
      stock: 180,
      image: "https://greenspoon.co.ke/wp-content/uploads/2024/05/Greenspoon-1202-1400x933.jpg",
    },
    {
      name: "Captain Morgan Spiced Rum",
      description: "Caribbean spiced rum with a smooth, rich flavor.",
      price: 1800,
      category: "Rum",
      stock: 60,
      image: "https://lovescotch.com/cdn/shop/products/Captain_Morgan_Original_Spiced_Rum_LoveScotch_6_grande.png?v=1756515088",
    },
    {
      name: "Cîroc Vodka",
      description: "Ultra-premium vodka distilled from fine French grapes.",
      price: 3200,
      category: "Vodka",
      stock: 25,
      image: "https://sizzleliquors.co.ke/wp-content/uploads/2023/11/Ciroc-Vodka.jpg",
    },
    {
      name: "Guinness Foreign Extra",
      description: "Rich, dark stout with a distinctive, bold flavor.",
      price: 300,
      category: "Beer",
      stock: 160,
      image: "https://greenspoon.co.ke/wp-content/uploads/2023/02/Greenspoon-1193.jpg",
    },
    {
      name: "Jägermeister",
      description: "German herbal digestif with a complex blend of 56 herbs.",
      price: 2000,
      category: "Liqueur",
      stock: 35,
      image: "https://greenspoon.co.ke/wp-content/uploads/2022/07/Greenspoon-Kenya-Jagermerister-1.jpg",
    },
    {
      name: "Glenfiddich 12yr",
      description: "Single malt Scotch whisky aged 12 years.",
      price: 5500,
      category: "Whisky",
      stock: 20,
      image: "https://greenspoon.co.ke/wp-content/uploads/2022/06/Greenspoon-Glenfiddich-12-Year.jpg",
    },
    {
      name: "Absolut Vodka",
      description: "Swedish premium vodka known for its purity.",
      price: 1600,
      category: "Vodka",
      stock: 70,
      image: "https://greenspoon.co.ke/wp-content/uploads/2022/07/Screenshot-2026-04-23-at-14.55.12-3-720x480.jpg",
    },
    {
      name: "Amarula Cream",
      description: "African cream liqueur made with the marula fruit.",
      price: 1800,
      category: "Liqueur",
      stock: 40,
      image: "https://greenspoon.co.ke/wp-content/uploads/2022/07/Greenspoon-Kenya-Amarula.jpg",
    },
    {
      name: "Konyangi 500ml",
      description: "Konyagi is an iconic Tanzanian cane spirit. Distilled from sugarcane and molasses, it offers a distinct, versatile flavor profile with citrus, spice, and tropical fruit notes.",
      price: 550,
      category: "Spirit",
      stock: 25,
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTiKD8ns2r3_5olzjpw3XT3teQ950vTRlImhZQjgjAjblr5k-tmULzO1ZXw&s=10",
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
