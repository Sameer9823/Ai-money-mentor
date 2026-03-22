import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { simplifyText, translateText, Language, Mode } from '@/lib/translate'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { text, language, mode } = await req.json() as {
      text: string
      language: Language
      mode: Mode
    }

    if (!text) return NextResponse.json({ translated: '' })

    let result = text
    if (mode === 'simple') {
      result = await simplifyText(text, language)
    } else if (language !== 'en') {
      result = await translateText(text, language)
    }

    return NextResponse.json({ translated: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}