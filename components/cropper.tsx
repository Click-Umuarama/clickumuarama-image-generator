"use client"

import { useState, useCallback, useEffect, useRef, memo, useMemo } from "react"
import {
  Cropper,
  CropperCropArea,
  CropperDescription,
  CropperImage,
} from "@/components/ui/cropper"
import { cn } from "@/lib/utils"
import Image from "next/image"

type Area = { x: number; y: number; width: number; height: number }

type CropperComponentProps = {
  imageUrl: string
  aspectRatio: number
  onCropChange?: (crop: Area | null) => void
  kicker?: string
  title?: string
  kickerBgColor?: string
  kickerTextColor?: string
  aspectRatioType?: "feed" | "story"
}

export const CropperComponent = memo(({
  imageUrl,
  aspectRatio,
  onCropChange,
  kicker = "",
  title = "",
  kickerBgColor = "#D4D4D4",
  kickerTextColor = "#000000",
  aspectRatioType = "feed"
}: CropperComponentProps) => {
  const [, setCroppedAreaPixels] = useState<Area | null>(null)
  const [zoom, setZoom] = useState(1)
  const cropperContainerRef = useRef<HTMLDivElement>(null)

  const handleCropChange = useCallback((pixels: Area | null) => {
    setCroppedAreaPixels(pixels)
    onCropChange?.(pixels)
  }, [onCropChange])

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const textStyles = useMemo(() => {
    const isFeed = aspectRatioType === "feed"

    return {
      contentPadding: isFeed ? 'pl-[14px] pr-10' : 'px-[10px]',
      contentMargin: isFeed ? 'mb-[24px]' : 'mb-24',
      kickerTextSize: isFeed ? 'text-[18px]' : 'text-[16px]',
      titleTextSize: isFeed ? 'text-[16px]' : 'text-[13px]',
      kickerStyles: {
        color: kickerTextColor,
        backgroundColor: kickerBgColor,
      }
    }
  }, [aspectRatioType, kickerTextColor, kickerBgColor])

  useEffect(() => {
    const handleGlobalWheel = (event: WheelEvent) => {
      const target = event.target as Element
      const cropperContainer = cropperContainerRef.current

      if (cropperContainer?.contains(target) && event.ctrlKey) {
        event.preventDefault()
        event.stopImmediatePropagation()

        const delta = event.deltaY > 0 ? -1 : 1
        const zoomMultiplier = 2
        const newZoom = Math.max(1, Math.min(3, zoom + (delta * zoomMultiplier * 0.1)))

        setZoom(newZoom)
      }
    }

    document.addEventListener('wheel', handleGlobalWheel, {
      passive: false,
      capture: true
    })

    return () => {
      document.removeEventListener('wheel', handleGlobalWheel, { capture: true })
    }
  }, [zoom])

  if (!imageUrl) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center text-gray-500">
            <p>Adicione uma URL de imagem para começar</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div
        ref={cropperContainerRef}
        className="w-full h-full relative"
      >
        <Cropper
          className="w-full h-full"
          image={imageUrl}
          aspectRatio={aspectRatio}
          onCropChange={handleCropChange}
          onZoomChange={handleZoomChange}
          zoom={zoom}
          minZoom={1}
          maxZoom={3}
          zoomSensitivity={0.00025}
        >
          <CropperDescription />
          <CropperImage />
          {/** biome-ignore lint/correctness/noChildrenProp: it is a lib feat. */}
          <CropperCropArea className="border border-gray-300" children={
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-t from-black/100 from-0% via-10% to-25% via-black/50 to-transparent" />

              {aspectRatioType === 'feed' && (
                <div className="absolute top-8 left-[24px]">
                  <Image
                    src="/c-logo.png"
                    alt="cu-logo"
                    width={48}
                    height={48}
                    className="w-[48px] opacity-80"
                  />
                </div>
              )}

              <div className={cn(
                "absolute inset-0 flex items-end justify-start",
                textStyles.contentPadding
              )}>
                <div className={cn("w-full", textStyles.contentMargin)}>
                  {kicker && (
                    <div
                      className={cn(
                        "inline-block px-1 py-0 font-bold rounded-[6px] mb-1 font-board-of-directors",
                        textStyles.kickerTextSize
                      )}
                      style={textStyles.kickerStyles}
                    >
                      {kicker}
                    </div>
                  )}

                  {title && (
                    <p
                      className={cn(
                        "text-white leading-tight whitespace-pre-wrap font-bebas-kai text-shadow-[0px_5px_15px_rgba(0,0,0,1),0px_5px_15px_rgba(0,0,0,1),0px_5px_15px_rgba(0,0,0,1)]",
                        textStyles.titleTextSize
                      )}
                      style={{
                        lineHeight: '1.2'
                      }}
                    >
                      {title}
                    </p>
                  )}

                </div>
              </div>

              {aspectRatioType === 'story' && (
                <div className="flex flex-1 items-end justify-center size-full">
                  <Image
                    src="/c-logo.png"
                    alt="cu-logo"
                    width={24}
                    height={24}
                    className="max-w-[24px] mb-7 object-contain"
                  />
                </div>
              )}
            </div>
          } />
        </Cropper>
      </div>
    </div>
  )
})

CropperComponent.displayName = "CropperComponent"