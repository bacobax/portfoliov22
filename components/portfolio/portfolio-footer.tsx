"use client"

export function PortfolioFooter() {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-8 sm:mt-16 relative z-10">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[10px] sm:text-xs font-mono text-muted-foreground text-center md:text-left">
            © 2025 SYSTEM_PORTFOLIO | BUILD_v2.0.1 | ALL_RIGHTS_RESERVED
          </p>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono text-muted-foreground">
            <span>POWERED_BY: NEXT.JS</span>
            <span className="text-primary">|</span>
            <span>DEPLOYED_ON: VERCEL</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
