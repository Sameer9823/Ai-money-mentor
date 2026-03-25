import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import UserMemory from '@/models/UserMemory'

// Angel One redirects here after user authenticates
// URL: /api/broker/callback?auth_token=xxx&feed_token=yyy&refresh_token=zzz&state=angelone
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=session_expired`)
    }

    const userId     = session.user.id ?? session.user.email!
    const authToken  = req.nextUrl.searchParams.get('auth_token')
    const feedToken  = req.nextUrl.searchParams.get('feed_token')
    const broker     = req.nextUrl.searchParams.get('state') ?? 'angelone'

    if (!authToken) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/connect-broker?error=no_token`)
    }

    await connectDB()

    // Store encrypted token in user memory (never store plain text in prod)
    await UserMemory.findOneAndUpdate(
      { userId },
      {
        $set: {
          [`brokerConnections.${broker}`]: {
            jwtToken:     authToken,
            feedToken:    feedToken ?? '',
            connectedAt:  new Date().toISOString(),
            broker,
          },
        },
      },
      { upsert: true }
    )

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/connect-broker?success=true&broker=${broker}`)
  } catch (err) {
    console.error('[Broker callback]', err)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/connect-broker?error=server_error`)
  }
}