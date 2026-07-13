"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  GlassWater,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  Beer,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Beer,
    title: "Premium Selection",
    description:
      "Curated collection of the finest beers, wines, spirits, and cocktails from Kenya and around the world.",
  },
  {
    icon: MapPin,
    title: "Convenient Location",
    description:
      "Located along Magadi Road, just minutes from Kiserian Town center. Easy to find, hard to forget.",
  },
  {
    icon: Clock,
    title: "Great Atmosphere",
    description:
      "Whether it's after-work drinks or weekend celebrations, K.W Social offers the perfect ambiance.",
  },
];

const categories = [
  { name: "Beer", count: "4+", color: "from-amber-500 to-yellow-500" },
  { name: "Whisky", count: "4+", color: "from-amber-800 to-amber-600" },
  { name: "Vodka", count: "3+", color: "from-blue-400 to-blue-600" },
  { name: "Liqueur", count: "3+", color: "from-purple-500 to-pink-500" },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-trekim-500/20 via-background to-background">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <GlassWater className="h-16 w-16 text-trekim-500" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Welcome to <span className="text-trekim-500">K.W Social</span> Tavern
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Kiserian&apos;s premier destination for premium drinks, great
              music, and unforgettable nights. Located along Magadi Road.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/inventory">
                <Button size="lg" className="text-base">
                  Browse Our Menu
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="text-base">
                  Join K.W Club
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Why K.W?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We pride ourselves on offering an exceptional experience
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center">
              <CardContent className="pt-8 pb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-trekim-500/20 mb-4">
                  <feature.icon className="h-6 w-6 text-trekim-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Our Categories</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore our diverse selection of drinks
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/inventory?category=${cat.name.toLowerCase()}`}
              >
                <div
                  className={`rounded-xl bg-gradient-to-br ${cat.color} p-6 text-center text-white hover:scale-105 transition-transform cursor-pointer`}
                >
                  <h3 className="text-xl font-bold mb-1">{cat.name}</h3>
                  <p className="text-white/80">{cat.count} varieties</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Visit Us Today</h2>
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
            <MapPin className="h-5 w-5" />
            <span>Along Magadi Road, Near Kiserian Town</span>
          </div>
          <Link href="/inventory">
            <Button size="lg">
              <Zap className="mr-2 h-5 w-5" />
              Start Ordering
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
