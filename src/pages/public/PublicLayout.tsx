import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useEnterpriseContext } from "@/hooks/enterprise/useEnterpriseContext";

const NAV = [
  { to: "/public/services", label: "Services" },
  { to: "/public/benefits", label: "Benefits" },
  { to: "/public/contributions", label: "Contributions" },
  { to: "/public/employers", label: "Employers" },
  { to: "/public/medical-providers", label: "Medical Providers" },
  { to: "/public/help", label: "Help" },
  { to: "/public/contact", label: "Contact" },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: ctx } = useEnterpriseContext({ moduleCode: "PUBLIC" });
  const orgName = ctx?.organization?.name ?? "Social Security Board";
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b bg-card sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/public" className="flex items-center gap-2 font-semibold">
            <span className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Shield className="h-4 w-4" />
            </span>
            <span>Social Security Online</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                    isActive && "bg-muted font-medium"
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/public/login")}>
              Sign in
            </Button>
            <Button onClick={() => navigate("/public/register")}>Create account</Button>
          </div>
          <button
            className="ml-auto lg:hidden p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t bg-card">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn("px-3 py-2 rounded-md text-sm hover:bg-muted", isActive && "bg-muted font-medium")
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <div className="pt-2 flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => navigate("/public/login")}>
                  Sign in
                </Button>
                <Button className="flex-1" onClick={() => navigate("/public/register")}>
                  Create account
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-card mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="font-semibold mb-2">Social Security Online</div>
            <p className="text-muted-foreground">
              Apply for benefits, file contributions, and complete medical
              certificates — securely online.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">Quick links</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link to="/public/benefits" className="hover:underline">Benefits</Link></li>
              <li><Link to="/public/employers" className="hover:underline">For Employers</Link></li>
              <li><Link to="/public/medical-providers" className="hover:underline">For Medical Providers</Link></li>
              <li><Link to="/public/help" className="hover:underline">Help &amp; FAQs</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Account</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link to="/public/register" className="hover:underline">Create an account</Link></li>
              <li><Link to="/public/login" className="hover:underline">Sign in</Link></li>
              <li><Link to="/public/contact" className="hover:underline">Contact us</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Social Security Board</span>
            <span>Secure. Confidential. Government service.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
