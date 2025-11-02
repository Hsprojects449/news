"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground shadow-xl">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-3xl font-bold hover:opacity-90 transition duration-300 flex items-center gap-2"
          >
            <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">📰</span>
            NewsHub
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-secondary transition duration-300 font-medium">
              Home
            </Link>
            <Link href="/news" className="hover:text-secondary transition duration-300 font-medium">
              News
            </Link>
            <Link href="/jobs" className="hover:text-secondary transition duration-300 font-medium">
              Jobs
            </Link>
            <Link href="/submit" className="hover:text-secondary transition duration-300 font-medium">
              Submit Story
            </Link>
            <Link href="/about" className="hover:text-secondary transition duration-300 font-medium">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 flex flex-col gap-3 pb-4 border-t border-primary-foreground/20 pt-4">
            <Link href="/" className="hover:text-secondary transition duration-300 font-medium">
              Home
            </Link>
            <Link href="/news" className="hover:text-secondary transition duration-300 font-medium">
              News
            </Link>
            <Link href="/jobs" className="hover:text-secondary transition duration-300 font-medium">
              Jobs
            </Link>
            <Link href="/submit" className="hover:text-secondary transition duration-300 font-medium">
              Submit Story
            </Link>
            <Link href="/about" className="hover:text-secondary transition duration-300 font-medium">
              About
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
