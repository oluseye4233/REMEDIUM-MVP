import { NextResponse } from 'next/server'
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

interface TextractBlock {
  BlockType?: string
  EntityTypes?: string[]
  Key?: { Text?: string }
  Value?: { Text?: string }
  Text?: string
}

function extractKeyFields(blocks: TextractBlock[]): Record<string, string> {
  const fields: Record<string, string> = {}
  const keyValuePairs = blocks.filter(b => b.BlockType === 'KEY_VALUE_SET')

  for (const block of keyValuePairs) {
    const keyText = block.Key?.Text?.toLowerCase() || ''
    const valueText = block.Value?.Text || ''

    if (keyText.includes('name')) fields.name = valueText
    else if (keyText.includes('license') || keyText.includes('registration')) fields.license_number = valueText
    else if (keyText.includes('expir')) fields.expiry_date = valueText
    else if (keyText.includes('issu') && keyText.includes('date')) fields.issue_date = valueText
    else if (keyText.includes('issu') && (keyText.includes('body') || keyText.includes('by'))) fields.issuing_body = valueText
    else if (keyText.includes('profession') || keyText.includes('type')) fields.practitioner_type = valueText
  }
  return fields
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('credential') as File
    const documentType = form.get('document_type') as string

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Accepted: PDF, JPG, PNG' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')

    // Upload to Supabase Storage
    const path = `${user.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('credentials')
      .upload(path, buffer, { contentType: file.type })

    if (uploadError) throw uploadError

    // AWS Textract OCR
    const textract = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const { Blocks = [] } = await textract.send(
      new AnalyzeDocumentCommand({
        Document: { Bytes: buffer },
        FeatureTypes: ['FORMS'],
      })
    )

    const fields = extractKeyFields(Blocks as TextractBlock[])

    // Update CVS status to under_review
    await supabase.from('profiles')
      .update({ cvs_status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', user.id)

    // Log submission
    await supabase.from('cvs_audit_log').insert({
      user_id: user.id,
      event_type: 'SUBMISSION',
      decision_notes: `Document type: ${documentType}`,
      document_hashes: { [file.name]: hash },
    })

    // Trigger CVS scoring via Supabase Edge Function
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cvs-score`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ user_id: user.id, fields, hash, document_type: documentType }),
      }
    )

    return NextResponse.json({ status: 'under_review', document_hash: hash })
  } catch (error) {
    console.error('CVS submit error:', error)
    return NextResponse.json({ error: 'Submission failed. Please try again.' }, { status: 500 })
  }
}
