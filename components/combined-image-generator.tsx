/* biome-ignore-all lint/correctness/useHookAtTopLevel: it is needed to work. */
"use client"

import { useRef, useEffect, useState, useCallback, useMemo } from "react"
import Image from "next/image"
import { cn, useDebounce } from "@/lib/utils"

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue }
    const words = paragraph.split(' ')
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)
  }
  return lines
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

async function renderToCanvas(
  croppedImageUrl: string,
  kicker: string,
  title: string,
  kickerBgColor: string,
  kickerTextColor: string,
  aspectRatio: 'feed' | 'story'
): Promise<string> {
  const width = 1080
  const height = aspectRatio === 'feed' ? 1350 : 1920

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  await document.fonts.ready

  // Background (object-cover)
  const bgImg = await loadImage(croppedImageUrl)
  const scale = Math.max(width / bgImg.naturalWidth, height / bgImg.naturalHeight)
  const scaledW = bgImg.naturalWidth * scale
  const scaledH = bgImg.naturalHeight * scale
  ctx.drawImage(bgImg, (width - scaledW) / 2, (height - scaledH) / 2, scaledW, scaledH)

  // Gradient overlay (bottom to top: black/85 → black/5 at 25% → transparent at 35%)
  const gradient = ctx.createLinearGradient(0, height, 0, 0)
  gradient.addColorStop(0, 'rgba(0,0,0,0.85)')
  gradient.addColorStop(0.25, 'rgba(0,0,0,0.05)')
  gradient.addColorStop(0.35, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const logo = await loadImage('/c-logo.png')

  // Feed logo at top-left, drawn before content
  if (aspectRatio === 'feed') {
    ctx.drawImage(logo, 58, 38, 122, 122)
  }

  const paddingLeft = aspectRatio === 'feed' ? 59 : 57
  const paddingRight = aspectRatio === 'feed' ? 40 : 57
  const paddingBottom = aspectRatio === 'feed' ? 58 : 24
  const maxTextWidth = width - paddingLeft - paddingRight

  // Story: reserve space for logo at bottom (mb:130 + height:103 + mt:220 = 453px)
  const storyLogoReserve = aspectRatio === 'story' ? 453 : 0
  let contentBottomY = height - paddingBottom - storyLogoReserve

  // Title (drawn first to measure height, then bottom-aligned)
  if (title) {
    const fontSize = aspectRatio === 'feed' ? 48 : 61
    const lineHeight = fontSize * 1.2
    ctx.font = `${fontSize}px "Bebas Kai"`
    const lines = wrapText(ctx, title, maxTextWidth)
    const startY = contentBottomY - lines.length * lineHeight

    // Double shadow to match CSS text-shadow definition
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'top'
    for (let pass = 0; pass < 2; pass++) {
      ctx.shadowColor = 'rgba(0,0,0,1)'
      ctx.shadowBlur = 15
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 15
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], paddingLeft, startY + i * lineHeight)
      }
    }
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    contentBottomY = startY
  }

  // Kicker badge (drawn after title, above it)
  if (kicker) {
    const fontSize = aspectRatio === 'feed' ? 54 : 68
    const paddingX = aspectRatio === 'feed' ? 12 : 20  // px-3 / px-5
    const marginBottom = aspectRatio === 'feed' ? 12 : 20  // mb-3 / mb-5
    const marginLeft = aspectRatio === 'feed' ? -3 : 4   // ml-[-3px] / ml-1
    const maxHeight = aspectRatio === 'feed' ? 72 : 90

    ctx.font = `bold ${fontSize}px "Board of Directors Heavy"`
    const textWidth = ctx.measureText(kicker).width
    const badgeW = textWidth + paddingX * 2
    const badgeH = Math.min(maxHeight, fontSize * 1.2)
    const badgeX = paddingLeft + marginLeft
    const badgeY = contentBottomY - marginBottom - badgeH

    ctx.fillStyle = kickerBgColor
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 20)
    ctx.fill()

    ctx.fillStyle = kickerTextColor
    ctx.textBaseline = 'middle'
    ctx.fillText(kicker, badgeX + paddingX, badgeY + badgeH / 2)
  }

  // Story logo drawn last (below title/kicker): bottom at height - 24 - 130 = 1766
  if (aspectRatio === 'story') {
    const logoY = height - paddingBottom - 130 - 103
    ctx.drawImage(logo, (width - 103) / 2, logoY, 103, 103)
  }

  return canvas.toDataURL('image/png')
}

