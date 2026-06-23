"use client"

import * as echarts from "echarts"
import { useEffect, useRef } from "react"
import { cn } from "@/components/ui/utils"

export function EChart({
  className,
  option
}: {
  className?: string
  option: echarts.EChartsOption
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" })
    chart.setOption(option)

    const resize = () => chart.resize()
    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      chart.dispose()
    }
  }, [option])

  return <div className={cn("w-full", className ?? "h-[360px]")} ref={ref} />
}
