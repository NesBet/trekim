import { GlassWater, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <GlassWater className="h-5 w-5 text-trekim-500" />
              <span className="text-trekim-500">Trekim</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Premium drinks, great atmosphere, unforgettable moments.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Contact</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Along Magadi Road, Kiserian Town, Kenya</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+254 700 000 000</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Hours</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Monday - Thursday: 4PM - 12AM</p>
              <p>Friday - Saturday: 2PM - 3AM</p>
              <p>Sunday: 3PM - 11PM</p>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Trekim Bar & Lounge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
