import { NextResponse } from 'next/server'

// This route is no longer needed — broker integration uses Yahoo Finance
// Kept to avoid 404 errors
export async function GET() {
  return NextResponse.json({
    message: 'Portfolio data is fetched via Yahoo Finance — no broker OAuth needed',
    dataSource: 'yahoo_finance',
    docsUrl: 'https://finance.yahoo.com',
  })
}