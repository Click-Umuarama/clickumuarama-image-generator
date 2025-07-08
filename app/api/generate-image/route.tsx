import { ImageResponse } from "next/og"
import { OriginalImage } from "./components/original-image"

export const runtime = "edge"

const bebasKaiFont = fetch(new URL("../../../public/fonts/BebasKai.ttf", import.meta.url)).then((res) => res.arrayBuffer())
const boardOfDirectorsFont = fetch(new URL("../../../public/fonts/BoardOfDirectorsHeavy.ttf", import.meta.url)).then((res) => res.arrayBuffer())

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const imageUrl = searchParams.get("imageUrl")
    const kicker = searchParams.get("kicker")
    const title = searchParams.get("title")
    const kickerBgColor = searchParams.get("kickerBgColor") ?? "#000000"
    const kickerTextColor = searchParams.get("kickerTextColor") ?? "#ffffff"
    const download = searchParams.get("download") === "true"

    if (imageUrl && (!title || title === "undefined" || title.trim() === "")) {
      if (download) {
        try {
          const imageResponse = await fetch(imageUrl)
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
          }

          const imageBuffer = await imageResponse.arrayBuffer()
          const response = new Response(imageBuffer, {
            headers: {
              "Content-Type": imageResponse.headers.get("Content-Type") || "image/png",
              "Content-Disposition": 'attachment; filename="imagem-original.png"',
            },
          })
          return response
        } catch (error) {
          console.error("Error fetching original image:", error)
          return new Response(`Error fetching image: ${error instanceof Error ? error.message : "Unknown error"}`, { status: 500 })
        }
      } else {
        const response = new ImageResponse(<OriginalImage imageUrl={imageUrl} />)
        return response
      }
    }
  } catch (error) {
    console.error("Error generating image:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return new Response(`Error generating image: ${errorMessage}`, { status: 500 })
  }
}
