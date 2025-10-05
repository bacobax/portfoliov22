"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AboutSectionSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-8">
      <Card className="lg:col-span-2 p-4 sm:p-6 bg-card border border-primary/20">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary flex items-center justify-center">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 bg-primary/30" />
          </div>
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-6 sm:h-7 w-40 sm:w-56" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 sm:h-24 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-secondary/50 border border-border p-2 sm:p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 sm:h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
          <Skeleton className="h-9 sm:h-10 w-full sm:w-32" />
        </div>
      </Card>
      <Card className="p-4 sm:p-6 bg-card border border-primary/20 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-2 p-2 sm:p-3 bg-primary/5 border border-primary/20">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card>
    </div>
  )
}

export function ExperienceSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Skeleton className="h-6 sm:h-7 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4 sm:space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="border-l-2 border-primary pl-3 sm:pl-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function EducationSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <Skeleton className="h-6 sm:h-7 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4 sm:space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-3 sm:gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-16 w-1" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ProjectsSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <Skeleton className="h-48 sm:h-64 w-full border border-primary/20" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="p-4 sm:p-5 bg-secondary/30 border border-primary/10 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    </Card>
  )
}

export function SkillsSectionSkeleton() {
  return (
    <Card className="p-4 sm:p-6 bg-card border border-primary/20 mb-4 sm:mb-8">
      <Skeleton className="h-6 w-40 mb-4 sm:mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 3 }).map((_, columnIndex) => (
          <div key={columnIndex} className="space-y-3">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 4 }).map((__, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full bg-primary/40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
