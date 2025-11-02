import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4">NewsHub</h3>
            <p className="text-sm opacity-80">Your trusted source for news, stories, and opportunities.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/news" className="hover:opacity-80 transition">
                  News
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="hover:opacity-80 transition">
                  Jobs
                </Link>
              </li>
              <li>
                <Link href="/submit" className="hover:opacity-80 transition">
                  Submit Story
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="opacity-60 hover:opacity-90 transition">
                  Admin Login
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:opacity-80 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:opacity-80 transition">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:opacity-80 transition">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:opacity-80 transition">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm opacity-80">
          <p>&copy; 2025 NewsHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
