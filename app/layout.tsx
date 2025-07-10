import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
	title: 'Cover Generator',
	description: 'Gerador de covers para Instagram'
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="pt-BR">
			<body className={`antialiased`}>{children}</body>
		</html>
	)
}
