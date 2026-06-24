import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Palette } from "lucide-react";
import { useQuoteModal } from "@/context/QuoteModalContext";
const LOGO_URL = "https://raw.githubusercontent.com/runloai/PrimeSign/main/data/logo/logo.webp";

// Complete color scheme definitions with ALL CSS variables
// Each scheme includes proper contrast ratios and harmonious color progression
const COLOR_SCHEMES = {
  "Gold Premium": {
    // Primary gold and secondary cyan on deep dark background
    primary: "38 95% 55%",
    secondary: "190 100% 55%",
    background: "220 15% 6%",
    foreground: "0 0% 98%",
    card: "220 15% 9%",
    muted: "220 15% 15%",
    mutedForeground: "220 10% 65%",
    accent: "220 15% 18%",
    border: "220 15% 15%",
    input: "220 15% 15%",
    ring: "38 95% 55%",
    popover: "220 15% 9%",
    cardBorder: "220 15% 18%",
    popoverBorder: "220 15% 18%",
    sidebar: "220 15% 8%",
    sidebarBorder: "220 15% 20%",
    chart1: "38 95% 55%",
    chart2: "190 90% 55%",
    chart3: "280 80% 60%",
    chart4: "340 80% 60%",
    chart5: "45 90% 55%",
    overlayLight: "0 0% 100%", // white for light overlays
    overlayDark: "220 15% 6%", // dark bg color
  },
  "Electric Cyan": {
    // Cyan primary, purple secondary on dark background
    primary: "190 100% 55%",
    secondary: "280 85% 65%",
    background: "220 20% 5%",
    foreground: "0 0% 98%",
    card: "220 20% 8%",
    muted: "220 20% 15%",
    mutedForeground: "220 15% 65%",
    accent: "220 20% 18%",
    border: "220 20% 18%",
    input: "220 20% 18%",
    ring: "190 100% 55%",
    popover: "220 20% 8%",
    cardBorder: "220 20% 22%",
    popoverBorder: "220 20% 22%",
    sidebar: "220 20% 7%",
    sidebarBorder: "220 20% 20%",
    chart1: "190 100% 55%",
    chart2: "280 85% 65%",
    chart3: "320 90% 60%",
    chart4: "45 95% 60%",
    chart5: "160 90% 50%",
    overlayLight: "0 0% 100%",
    overlayDark: "220 20% 5%",
  },
  "Neon Green": {
    // Green primary, amber secondary on near-black
    primary: "142 100% 50%",
    secondary: "45 95% 55%",
    background: "150 10% 4%",
    foreground: "0 0% 98%",
    card: "150 10% 7%",
    muted: "150 10% 14%",
    mutedForeground: "150 10% 60%",
    accent: "150 10% 17%",
    border: "150 10% 14%",
    input: "150 10% 14%",
    ring: "142 100% 50%",
    popover: "150 10% 7%",
    cardBorder: "150 10% 18%",
    popoverBorder: "150 10% 18%",
    sidebar: "150 10% 6%",
    sidebarBorder: "150 10% 18%",
    chart1: "142 100% 50%",
    chart2: "45 95% 55%",
    chart3: "340 85% 60%",
    chart4: "280 80% 65%",
    chart5: "190 90% 55%",
    overlayLight: "0 0% 100%",
    overlayDark: "150 10% 4%",
  },
  "Clean White": {
    // Light theme: gold primary, slate secondary
    primary: "38 95% 45%",
    secondary: "215 25% 40%",
    background: "0 0% 98%",
    foreground: "220 15% 10%",
    card: "0 0% 100%",
    muted: "220 15% 90%",
    mutedForeground: "220 15% 45%",
    accent: "220 15% 94%",
    border: "220 15% 85%",
    input: "220 15% 85%",
    ring: "38 95% 45%",
    popover: "0 0% 100%",
    cardBorder: "220 15% 88%",
    popoverBorder: "220 15% 88%",
    sidebar: "220 15% 96%",
    sidebarBorder: "220 15% 88%",
    chart1: "38 95% 45%",
    chart2: "215 85% 50%",
    chart3: "280 60% 55%",
    chart4: "160 50% 45%",
    chart5: "340 65% 55%",
    overlayLight: "220 15% 10%", // dark text for light mode
    overlayDark: "220 15% 98%", // light bg
  },
  "Royal Blue": {
    // Royal blue primary, gold secondary on navy
    primary: "220 90% 55%",
    secondary: "38 95% 55%",
    background: "222 47% 8%",
    foreground: "0 0% 98%",
    card: "222 47% 12%",
    muted: "222 30% 20%",
    mutedForeground: "222 20% 65%",
    accent: "222 30% 22%",
    border: "222 30% 20%",
    input: "222 30% 20%",
    ring: "220 90% 55%",
    popover: "222 47% 12%",
    cardBorder: "222 30% 25%",
    popoverBorder: "222 30% 25%",
    sidebar: "222 47% 10%",
    sidebarBorder: "222 30% 22%",
    chart1: "220 90% 55%",
    chart2: "38 95% 55%",
    chart3: "280 75% 60%",
    chart4: "160 80% 50%",
    chart5: "340 80% 55%",
    overlayLight: "0 0% 100%",
    overlayDark: "222 47% 8%",
  },
};

