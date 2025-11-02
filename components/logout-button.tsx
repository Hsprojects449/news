"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("admin")
    router.push("/admin/login")
  }

  return (
    <Button onClick={handleLogout} className="bg-white text-primary hover:bg-gray-100 font-semibold" size="sm">
      <LogOut size={16} className="mr-2" />
      Logout
    </Button>
  )
}

export default LogoutButton
