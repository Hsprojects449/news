import { Spinner } from "@/components/ui/spinner"

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingScreen({ message = "Loading...", fullScreen = false }: LoadingScreenProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-12 w-12 text-primary" />
          <p className="text-lg font-medium text-muted-foreground">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Spinner className="h-12 w-12 text-primary" />
      <p className="text-lg font-medium text-muted-foreground">{message}</p>
    </div>
  )
}
