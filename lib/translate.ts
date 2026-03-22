import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export type Language = 'en' | 'hi' | 'mr'
export type Mode = 'expert' | 'simple'

// ─── ELI5 Simplification ──────────────────────────────────────────────────
export async function simplifyText(text: string, language: Language = 'en'): Promise<string> {
  if (!text || text.length < 20) return text

  const langMap = { en: 'English', hi: 'Hindi', mr: 'Marathi' }
  const targetLang = langMap[language]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Explain this financial advice in very simple ${targetLang}, like you're talking to someone who knows nothing about finance. Use simple everyday words. Keep amounts in ₹. Maximum 3 sentences.

Original: ${text}

Simple explanation:`,
      }],
    })
    return (response.content[0] as Anthropic.TextBlock).text.trim()
  } catch {
    return text // fallback to original
  }
}

// ─── Translation ──────────────────────────────────────────────────────────
export async function translateText(
  text: string,
  targetLanguage: Language
): Promise<string> {
  if (targetLanguage === 'en' || !text) return text

  const langMap = { hi: 'Hindi', mr: 'Marathi', en: 'English' }
  const target = langMap[targetLanguage]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Translate this financial text to ${target}. Keep all numbers, ₹ amounts, and financial terms like SIP, ELSS, PPF, NPS in their original form. Only translate the explanatory text.

Text to translate: ${text}

${target} translation:`,
      }],
    })
    return (response.content[0] as Anthropic.TextBlock).text.trim()
  } catch {
    return text
  }
}

// ─── Process entire output object for mode/language ──────────────────────
export async function processOutputForMode(
  output: Record<string, unknown>,
  mode: Mode,
  language: Language
): Promise<Record<string, unknown>> {
  if (mode === 'expert' && language === 'en') return output

  const fieldsToProcess = ['strategy', 'explainability', 'summary']
  const processed = { ...output }

  for (const field of fieldsToProcess) {
    if (processed[field] && typeof processed[field] === 'string') {
      let text = processed[field] as string
      if (mode === 'simple') text = await simplifyText(text, language)
      else if (language !== 'en') text = await translateText(text, language)
      processed[field] = text
    }
  }

  // Process insights array
  if (Array.isArray(processed.insights) && (mode === 'simple' || language !== 'en')) {
    const insights = processed.insights as string[]
    processed.insights = await Promise.all(
      insights.slice(0, 3).map(async (ins) => {
        if (mode === 'simple') return simplifyText(ins, language)
        return translateText(ins, language)
      })
    )
  }

  return processed
}

// ─── Quick translate for UI strings ──────────────────────────────────────
export const UI_STRINGS: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    healthScore: 'Money Health Score',
    firePlanner: 'FIRE Planner',
    taxWizard: 'Tax Wizard',
    nextAction: 'Next Best Action',
    riskScore: 'Risk Score',
    portfolio: 'Portfolio X-Ray',
    insights: 'Insights',
    high: 'High', medium: 'Medium', low: 'Low',
    recommended: 'Recommended',
    runAnalysis: 'Run Analysis',
    downloadPDF: 'Download PDF',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    healthScore: 'मनी हेल्थ स्कोर',
    firePlanner: 'फायर प्लानर',
    taxWizard: 'टैक्स विज़ार्ड',
    nextAction: 'अगला बेहतरीन कदम',
    riskScore: 'जोखिम स्कोर',
    portfolio: 'पोर्टफोलियो X-रे',
    insights: 'जानकारी',
    high: 'उच्च', medium: 'मध्यम', low: 'कम',
    recommended: 'अनुशंसित',
    runAnalysis: 'विश्लेषण करें',
    downloadPDF: 'PDF डाउनलोड करें',
  },
  mr: {
    dashboard: 'डॅशबोर्ड',
    healthScore: 'आर्थिक आरोग्य स्कोर',
    firePlanner: 'फायर प्लॅनर',
    taxWizard: 'कर विझार्ड',
    nextAction: 'पुढील सर्वोत्तम कृती',
    riskScore: 'जोखीम स्कोर',
    portfolio: 'पोर्टफोलिओ X-रे',
    insights: 'अंतर्दृष्टी',
    high: 'उच्च', medium: 'मध्यम', low: 'कमी',
    recommended: 'शिफारस केलेले',
    runAnalysis: 'विश्लेषण करा',
    downloadPDF: 'PDF डाउनलोड करा',
  },
}