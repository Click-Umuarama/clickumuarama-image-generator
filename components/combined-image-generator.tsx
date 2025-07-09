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
  showLogo?: boolean
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
  showLogo = true,
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

  const containerDimensions = useMemo(() => {
    const width = aspectRatio === "feed" ? 1080 : 1080
    const height = aspectRatio === "feed" ? 1350 : 1920
    return { width, height }
  }, [aspectRatio])

  const containerClasses = useMemo(() => {
    return cn(
      "relative overflow-hidden",
      aspectRatio === "feed" ? "w-[1080px] h-[1350px]" : "w-[1080px] h-[1920px]"
    )
  }, [aspectRatio])

  const contentPadding = useMemo(() => {
    return aspectRatio === 'feed' ? 'pl-[62px] pr-10' : 'px-[59px]'
  }, [aspectRatio])

  const contentMargin = useMemo(() => {
    return aspectRatio === 'feed' ? 'mb-[64px]' : 'mb-6'
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
        width: containerDimensions.width,
        height: containerDimensions.height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        filter: (node) => {
          if (node instanceof HTMLImageElement) {
            return node.complete && node.naturalWidth > 0
          }
          return true
        }
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
          width: containerDimensions.width,
          height: containerDimensions.height,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }
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
    containerDimensions
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
        style={{
          transform: 'scale(0.23)',
          transformOrigin: 'top left'
        }}
      >
        <img
          src={croppedImageUrl}
          alt="Cropped background"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/100 from-0% via-10% to-25% via-black/50 to-transparent" />

        {aspectRatio === 'feed' && showLogo && (
          <div className="absolute top-8 left-[62px]">
            <img
              src="/c-logo.png"
              alt="cu-logo"
              className="w-[132px]"
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
                  "inline-block px-2 py-0 font-bold rounded-[20px] mb-3 font-board-of-directors",
                  kickerTextSize
                )}
                style={kickerStyles}
              >
                {debouncedKicker}
              </div>
            )}

            {debouncedTitle && (
              <h3
                className={cn(
                  "text-white leading-tight whitespace-pre-wrap font-bebas-kai",
                  `text-shadow-[0px_15px_14.5px_rgba(0,0,0,1)]`,
                  titleTextSize
                )}
              >
                {debouncedTitle}
              </h3>
            )}

            {aspectRatio === 'story' && showLogo && (
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

      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="text-sm text-gray-600">Gerando imagem final...</div>
        </div>
      )}
    </div>
  )
} 