export default function Navbar() {
  const { open } = useQuoteModal();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scheme, setScheme] = useState(() => localStorage.getItem("primesign-scheme") || "Gold Premium");
  const [location] = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const s = COLOR_SCHEMES[scheme as keyof typeof COLOR_SCHEMES];
    
    // Core colors
    root.style.setProperty("--primary", s.primary);
    root.style.setProperty("--secondary", s.secondary);
    root.style.setProperty("--background", s.background);
    root.style.setProperty("--foreground", s.foreground);
    
    // Component colors
    root.style.setProperty("--card", s.card);
    root.style.setProperty("--card-foreground", s.foreground);
    root.style.setProperty("--card-border", s.cardBorder);
    
    root.style.setProperty("--popover", s.popover);
    root.style.setProperty("--popover-foreground", s.foreground);
    root.style.setProperty("--popover-border", s.popoverBorder);
    
    root.style.setProperty("--muted", s.muted);
    root.style.setProperty("--muted-foreground", s.mutedForeground);
    
    root.style.setProperty("--accent", s.accent);
    root.style.setProperty("--accent-foreground", s.foreground);
    
    root.style.setProperty("--border", s.border);
    root.style.setProperty("--input", s.input);
    root.style.setProperty("--ring", s.ring);
    
    // Sidebar colors
    root.style.setProperty("--sidebar", s.sidebar);
    root.style.setProperty("--sidebar-foreground", s.foreground);
    root.style.setProperty("--sidebar-border", s.sidebarBorder);
    root.style.setProperty("--sidebar-primary", s.primary);
    root.style.setProperty("--sidebar-primary-foreground", s.foreground);
    root.style.setProperty("--sidebar-accent", s.accent);
    root.style.setProperty("--sidebar-accent-foreground", s.foreground);
    root.style.setProperty("--sidebar-ring", s.primary);
    
    // Chart colors
    root.style.setProperty("--chart-1", s.chart1);
    root.style.setProperty("--chart-2", s.chart2);
    root.style.setProperty("--chart-3", s.chart3);
    root.style.setProperty("--chart-4", s.chart4);
    root.style.setProperty("--chart-5", s.chart5);
    
    // Overlay reference colors (for components to use)
    root.style.setProperty("--overlay-light", s.overlayLight);
    root.style.setProperty("--overlay-dark", s.overlayDark);
    
    localStorage.setItem("primesign-scheme", scheme);
  }, [scheme]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Services", href: "/#services" },
    { name: "Work", href: "/#portfolio" },
    { name: "Why Us", href: "/#why-us" },
    { name: "Contact", href: "/contact" },
  ];

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (href.startsWith("/#") && location === "/") {
      const element = document.querySelector(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/90 backdrop-blur-md border-b border-foreground/10 py-3 shadow-lg"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 z-50 relative">
          <img src={LOGO_URL} alt="Primesign Logo" className="h-8 md:h-10 w-auto object-contain" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => handleNavClick(link.href)}
              className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors uppercase tracking-wider font-display"
            >
              {link.name}
            </Link>
          ))}
          <select
            value={scheme}
            onChange={(e) => setScheme(e.target.value)}
            className="bg-foreground/10 border border-foreground/20 rounded-full px-3 py-1.5 text-xs text-foreground/80 focus:outline-none focus:border-primary cursor-pointer"
          >
            {Object.keys(COLOR_SCHEMES).map((name) => (
              <option key={name} value={name} className="bg-background text-foreground">{name}</option>
            ))}
          </select>
          <button
            onClick={open}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-bold text-sm uppercase tracking-wide hover:bg-primary/90 transition-all box-glow"
            data-testid="button-nav-quote"
          >
            Get a Quote
          </button>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-foreground z-50 relative"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Nav */}
        <div
          className={`fixed inset-0 bg-background/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center transition-all duration-300 ${
            isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          <nav className="flex flex-col items-center gap-8 text-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-2xl font-display font-bold uppercase tracking-widest hover:text-primary transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <button
              className="mt-4 bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold text-lg uppercase tracking-wide hover:bg-primary/90 transition-all box-glow"
              onClick={() => { setIsMobileMenuOpen(false); open(); }}
              data-testid="button-mobile-quote"
            >
              Get a Quote
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