interface CombinedImageGeneratorProps {
  croppedImageUrl: string | null
  kicker: string
  title: string
  kickerBgColor: string
  kickerTextColor: string
  aspectRatio: "feed" | "story"
  onFinalImageGenerated?: (imageUrl: string) => void
  onGeneratingChange?: (isGenerating: boolean) => void
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
  onGeneratingChange,
  className,
  debouncedKicker: propDebouncedKicker,
  debouncedTitle: propDebouncedTitle,
  debouncedKickerBgColor: propDebouncedKickerBgColor,
  debouncedKickerTextColor: propDebouncedKickerTextColor
}: CombinedImageGeneratorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setIsGenerating] = useState(false)
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
    return aspectRatio === 'feed' ? 'pl-[59px] pr-10' : 'px-[57px]'
  }, [aspectRatio])

  const contentMargin = useMemo(() => {
    return aspectRatio === 'feed' ? 'mb-[58px]' : 'mb-6'
  }, [aspectRatio])

  const kickerTextSize = useMemo(() => {
    return aspectRatio === 'feed' ? 'text-[54px]' : 'text-[68px]'
  }, [aspectRatio])

  const titleTextSize = useMemo(() => {
    return aspectRatio === 'feed' ? 'text-[48px]' : 'text-[61px]'
  }, [aspectRatio])

  const generateFinalImage = useCallback(async () => {
    if (!croppedImageUrl || !onFinalImageGenerated) return

    const currentState = `${croppedImageUrl}-${debouncedKicker}-${debouncedTitle}-${debouncedKickerBgColor}-${debouncedKickerTextColor}-${aspectRatio}`

    if (lastGeneratedRef.current === currentState) {
      return
    }

    try {
      setIsGenerating(true)
      onGeneratingChange?.(true)

      const dataUrl = await renderToCanvas(
        croppedImageUrl,
        debouncedKicker,
        debouncedTitle,
        debouncedKickerBgColor,
        debouncedKickerTextColor,
        aspectRatio,
      )

      lastGeneratedRef.current = currentState
      onFinalImageGenerated(dataUrl)
    } catch (error) {
      console.error('Error generating final image:', error)
    } finally {
      setIsGenerating(false)
      onGeneratingChange?.(false)
    }
  }, [
    croppedImageUrl,
    debouncedKicker,
    debouncedTitle,
    debouncedKickerBgColor,
    debouncedKickerTextColor,
    aspectRatio,
    onFinalImageGenerated,
    onGeneratingChange,
  ])

  useEffect(() => {
    if (croppedImageUrl) {
      const timeoutId = setTimeout(() => {
        generateFinalImage()
      }, 50)

      return () => {
        clearTimeout(timeoutId)
      }
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
        <Image
          src={croppedImageUrl}
          alt="Cropped background"
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 from-0% via-black/5 via-25% to-transparent to-35%  " />

        {aspectRatio === 'feed' && (
          <div className="absolute top-[38px] left-[58px]">
            <Image
              src="/c-logo.png"
              alt="cu-logo"
              width={122}
              height={122}
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
                  "w-fit flex items-center font-bold rounded-[20px] font-board-of-directors",
                  aspectRatio === 'feed' ? 'ml-[-3px] mb-3 px-3 max-h-[72px]' : 'ml-1 mb-5 px-5 max-h-[90px]',
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
                  "text-white whitespace-pre-wrap font-bebas-kai text-shadow-[0px_15px_15px_rgba(0,0,0,1),0px_15px_15px_rgba(0,0,0,1)]",
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
              <div className="flex flex-1 items-center justify-center size-full mx-auto mb-[130px] mt-[220px]">
                <Image
                  src="/c-logo.png"
                  alt="cu-logo"
                  width={103}
                  height={103}
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