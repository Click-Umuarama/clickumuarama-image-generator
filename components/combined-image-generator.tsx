"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import { cn, useDebounce } from "@/lib/utils"

interface CombinedImageGeneratorProps {
  croppedImageUrl: string | null
  kicker: string
  title: string
  kickerBgColor: string
  kickerTextColor: string
  aspectRatio: "feed" | "story"
  onFinalImageGenerated?: (imageUrl: string) => void
  className?: string
  debouncedKicker?: string
  debouncedTitle?: string
  debouncedKickerBgColor?: string
  debouncedKickerTextColor?: string
}

export const CombinedImageGenerator = ({
  croppedImageUrl,
  kicker,
  title,
  kickerBgColor,
  kickerTextColor,
  aspectRatio,
  onFinalImageGenerated,
  className,
  debouncedKicker: propDebouncedKicker,
  debouncedTitle: propDebouncedTitle,
  debouncedKickerBgColor: propDebouncedKickerBgColor,
  debouncedKickerTextColor: propDebouncedKickerTextColor
}: CombinedImageGeneratorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const lastGeneratedRef = useRef<string>("")

  const debouncedKicker = propDebouncedKicker ?? useDebounce(kicker, 750)
  const debouncedTitle = propDebouncedTitle ?? useDebounce(title, 750)
  const debouncedKickerBgColor = propDebouncedKickerBgColor ?? useDebounce(kickerBgColor, 750)
  const debouncedKickerTextColor = propDebouncedKickerTextColor ?? useDebounce(kickerTextColor, 750)

  const containerClasses = useMemo(() => {
    return cn(
      "relative overflow-hidden",
      aspectRatio === "feed" ? "w-[1080px] h-[1350px]" : "w-[1080px] h-[1920px]"
    )
  }, [aspectRatio])

  const contentPadding = useMemo(() => {
    return aspectRatio === 'feed' ? 'pl-[59px] pr-10' : 'px-[59px]'
  }, [aspectRatio])

  const contentMargin = useMemo(() => {
    return aspectRatio === 'feed' ? 'mb-[58px]' : 'mb-6'
  }, [aspectRatio])

  const kickerTextSize = useMemo(() => {
    return aspectRatio === 'feed' ? 'text-[54px]' : 'text-[68px]'
  }, [aspectRatio])

  const titleTextSize = useMemo(() => {
    return aspectRatio === 'feed' ? 'text-[48px]' : 'text-[58px]'
  }, [aspectRatio])

  const generateFinalImage = useCallback(async () => {
    if (!containerRef.current || !croppedImageUrl || !onFinalImageGenerated) return

    const currentState = `${croppedImageUrl}-${debouncedKicker}-${debouncedTitle}-${debouncedKickerBgColor}-${debouncedKickerTextColor}-${aspectRatio}`

    if (lastGeneratedRef.current === currentState) {
      return
    }

    try {
      setIsGenerating(true)

      await new Promise(resolve => setTimeout(resolve, 100))

      const { toPng } = await import('html-to-image')

      const dataUrl = await toPng(containerRef.current, {
        quality: 1.0,
        backgroundColor: '#ffffff',
        width: 1080,
        height: aspectRatio === "feed" ? 1350 : 1920,
      })

      lastGeneratedRef.current = currentState
      onFinalImageGenerated(dataUrl)
    } catch (error) {
      console.error('Error generating final image:', error)
      try {
        const { toPng } = await import('html-to-image')

        const dataUrl = await toPng(containerRef.current!, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          width: 1080,
          height: aspectRatio === "feed" ? 1350 : 1920,
        })

        lastGeneratedRef.current = currentState
        onFinalImageGenerated(dataUrl)
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [
    croppedImageUrl,
    debouncedKicker,
    debouncedTitle,
    debouncedKickerBgColor,
    debouncedKickerTextColor,
    aspectRatio,
    onFinalImageGenerated,
  ])

  useEffect(() => {
    if (croppedImageUrl) {
      generateFinalImage()
    }
  }, [croppedImageUrl, generateFinalImage])

  const kickerStyles = useMemo(() => ({
    color: debouncedKickerTextColor,
    backgroundColor: debouncedKickerBgColor
  }), [debouncedKickerTextColor, debouncedKickerBgColor])

  if (!croppedImageUrl) {
    return (
      <div className={cn("flex items-center justify-center h-64 bg-gray-100 rounded", className)}>
        <p className="text-gray-500">Nenhuma imagem disponível</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className={containerClasses}
      >
        <img
          src={croppedImageUrl}
          alt="Cropped background"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/100 from-0% via-10% to-25% via-black/30 to-transparent" />

        {aspectRatio === 'feed' && (
          <div className="absolute top-[38px] left-[58px]">
            <img
              src="/c-logo.png"
              alt="cu-logo"
              className="w-[122px]"
            />
          </div>
        )}

        <div className={cn(
          "absolute inset-0 flex items-end justify-start",
          contentPadding
        )}>
          <div className={cn("w-full", contentMargin)}>
            {debouncedKicker && (
              <div
                className={cn(
                  "w-fit px-3 max-h-[72px] flex items-center font-bold rounded-[20px] font-board-of-directors mb-3 ml-[-3px]",
                  kickerTextSize
                )}
                style={kickerStyles}
              >
                {debouncedKicker}
              </div>
            )}

            {debouncedTitle && (
              <p
                className={cn(
                  "text-white whitespace-pre-wrap font-bebas-kai text-shadow-[0px_15px_25px_rgba(0,0,0,1),0px_15px_35px_rgba(0,0,0,1),0px_15px_45px_rgba(0,0,0,1)]",
                  titleTextSize
                )}
                style={{
                  lineHeight: '1.2'
                }}
              >
                {debouncedTitle}
              </p>
            )}

            {aspectRatio === 'story' && (
              <div className="flex flex-1 items-center justify-center size-full mb-[157px] mt-[228px]">
                <img
                  src="/c-logo.png"
                  alt="cu-logo"
                  className="max-w-[103px] object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  )
} 